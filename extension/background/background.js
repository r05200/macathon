/**
 * Privacy Shield - Background Service Worker
 * - Monitors network requests and detects trackers
 * - Syncs blocklist from backend API
 * - Blocks trackers ONLY as third-party requests (not direct visits)
 */

// Import DDG tracker database functionality
import {
  DDG_TRACKER_DATABASE,
  initializeTrackerDatabase,
  updateTrackerDatabase,
  checkAgainstDDGDatabase,
  waitForDatabase
} from './tracker-database.js';

// ============================================
// Configuration
// ============================================
const DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:8000',  // Backend API endpoint
  syncIntervalMinutes: 15,
  dashboardUrl: '',
  autoUploadEnabled: true,  // Enable automatic data uploads
  uploadIntervalSeconds: 20  // Upload frequency
};

let config = { ...DEFAULT_CONFIG };

// ============================================
// Known Tracker Database (Local Fallback)
// ============================================
const KNOWN_TRACKERS = {
  'doubleclick.net': { category: 'advertising', company: 'Google' },
  'googlesyndication.com': { category: 'advertising', company: 'Google' },
  'googleadservices.com': { category: 'advertising', company: 'Google' },
  'google-analytics.com': { category: 'analytics', company: 'Google' },
  'googletagmanager.com': { category: 'analytics', company: 'Google' },
  'facebook.net': { category: 'advertising', company: 'Meta' },
  'facebook.com': { category: 'social', company: 'Meta' },
  'connect.facebook.net': { category: 'advertising', company: 'Meta' },
  'ads.twitter.com': { category: 'advertising', company: 'Twitter' },
  'ads.linkedin.com': { category: 'advertising', company: 'LinkedIn' },
  'adnxs.com': { category: 'advertising', company: 'Microsoft' },
  'criteo.com': { category: 'advertising', company: 'Criteo' },
  'criteo.net': { category: 'advertising', company: 'Criteo' },
  'taboola.com': { category: 'advertising', company: 'Taboola' },
  'outbrain.com': { category: 'advertising', company: 'Outbrain' },
  'amazon-adsystem.com': { category: 'advertising', company: 'Amazon' },
  'hotjar.com': { category: 'analytics', company: 'Hotjar' },
  'mixpanel.com': { category: 'analytics', company: 'Mixpanel' },
  'segment.com': { category: 'analytics', company: 'Twilio' },
  'segment.io': { category: 'analytics', company: 'Twilio' },
  'amplitude.com': { category: 'analytics', company: 'Amplitude' },
  'heapanalytics.com': { category: 'analytics', company: 'Heap' },
  'fullstory.com': { category: 'analytics', company: 'FullStory' },
  'clarity.ms': { category: 'analytics', company: 'Microsoft' },
  'scorecardresearch.com': { category: 'tracking', company: 'ComScore' },
  'quantserve.com': { category: 'tracking', company: 'Quantcast' },
  'demdex.net': { category: 'tracking', company: 'Adobe' },
  'bluekai.com': { category: 'tracking', company: 'Oracle' },
  'rubiconproject.com': { category: 'advertising', company: 'Rubicon' },
  'pubmatic.com': { category: 'advertising', company: 'PubMatic' },
  'openx.net': { category: 'advertising', company: 'OpenX' }
};

const TRACKING_PATTERNS = [
  /\/pixel\./i,
  /\/beacon/i,
  /\/track/i,
  /\/collect/i,
  /\/analytics/i,
  /\/log\?/i,
  /\/event\?/i,
  /\.gif\?.*[&?](?:utm_|gclid|fbclid)/i,
  /\/impression/i,
  /\/click\?/i,
  /\/conversion/i
];

// ============================================
// State
// ============================================
let detectedTrackers = {}; // { tabId: [trackerObjects] }
let detectedCookies = {};   // { tabId: [cookieObjects] } - ALL cookies including third-party
let blockedDomains = [];    // Synced from backend
let userEmail = null;
let deviceId = null;

// ============================================
// Initialization
// ============================================
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Privacy Shield installed/updated:', details.reason);
  await initialize();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('Privacy Shield started');
  await initialize();
});

async function initialize() {
  // Load stored data
  const stored = await chrome.storage.local.get([
    'config',
    'blockedDomains',
    'userEmail',
    'deviceId'
  ]);

  config = { ...DEFAULT_CONFIG, ...stored.config };
  blockedDomains = stored.blockedDomains || [];
  userEmail = stored.userEmail || null;
  deviceId = stored.deviceId || await generateDeviceId();

  // Initialize DDG tracker database
  await initializeTrackerDatabase();

  // Apply blocking rules
  await applyBlockingRules();

  // Set up periodic sync
  setupSyncAlarm();
  
  // Set up periodic data upload (every 20 seconds)
  setupUploadAlarm();

  // Initial sync if API is configured
  if (config.apiUrl && userEmail) {
    await syncBlocklistFromBackend();
  }
}

async function generateDeviceId() {
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ deviceId: id });
  return id;
}

// ============================================
// Backend Sync
// ============================================
function setupSyncAlarm() {
  // Clear existing alarm
  chrome.alarms.clear('syncBlocklist');
  
  // Create new alarm
  chrome.alarms.create('syncBlocklist', {
    periodInMinutes: config.syncIntervalMinutes || 15
  });
}

function setupUploadAlarm() {
  if (!config.autoUploadEnabled) {
    console.log('Auto-upload disabled, skipping upload alarm setup');
    chrome.alarms.clear('uploadData');
    return;
  }
  
  // Clear existing alarm
  chrome.alarms.clear('uploadData');
  
  // Create new alarm - runs every 20 seconds
  // Note: Chrome alarms minimum is 1 minute for unpacked extensions in development
  // For production (packed), we can use delayInMinutes with fractional values
  // For now, we'll use 1 minute intervals, but you can adjust
  chrome.alarms.create('uploadData', {
    periodInMinutes: config.uploadIntervalSeconds / 60  // 20 seconds = 0.333 minutes
  });
  
  console.log(`📤 Upload alarm set for every ${config.uploadIntervalSeconds} seconds`);
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncBlocklist') {
    syncBlocklistFromBackend();
  } else if (alarm.name === 'uploadData') {
    periodicUploadData();
  }
});

async function syncBlocklistFromBackend() {
  if (!config.apiUrl || !userEmail) {
    console.log('Skipping sync - no API URL or email configured');
    return { success: false, error: 'Not configured' };
  }
  
  try {
    console.log('Syncing blocklist from backend...');
    
    // Fetch blocklist from backend
    // The backend should return: { domains: ['tracker1.com', 'tracker2.com', ...] }
    const response = await fetch(`${config.apiUrl}/api/blocklist?email=${encodeURIComponent(userEmail)}&deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.domains && Array.isArray(data.domains)) {
      blockedDomains = data.domains;
      
      // Save to storage
      await chrome.storage.local.set({ 
        blockedDomains,
        lastSync: new Date().toISOString()
      });
      
      // Apply new blocking rules
      await applyBlockingRules();
      
      // Notify popup if open
      chrome.runtime.sendMessage({
        type: 'BLOCKLIST_UPDATED',
        data: {
          domains: blockedDomains,
          timestamp: new Date().toISOString()
        }
      }).catch(() => {}); // Ignore if popup is closed
      
      console.log(`Blocklist synced: ${blockedDomains.length} domains`);
      return { success: true, domains: blockedDomains };
    }
    
    return { success: false, error: 'Invalid response format' };
    
  } catch (error) {
    console.error('Failed to sync blocklist:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// Blocking Rules (Third-Party Only)
// ============================================
async function applyBlockingRules() {
  try {
    // Get existing dynamic rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = existingRules.map(r => r.id);
    
    // Create new rules - THIRD PARTY ONLY
    // Using domainType: "thirdParty" means these domains will only be blocked
    // when loaded as a third-party resource, not when visiting directly
    const newRules = blockedDomains.map((domain, index) => ({
      id: index + 1, // Rule IDs must be positive integers
      priority: 1,
      action: { type: 'block' },
      condition: {
        // Match the domain and all subdomains
        requestDomains: [domain],
        // CRITICAL: Only block as third-party requests
        domainType: 'thirdParty',
        // Block these resource types
        resourceTypes: [
          'script',
          'image', 
          'stylesheet',
          'object',
          'xmlhttprequest',
          'sub_frame',
          'ping',
          'media',
          'font',
          'other'
        ]
      }
    }));
    
    // Remove old rules and add new ones
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingIds,
      addRules: newRules
    });
    
    console.log(`Applied ${newRules.length} third-party blocking rules`);
    
  } catch (error) {
    console.error('Error applying blocking rules:', error);
  }
}

// ============================================
// Request Monitoring
// ============================================
chrome.webRequest.onBeforeRequest.addListener(
  analyzeRequest,
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// Monitor response headers to catch Set-Cookie headers (third-party cookies)
chrome.webRequest.onResponseStarted.addListener(
  analyzeCookiesFromResponse,
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

function analyzeRequest(details) {
  if (!details.url.startsWith('http') || details.tabId < 0) {
    return;
  }

  const initiator = details.initiator || details.documentUrl;
  if (!initiator) return;

  // Run async - we don't block the request here (declarativeNetRequest handles blocking)
  analyzeRequestAsync(details, initiator);
}

async function analyzeRequestAsync(details, initiator) {
  try {
    const requestUrl = new URL(details.url);
    const initiatorUrl = new URL(initiator);

    // Wait for DDG database to be ready before identifying
    await waitForDatabase();

    // 1. Check if it's a tracker FIRST (regardless of party)
    const trackerInfo = identifyTracker(requestUrl);

    if (!trackerInfo.isTracker) return;

    // 2. THEN determine if it's first or third party
    const isThirdParty = !isSameOrigin(requestUrl.hostname, initiatorUrl.hostname);

    // 3. Determine blocking: only block if third-party AND on the blocklist
    const isBlocked = isThirdParty && blockedDomains.some(d =>
      requestUrl.hostname === d || requestUrl.hostname.endsWith('.' + d)
    );

    if (!detectedTrackers[details.tabId]) {
      detectedTrackers[details.tabId] = [];
    }

    // Check if this tracker domain already exists for this tab
    const existingTracker = detectedTrackers[details.tabId].find(
      t => t.domain === requestUrl.hostname
    );

    if (existingTracker) {
      existingTracker.occurrences++;
      existingTracker.lastSeen = new Date().toISOString();
      chrome.storage.session.set({ detectedTrackers });

      chrome.runtime.sendMessage({
        type: 'TRACKER_UPDATED',
        data: existingTracker
      }).catch(() => {});
    } else {
      const trackerData = {
        id: crypto.randomUUID(),
        domain: requestUrl.hostname,
        fullUrl: details.url,
        type: details.type,
        initiator: initiator,
        isKnownTracker: trackerInfo.isKnown,
        isPotential: trackerInfo.isPotential,
        isThirdParty: isThirdParty,
        category: trackerInfo.category,
        company: trackerInfo.company,
        source: trackerInfo.source,
        timestamp: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        tabId: details.tabId,
        occurrences: 1,
        isBlocked: isBlocked
      };

      detectedTrackers[details.tabId].push(trackerData);
      chrome.storage.session.set({ detectedTrackers });

      chrome.runtime.sendMessage({
        type: 'TRACKER_DETECTED',
        data: trackerData
      }).catch(() => {});
    }
  } catch (error) {
    // Invalid URL, skip
  }
}

function identifyTracker(url) {
  const hostname = url.hostname.toLowerCase();
  const fullUrl = url.href;

  // 1. Check hardcoded list (fastest - confirmed trackers)
  for (const [domain, info] of Object.entries(KNOWN_TRACKERS)) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return {
        isTracker: true,
        isKnown: true,
        isPotential: false,
        category: info.category,
        company: info.company,
        source: 'hardcoded'
      };
    }
  }

  // 2. Check DuckDuckGo database (comprehensive - confirmed trackers)
  const ddgResult = checkAgainstDDGDatabase(hostname);
  if (ddgResult) {
    return {
      isTracker: true,
      isKnown: true,
      isPotential: false,
      category: ddgResult.category,
      company: ddgResult.company,
      source: 'duckduckgo'
    };
  }

  // 3. Pattern-based detection (heuristic - potential tracker)
  for (const pattern of TRACKING_PATTERNS) {
    if (pattern.test(fullUrl)) {
      return {
        isTracker: true,
        isKnown: false,
        isPotential: true,
        category: 'tracking',
        company: 'Unknown',
        source: 'pattern'
      };
    }
  }

  // 4. Pixel tracker detection (heuristic - potential tracker)
  if (url.pathname.match(/\.(gif|png|jpg)$/i) && url.search.length > 50) {
    return {
      isTracker: true,
      isKnown: false,
      isPotential: true,
      category: 'tracking',
      company: 'Unknown',
      source: 'pixel'
    };
  }

  return {
    isTracker: false,
    isKnown: false,
    isPotential: false,
    category: null,
    company: null
  };
}

function isSameOrigin(hostname1, hostname2) {
  const getRootDomain = (hostname) => {
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const knownTLDs = ['co.uk', 'com.au', 'co.jp', 'com.br'];
      const lastTwo = parts.slice(-2).join('.');
      if (knownTLDs.includes(lastTwo)) {
        return parts.slice(-3).join('.');
      }
      return parts.slice(-2).join('.');
    }
    return hostname;
  };

  return getRootDomain(hostname1) === getRootDomain(hostname2);
}

// ============================================
// Cookie Monitoring from Response Headers
// ============================================
async function analyzeCookiesFromResponse(details) {
  if (!details.responseHeaders || details.tabId < 0) return;

  const initiator = details.initiator || details.documentUrl;
  if (!initiator) return;

  try {
    const requestUrl = new URL(details.url);
    const initiatorUrl = new URL(initiator);

    // Check for Set-Cookie headers
    const setCookieHeaders = details.responseHeaders.filter(
      h => h.name.toLowerCase() === 'set-cookie'
    );

    if (setCookieHeaders.length === 0) return;

    // Wait for DDG database
    await waitForDatabase();

    for (const header of setCookieHeaders) {
      if (!header.value) continue;

      const cookieData = parseCookieHeader(header.value, requestUrl.hostname);
      if (!cookieData) continue;

      const isThirdParty = !isSameOrigin(requestUrl.hostname, initiatorUrl.hostname);

      // Check if the cookie domain is a known tracker
      const trackerInfo = identifyTracker(requestUrl);

      const enrichedCookie = {
        id: crypto.randomUUID(),
        name: cookieData.name,
        domain: cookieData.domain || requestUrl.hostname,
        path: cookieData.path || '/',
        secure: cookieData.secure || false,
        httpOnly: cookieData.httpOnly || false,
        sameSite: cookieData.sameSite || 'None',
        isThirdParty: isThirdParty,
        isTracker: trackerInfo.isTracker,
        initiator: initiator,
        setBy: requestUrl.hostname,
        timestamp: new Date().toISOString(),
        tabId: details.tabId,
        persistent: !!cookieData.expires || !!cookieData.maxAge,
        expirationDate: cookieData.expires
      };

      if (!detectedCookies[details.tabId]) {
        detectedCookies[details.tabId] = [];
      }

      // Avoid duplicates
      const exists = detectedCookies[details.tabId].some(
        c => c.name === enrichedCookie.name && c.domain === enrichedCookie.domain
      );

      if (!exists) {
        detectedCookies[details.tabId].push(enrichedCookie);

        chrome.runtime.sendMessage({
          type: 'COOKIE_DETECTED',
          data: enrichedCookie
        }).catch(() => {});
      }
    }

    // Store in session
    chrome.storage.session.set({ detectedCookies });

  } catch (error) {
    // Invalid URL or parsing error
  }
}

/**
 * Parse Set-Cookie header value
 * Format: "name=value; Domain=.example.com; Path=/; Secure; HttpOnly; SameSite=Lax"
 */
function parseCookieHeader(headerValue, defaultDomain) {
  const parts = headerValue.split(';').map(p => p.trim());
  const [nameValue] = parts;

  if (!nameValue || !nameValue.includes('=')) return null;

  const [name, ...valueParts] = nameValue.split('=');
  const value = valueParts.join('=');

  const cookie = { name, value };

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const [key, val] = part.split('=').map(s => s.trim());
    const lowerKey = key.toLowerCase();

    if (lowerKey === 'domain') {
      cookie.domain = val;
    } else if (lowerKey === 'path') {
      cookie.path = val;
    } else if (lowerKey === 'expires') {
      cookie.expires = new Date(val).getTime() / 1000;
    } else if (lowerKey === 'max-age') {
      cookie.maxAge = parseInt(val);
      cookie.expires = (Date.now() / 1000) + parseInt(val);
    } else if (lowerKey === 'secure') {
      cookie.secure = true;
    } else if (lowerKey === 'httponly') {
      cookie.httpOnly = true;
    } else if (lowerKey === 'samesite') {
      cookie.sameSite = val || 'None';
    }
  }

  if (!cookie.domain) {
    cookie.domain = defaultDomain;
  }

  return cookie;
}

// ============================================
// Tab Management
// ============================================
chrome.tabs.onRemoved.addListener((tabId) => {
  delete detectedTrackers[tabId];
  delete detectedCookies[tabId];
  chrome.storage.session.set({ detectedTrackers, detectedCookies });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && changeInfo.url) {
    delete detectedTrackers[tabId];
    delete detectedCookies[tabId];
    chrome.storage.session.set({ detectedTrackers, detectedCookies });
  }
});

// ============================================
// Message Handling
// ============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_TRACKERS':
      sendResponse({ trackers: detectedTrackers[message.tabId] || [] });
      break;

    case 'GET_COOKIES':
      sendResponse({ cookies: detectedCookies[message.tabId] || [] });
      break;
      
    case 'FORCE_SYNC_BLOCKLIST':
      syncBlocklistFromBackend()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async
      
    case 'CHECK_BACKEND_STATUS':
      checkBackendStatus()
        .then(result => sendResponse(result))
        .catch(() => sendResponse({ connected: false }));
      return true;
      
    case 'EMAIL_UPDATED':
      userEmail = message.email;
      chrome.storage.local.set({ userEmail: message.email });
      // Trigger a sync with new email
      syncBlocklistFromBackend();
      sendResponse({ success: true });
      break;
      
    case 'SETTINGS_UPDATED':
      config = { ...config, ...message.config };
      chrome.storage.local.set({ config });
      setupSyncAlarm(); // Reset alarm with new interval
      setupUploadAlarm(); // Reset upload alarm with new settings
      sendResponse({ success: true });
      break;
      
    case 'CLEAR_ALL_DATA':
      clearAllData()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'FORCE_UPLOAD':
      periodicUploadData()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async
      
    case 'UPLOAD_TRACKER_DATA':
      uploadTrackerData(message.data)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'UPDATE_DDG_DATABASE':
      updateTrackerDatabase()
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;

    case 'GET_DDG_DATABASE_STATUS':
      sendResponse({
        loaded: DDG_TRACKER_DATABASE.trackerData !== null,
        lastUpdate: DDG_TRACKER_DATABASE.lastUpdate,
        trackerCount: DDG_TRACKER_DATABASE.trackerData ?
          Object.keys(DDG_TRACKER_DATABASE.trackerData.trackers).length : 0
      });
      break;
  }
});

async function checkBackendStatus() {
  if (!config.apiUrl) {
    return { connected: false, error: 'No API URL configured' };
  }
  
  try {
    const response = await fetch(`${config.apiUrl}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    return { connected: response.ok };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

async function clearAllData() {
  // Clear blocking rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const existingIds = existingRules.map(r => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingIds
  });

  // Clear state
  detectedTrackers = {};
  detectedCookies = {};
  blockedDomains = [];
  userEmail = null;

  // Clear alarms
  chrome.alarms.clear('syncBlocklist');
  chrome.alarms.clear('uploadData');
}

// ============================================
// Upload Tracker Data to Backend
// ============================================
async function periodicUploadData() {
  if (!config.autoUploadEnabled) {
    console.log('Auto-upload disabled, skipping');
    return { success: false, error: 'Auto-upload disabled' };
  }
  
  if (!config.apiUrl) {
    console.log('⚠️ No API URL configured, skipping upload');
    return { success: false, error: 'No API URL configured' };
  }
  
  // Collect all trackers from all tabs
  const allTrackers = [];
  const allCookies = [];
  
  for (const tabId in detectedTrackers) {
    if (detectedTrackers[tabId]) {
      allTrackers.push(...detectedTrackers[tabId]);
    }
  }
  
  for (const tabId in detectedCookies) {
    if (detectedCookies[tabId]) {
      allCookies.push(...detectedCookies[tabId]);
    }
  }
  
  // Only upload if we have data
  if (allTrackers.length === 0 && allCookies.length === 0) {
    console.log('📭 No new data to upload');
    return { success: true, message: 'No data to upload' };
  }
  
  console.log(`📤 Uploading ${allTrackers.length} trackers and ${allCookies.length} cookies...`);
  
  try {
    const response = await fetch(`${config.apiUrl}/api/trackers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userEmail || 'anonymous@extension.local',
        deviceId: deviceId,
        trackers: allTrackers,
        cookies: allCookies,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Data uploaded successfully:', result);
    
    // Clear uploaded data from memory to avoid duplicates
    detectedTrackers = {};
    detectedCookies = {};
    await chrome.storage.session.set({ detectedTrackers, detectedCookies });
    
    return { success: true, result };
    
  } catch (error) {
    console.error('❌ Failed to upload data:', error);
    return { success: false, error: error.message };
  }
}

async function uploadTrackerData(data) {
  if (!config.apiUrl || !userEmail) {
    return { success: false, error: 'Not configured' };
  }
  
  try {
    const response = await fetch(`${config.apiUrl}/api/trackers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: userEmail,
        deviceId: deviceId,
        trackers: data.trackers,
        cookies: data.cookies,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Failed to upload tracker data:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// Startup
// ============================================
initialize();
console.log('Privacy Shield background service worker started');
