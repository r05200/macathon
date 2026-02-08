/**
 * Privacy Shield - Popup Script
 * Handles UI interactions, cookie display, tracker monitoring
 * Blocklist is fetched from backend - no local block/unblock controls
 */

// ============================================
// Configuration
// ============================================
const DEFAULT_CONFIG = {
  apiUrl: '', // Set your backend URL here or in settings
  syncIntervalMinutes: 15,
  dashboardUrl: '' // Set your dashboard URL here
};

// ============================================
// State Management
// ============================================
const state = {
  userEmail: null,
  currentTab: null,
  cookies: [],
  trackers: [],
  blockedDomains: [], // Synced from backend
  lastSync: null,
  config: { ...DEFAULT_CONFIG },
  deviceId: null
};

// ============================================
// DOM Elements
// ============================================
const elements = {
  // Status
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),
  
  // Login
  loginCollapsed: document.getElementById('loginCollapsed'),
  loginExpanded: document.getElementById('loginExpanded'),
  displayEmail: document.getElementById('displayEmail'),
  emailInput: document.getElementById('emailInput'),
  changeEmailBtn: document.getElementById('changeEmailBtn'),
  saveEmailBtn: document.getElementById('saveEmailBtn'),
  cancelEmailBtn: document.getElementById('cancelEmailBtn'),
  
  // Sync
  syncStatus: document.getElementById('syncStatus'),
  forceSyncBtn: document.getElementById('forceSyncBtn'),
  
  // Stats
  currentUrl: document.getElementById('currentUrl'),
  totalCookies: document.getElementById('totalCookies'),
  thirdPartyCookies: document.getElementById('thirdPartyCookies'),
  trackersDetected: document.getElementById('trackersDetected'),
  trackersBlocked: document.getElementById('trackersBlocked'),

  // Footer
  openDashboardFooter: document.getElementById('openDashboardFooter')
};

// ============================================
// Initialization
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  await initializePopup();
  setupEventListeners();
});

async function initializePopup() {
  // Load saved data
  const stored = await chrome.storage.local.get([
    'userEmail',
    'blockedDomains',
    'lastSync',
    'config',
    'deviceId'
  ]);

  state.userEmail = stored.userEmail || null;
  state.blockedDomains = stored.blockedDomains || [];
  state.lastSync = stored.lastSync || null;
  state.config = { ...DEFAULT_CONFIG, ...stored.config };
  state.deviceId = stored.deviceId || await generateDeviceId();

  // Update UI
  updateEmailDisplay();
  updateSyncStatus();
  updateLoginGate();

  // If not logged in, stop here — don't load any data
  if (!state.userEmail) {
    return;
  }

  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.currentTab = tab;

  if (tab?.url) {
    try {
      const url = new URL(tab.url);
      elements.currentUrl.textContent = url.hostname;
    } catch {
      elements.currentUrl.textContent = 'N/A';
    }
  }

  // Load data
  await loadCookies();
  await loadTrackers();
  updateStats();

  // Check connection status
  await checkBackendConnection();
}

function updateLoginGate() {
  const statsSection = document.querySelector('.stats-section');
  const syncBanner = document.querySelector('.sync-banner');
  const footer = document.querySelector('.footer');

  if (!state.userEmail) {
    // Hide data sections when not logged in
    if (statsSection) statsSection.style.display = 'none';
    if (syncBanner) syncBanner.style.display = 'none';
    if (footer) footer.style.display = 'none';

    // Show login prompt if it doesn't exist yet
    if (!document.getElementById('loginGateMsg')) {
      const msg = document.createElement('div');
      msg.id = 'loginGateMsg';
      msg.style.cssText = 'text-align:center;padding:32px 16px;color:var(--text-muted,#64748b);font-size:13px;';
      msg.innerHTML = '<div style="font-size:28px;margin-bottom:12px;opacity:0.5;">🔒</div>' +
        '<div style="font-weight:600;margin-bottom:4px;color:var(--text-primary,#e2e8f0);">Login Required</div>' +
        '<div>Enter your email above to start tracking and viewing your privacy data.</div>';
      const loginSection = document.getElementById('loginSection');
      loginSection.insertAdjacentElement('afterend', msg);
    }
  } else {
    // Show data sections when logged in
    if (statsSection) statsSection.style.display = '';
    if (syncBanner) syncBanner.style.display = '';
    if (footer) footer.style.display = '';

    // Remove login gate message
    const gateMsg = document.getElementById('loginGateMsg');
    if (gateMsg) gateMsg.remove();
  }
}

// ============================================
// Event Listeners
// ============================================
function setupEventListeners() {
  // Login events
  elements.changeEmailBtn.addEventListener('click', showEmailInput);
  elements.saveEmailBtn.addEventListener('click', saveEmail);
  elements.cancelEmailBtn.addEventListener('click', hideEmailInput);
  elements.emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEmail();
  });
  
  // Sync
  elements.forceSyncBtn.addEventListener('click', forceSync);

  // Dashboard links
  elements.openDashboardFooter?.addEventListener('click', openDashboard);
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TRACKER_DETECTED') {
      handleNewTracker(message.data);
    } else if (message.type === 'BLOCKLIST_UPDATED') {
      state.blockedDomains = message.data.domains;
      state.lastSync = message.data.timestamp;
      updateSyncStatus();
      updateStats();
    }
  });
}

// ============================================
// Status & Sync Functions
// ============================================
async function checkBackendConnection() {
  setStatus('active', 'Active');
}

function setStatus(status, text) {
  elements.statusDot.className = 'status-dot ' + status;
  elements.statusText.textContent = text;
}

function updateSyncStatus() {
  const count = state.blockedDomains.length;
  const lastSyncText = state.lastSync 
    ? formatTimeAgo(new Date(state.lastSync))
    : 'Never';
  
  elements.syncStatus.textContent = `Blocklist: ${count} domains | Last sync: ${lastSyncText}`;
}

async function forceSync() {
  setStatus('syncing', 'Syncing...');
  elements.forceSyncBtn.disabled = true;
  elements.forceSyncBtn.textContent = 'Syncing...';
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      type: 'FORCE_SYNC_BLOCKLIST' 
    });
    
    if (response?.success) {
      state.blockedDomains = response.domains || [];
      state.lastSync = new Date().toISOString();
      await chrome.storage.local.set({ 
        blockedDomains: state.blockedDomains,
        lastSync: state.lastSync
      });
      
      setStatus('active', 'Connected');
      updateSyncStatus();
      updateStats();
    } else {
      setStatus('error', 'Sync failed');
    }
  } catch (error) {
    console.error('Sync error:', error);
    setStatus('error', 'Sync error');
  }
  
  elements.forceSyncBtn.disabled = false;
  elements.forceSyncBtn.textContent = 'Sync Now';
}

// ============================================
// Email/Login Functions
// ============================================
function showEmailInput() {
  elements.loginCollapsed.classList.add('hidden');
  elements.loginExpanded.classList.remove('hidden');
  elements.emailInput.value = state.userEmail || '';
  elements.emailInput.focus();
}

function hideEmailInput() {
  elements.loginExpanded.classList.add('hidden');
  elements.loginCollapsed.classList.remove('hidden');
}

async function saveEmail() {
  const email = elements.emailInput.value.trim();

  if (!email) {
    state.userEmail = null;
    await chrome.storage.local.remove('userEmail');
  } else if (isValidEmail(email)) {
    state.userEmail = email;
    await chrome.storage.local.set({ userEmail: email });

    // Notify background to re-sync with new email
    chrome.runtime.sendMessage({
      type: 'EMAIL_UPDATED',
      email: email
    });
  } else {
    alert('Please enter a valid email address');
    return;
  }

  updateEmailDisplay();
  hideEmailInput();
  updateLoginGate();

  // If user just logged in, load data now
  if (state.userEmail) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    state.currentTab = tab;
    if (tab?.url) {
      try {
        elements.currentUrl.textContent = new URL(tab.url).hostname;
      } catch {
        elements.currentUrl.textContent = 'N/A';
      }
    }
    await loadCookies();
    await loadTrackers();
    updateStats();
    await checkBackendConnection();
  }
}

function updateEmailDisplay() {
  if (state.userEmail) {
    elements.displayEmail.textContent = state.userEmail;
    elements.displayEmail.classList.add('logged-in');
    elements.changeEmailBtn.textContent = 'Change';
  } else {
    elements.displayEmail.textContent = 'Not logged in';
    elements.displayEmail.classList.remove('logged-in');
    elements.changeEmailBtn.textContent = 'Login';
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// Tab Navigation
// ============================================
function switchTab(tabId) {
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  
  elements.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === `${tabId}Tab`);
  });
}

// ============================================
// Cookie Functions
// ============================================
async function loadCookies() {
  if (!state.currentTab?.id) {
    state.cookies = [];
    return;
  }

  try {
    // Get cookies detected by background script (includes third-party)
    const result = await chrome.storage.session.get(['detectedCookies']);
    const allCookies = result.detectedCookies || {};
    const backgroundCookies = allCookies[state.currentTab.id] || [];

    // Also get first-party cookies via chrome.cookies API as fallback
    let firstPartyCookies = [];
    if (state.currentTab.url) {
      firstPartyCookies = await chrome.cookies.getAll({ url: state.currentTab.url });
    }

    // Merge both sources, prioritizing background-detected cookies
    const cookieMap = new Map();

    // Add background cookies first (these include third-party)
    backgroundCookies.forEach(cookie => {
      const key = `${cookie.name}:${cookie.domain}`;
      cookieMap.set(key, {
        ...cookie,
        source: 'background',
        classification: classifyCookie(cookie)
      });
    });

    // Add first-party cookies from API (if not already present)
    const url = state.currentTab.url ? new URL(state.currentTab.url) : null;
    firstPartyCookies.forEach(cookie => {
      const key = `${cookie.name}:${cookie.domain}`;
      if (!cookieMap.has(key)) {
        cookieMap.set(key, {
          ...enrichCookieData(cookie, url?.hostname || ''),
          source: 'chrome-api'
        });
      }
    });

    state.cookies = Array.from(cookieMap.values());
  } catch (error) {
    console.error('Error loading cookies:', error);
    state.cookies = [];
  }
}

function enrichCookieData(cookie, pageHostname) {
  const isThirdParty = !cookie.domain.includes(pageHostname) && 
                       !pageHostname.includes(cookie.domain.replace(/^\./, ''));
  
  let persistenceDays = null;
  let isSession = !cookie.expirationDate;
  
  if (cookie.expirationDate) {
    const now = Date.now() / 1000;
    persistenceDays = Math.round((cookie.expirationDate - now) / 86400);
  }
  
  const classification = classifyCookie(cookie);
  
  return {
    ...cookie,
    isThirdParty,
    isSession,
    persistenceDays,
    classification,
    collectedAt: new Date().toISOString()
  };
}

function classifyCookie(cookie) {
  const name = cookie.name.toLowerCase();
  const domain = cookie.domain.toLowerCase();

  // Tracking cookies - advertising and cross-site tracking
  const trackingPatterns = [
    '_ga', '_gid', '_gat',           // Google Analytics
    '_fbp', '_fbc', 'fr',            // Facebook
    '__utm', '_gcl',                 // Google UTM/Conversion
    'ide', 'dsid', 'flc',            // DoubleClick
    'personalization_id',            // Twitter
    'li_', 'lidc', 'bcookie',        // LinkedIn
    '_hjid',                         // Hotjar
    'uuid',                          // Generic tracking
    'visitor', 'visitor_id',         // Visitor tracking
    'aid', 'uid', '_uid',            // User ID tracking
    'test_cookie', 'tr'              // Test/tracking cookies
  ];

  // Analytics & A/B Testing cookies
  const analyticsPatterns = [
    'analytics',                     // Generic analytics
    'segment',                       // Segment.io
    'mixpanel',                      // Mixpanel
    'heap',                          // Heap Analytics
    'amplitude',                     // Amplitude
    'optimizely', '_optimizely',     // Optimizely A/B testing
    '_cb', 'chartbeat',              // Chartbeat
    'ajs_',                          // Analytics.js (Segment)
    'mp_',                           // Mixpanel prefix
    '_hjsession',                    // Hotjar session
    'keen'                           // Keen.io
  ];

  // Functional/Necessary cookies
  const functionalPatterns = [
    'session', 'sess', 'jsessionid', // Session management
    'csrf', 'xsrf',                  // CSRF protection
    'token', 'auth',                 // Authentication
    'login', 'user',                 // User state
    'cart', 'basket',                // Shopping cart
    'lang', 'language',              // Language preference
    'theme', 'mode',                 // Theme/display
    'consent', 'cookie', 'policy',   // Cookie consent
    'gdpr', 'ccpa',                  // Privacy compliance
    'ckns_policy'                    // Specific consent cookie
  ];

  // Advertising cookies
  const advertisingPatterns = [
    'ads', '_ads',                   // Generic ads
    'adroll',                        // AdRoll
    'taboola',                       // Taboola
    'outbrain',                      // Outbrain
    'criteo',                        // Criteo
    'pubmatic',                      // PubMatic
    'doubleclick',                   // DoubleClick
    'adsense'                        // Google AdSense
  ];

  // Social media cookies
  const socialPatterns = [
    'fb', '_fb',                     // Facebook
    'twitter', 'twtr',               // Twitter
    'pinterest',                     // Pinterest
    'linkedin', 'li_',               // LinkedIn
    'instagram'                      // Instagram
  ];

  // Check patterns in order of priority
  if (trackingPatterns.some(p => name.includes(p))) return 'tracking';
  if (advertisingPatterns.some(p => name.includes(p) || domain.includes(p))) return 'advertising';
  if (socialPatterns.some(p => name.includes(p) || domain.includes(p))) return 'social';
  if (analyticsPatterns.some(p => name.includes(p) || domain.includes(p))) return 'analytics';
  if (functionalPatterns.some(p => name.includes(p))) return 'functional';

  return 'unknown';
}

function renderCookieList() {
  const searchTerm = elements.cookieSearch.value.toLowerCase();
  const filter = elements.cookieFilter.value;
  
  let filtered = state.cookies;
  
  if (searchTerm) {
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(searchTerm) ||
      c.domain.toLowerCase().includes(searchTerm)
    );
  }
  
  switch (filter) {
    case 'third-party':
      filtered = filtered.filter(c => c.isThirdParty);
      break;
    case 'tracking':
      filtered = filtered.filter(c => c.classification === 'tracking');
      break;
    case 'persistent':
      filtered = filtered.filter(c => !c.isSession);
      break;
    case 'session':
      filtered = filtered.filter(c => c.isSession);
      break;
  }
  
  if (filtered.length === 0) {
    elements.cookieList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🍪</span>
        <p>No cookies found</p>
      </div>
    `;
    return;
  }
  
  elements.cookieList.innerHTML = filtered.map(cookie => `
    <div class="list-item" onclick="this.classList.toggle('expanded')">
      <div class="list-item-header">
        <div>
          <span class="list-item-name">${escapeHtml(cookie.name)}</span>
          <div class="list-item-domain">${escapeHtml(cookie.domain)}</div>
        </div>
        <div class="tracker-badges">
          ${cookie.isThirdParty ? '<span class="badge badge-third-party">3rd Party</span>' : '<span class="badge badge-first-party">1st Party</span>'}
          <span class="badge badge-${cookie.classification}">${cookie.classification}</span>
        </div>
      </div>
      <div class="list-item-meta">
        ${cookie.isSession ? '<span class="badge badge-session">session</span>' : 
          `<span class="badge badge-persistent">${cookie.persistenceDays}d</span>`}
      </div>
      <div class="list-item-details">
        <div class="detail-row">
          <span class="detail-label">Party:</span>
          <span class="detail-value">${cookie.isThirdParty ? '🚨 Third-Party (cross-site)' : '✅ First-Party (same-site)'}</span>
        </div>
        ${cookie.setBy ? `
        <div class="detail-row">
          <span class="detail-label">Set By:</span>
          <span class="detail-value">${escapeHtml(cookie.setBy)}</span>
        </div>
        ` : ''}
        ${cookie.isTracker ? `
        <div class="detail-row">
          <span class="detail-label">Tracker:</span>
          <span class="detail-value">⚠️ Known tracker domain</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Path:</span>
          <span class="detail-value">${escapeHtml(cookie.path)}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Secure:</span>
          <span class="detail-value">${cookie.secure ? 'Yes' : 'No'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">HttpOnly:</span>
          <span class="detail-value">${cookie.httpOnly ? 'Yes' : 'No'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">SameSite:</span>
          <span class="detail-value">${cookie.sameSite || 'None'}</span>
        </div>
        ${cookie.expirationDate ? `
        <div class="detail-row">
          <span class="detail-label">Expires:</span>
          <span class="detail-value">${new Date(cookie.expirationDate * 1000).toLocaleDateString()}</span>
        </div>
        ` : ''}
        <div class="detail-row">
          <span class="detail-label">Classification:</span>
          <span class="detail-value">${cookie.classification}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Value:</span>
          <span class="detail-value" title="${escapeHtml(cookie.value || '')}">${escapeHtml(truncate(cookie.value || '', 30))}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// Tracker Functions
// ============================================
async function loadTrackers() {
  const result = await chrome.storage.session.get(['detectedTrackers']);
  const allTrackers = result.detectedTrackers || {};
  
  if (state.currentTab?.id) {
    state.trackers = allTrackers[state.currentTab.id] || [];
  }
  
}

function handleNewTracker(trackerData) {
  const existingIndex = state.trackers.findIndex(t => t.domain === trackerData.domain);

  if (existingIndex >= 0) {
    // Update existing tracker
    state.trackers[existingIndex] = trackerData;
  } else {
    // Add new tracker
    state.trackers.push(trackerData);
  }

  updateStats();
}

// Listen for tracker updates (occurrences)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TRACKER_UPDATED') {
    handleNewTracker(message.data);
  } else if (message.type === 'COOKIE_DETECTED') {
    loadCookies(); // Reload cookies when a new one is detected
    updateStats(); // Update stats as well
  }
});

function renderTrackerList() {
  const searchTerm = elements.trackerSearch.value.toLowerCase();
  
  let filtered = state.trackers;
  
  if (searchTerm) {
    filtered = filtered.filter(t => 
      t.domain.toLowerCase().includes(searchTerm) ||
      t.fullUrl.toLowerCase().includes(searchTerm)
    );
  }
  
  if (filtered.length === 0) {
    elements.trackerList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>No trackers detected yet</p>
      </div>
    `;
    return;
  }

  elements.trackerList.innerHTML = filtered.map(tracker => {
    // Check if this domain is in the blocklist (synced from backend)
    const isBlocked = tracker.isBlocked || state.blockedDomains.some(d =>
      tracker.domain === d || tracker.domain.endsWith('.' + d)
    );
    const category = tracker.category || 'unknown';
    const company = tracker.company || 'Unknown';
    const occurrences = tracker.occurrences || 1;
    const source = tracker.source || 'unknown';
    const isPotential = tracker.isPotential || false;
    const isThirdParty = tracker.isThirdParty !== undefined ? tracker.isThirdParty : true;

    // Extract initiator domain for cleaner display
    let initiatorDomain = 'Unknown';
    try {
      initiatorDomain = new URL(tracker.initiator).hostname;
    } catch (e) {
      initiatorDomain = tracker.initiator || 'Unknown';
    }

    // Source icons and labels
    const sourceInfo = {
      'hardcoded': { icon: '📋', label: 'Hardcoded List', color: '#3b82f6' },
      'duckduckgo': { icon: '🦆', label: 'DuckDuckGo Database', color: '#10b981' },
      'pattern': { icon: '🔍', label: 'Pattern Detection', color: '#f59e0b' },
      'pixel': { icon: '🖼️', label: 'Pixel Tracker', color: '#ef4444' },
      'unknown': { icon: '❓', label: 'Unknown', color: '#6b7280' }
    };

    const detectionInfo = sourceInfo[source] || sourceInfo['unknown'];

    // Company display with explanation for Unknown
    const companyDisplay = company === 'Unknown'
      ? `<span class="tracker-company unknown" title="Company unknown - detected by ${detectionInfo.label}">Unknown (${detectionInfo.icon} ${detectionInfo.label})</span>`
      : `<span class="tracker-company">${escapeHtml(company)} <span class="source-badge" title="Detected via ${detectionInfo.label}">${detectionInfo.icon}</span></span>`;

    return `
      <div class="list-item tracker-item ${isBlocked ? 'blocked' : ''}" onclick="this.classList.toggle('expanded')">
        <div class="list-item-header">
          <div>
            <span class="list-item-name">${escapeHtml(tracker.domain)}</span>
            <div class="tracker-company-row">${companyDisplay}</div>
          </div>
          <div class="tracker-badges">
            ${isBlocked ? '<span class="badge badge-blocked">🛡️ Blocked</span>' : '<span class="badge badge-active">⚠️ Active</span>'}
            ${isPotential ? '<span class="badge badge-potential">Potential</span>' : '<span class="badge badge-confirmed">Confirmed</span>'}
            ${!isThirdParty ? '<span class="badge badge-first-party">1st Party</span>' : ''}
            <span class="badge badge-${category}">${category}</span>
            ${occurrences > 1 ? `<span class="badge badge-count">${occurrences}×</span>` : ''}
          </div>
        </div>
        <div class="list-item-meta tracker-meta">
          <span class="tracker-initiator">
            <strong>Loaded by:</strong> ${escapeHtml(initiatorDomain)}
          </span>
          <span class="tracker-source" style="color: ${detectionInfo.color}">
            <strong>${detectionInfo.icon} Detected via:</strong> ${detectionInfo.label}
          </span>
        </div>
        <div class="list-item-details">
          <div class="detail-row">
            <span class="detail-label">Tracker Domain:</span>
            <span class="detail-value">${escapeHtml(tracker.domain)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Loaded By (Initiator):</span>
            <span class="detail-value">${escapeHtml(initiatorDomain)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Full Initiator URL:</span>
            <span class="detail-value" title="${escapeHtml(tracker.initiator)}">${escapeHtml(truncate(tracker.initiator, 50))}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Request Type:</span>
            <span class="detail-value">${tracker.type || 'unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Times Seen:</span>
            <span class="detail-value">${occurrences} occurrence${occurrences > 1 ? 's' : ''}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">First Seen:</span>
            <span class="detail-value">${tracker.timestamp ? formatTimeAgo(new Date(tracker.timestamp)) : 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Last Seen:</span>
            <span class="detail-value">${tracker.lastSeen ? formatTimeAgo(new Date(tracker.lastSeen)) : 'Unknown'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Full Tracker URL:</span>
            <span class="detail-value" title="${escapeHtml(tracker.fullUrl)}">${escapeHtml(truncate(tracker.fullUrl, 50))}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Detection Method:</span>
            <span class="detail-value" style="color: ${detectionInfo.color}">
              ${detectionInfo.icon} <strong>${detectionInfo.label}</strong>
            </span>
          </div>
          <div class="detail-row detection-explanation">
            <span class="detail-label">What this means:</span>
            <span class="detail-value">
              ${getDetectionExplanation(source, company)}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Party:</span>
            <span class="detail-value">${isThirdParty ? '3rd Party' : '1st Party'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Confidence:</span>
            <span class="detail-value">${isPotential ? '⚠️ Potential (heuristic)' : '✅ Confirmed (database)'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value">${isBlocked ? '🛡️ Blocked as third-party' : isThirdParty ? '⚠️ Active (not on blocklist)' : 'ℹ️ First-party (not blocked)'}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================
// Stats Functions
// ============================================
function updateStats() {
  const totalCookies = state.cookies.length;
  const thirdPartyCookies = state.cookies.filter(c => c.isThirdParty).length;
  const trackersDetected = state.trackers.length;
  
  // Count trackers that are in the blocklist
  const trackersBlocked = state.trackers.filter(t => 
    state.blockedDomains.some(d => t.domain === d || t.domain.endsWith('.' + d))
  ).length;
  
  elements.totalCookies.textContent = totalCookies;
  elements.thirdPartyCookies.textContent = thirdPartyCookies;
  elements.trackersDetected.textContent = trackersDetected;
  elements.trackersBlocked.textContent = trackersBlocked;
}

// ============================================
// Settings Functions
// ============================================
function updateSettingsUI() {
  elements.apiUrlInput.value = state.config.apiUrl || '';
  elements.syncIntervalSelect.value = state.config.syncIntervalMinutes || 15;
  elements.deviceIdDisplay.textContent = state.deviceId ? 
    state.deviceId.substring(0, 8) + '...' : 'N/A';
}

async function saveSettings() {
  const apiUrl = elements.apiUrlInput.value.trim();
  const syncInterval = parseInt(elements.syncIntervalSelect.value);
  
  state.config.apiUrl = apiUrl;
  state.config.syncIntervalMinutes = syncInterval;
  
  await chrome.storage.local.set({ config: state.config });
  
  // Notify background to update settings
  chrome.runtime.sendMessage({ 
    type: 'SETTINGS_UPDATED', 
    config: state.config 
  });
  
  alert('Settings saved!');
  checkBackendConnection();
}

// ============================================
// Dashboard
// ============================================
function openDashboard(e) {
  e?.preventDefault();

  // Default dashboard URL
  const dashboardUrl = 'http://localhost:5173/app/overview';

  chrome.tabs.create({ url: dashboardUrl });
}

// ============================================
// Utility Functions
// ============================================
function getDetectionExplanation(source, company) {
  switch (source) {
    case 'hardcoded':
      return `This tracker is in our curated list of 54 known trackers. Company: <strong>${company}</strong>`;
    case 'duckduckgo':
      return `This tracker is in the DuckDuckGo database of 60,000+ known trackers. Company: <strong>${company}</strong>`;
    case 'pattern':
      return `Detected by URL patterns (e.g., /track, /pixel, /analytics). Company unknown - not in tracker databases.`;
    case 'pixel':
      return `Detected as a tracking pixel (image with long query string). Company unknown - not in tracker databases.`;
    default:
      return `Detection method unknown.`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function truncate(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

async function generateDeviceId() {
  const deviceId = crypto.randomUUID();
  await chrome.storage.local.set({ deviceId });
  return deviceId;
}

async function clearAllLocalData() {
  if (!confirm('Clear all local data? This will log you out and reset all settings.')) {
    return;
  }
  
  await chrome.storage.local.clear();
  await chrome.storage.session.clear();
  
  // Notify background to clear blocking rules
  chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });
  
  // Reset state
  state.userEmail = null;
  state.cookies = [];
  state.trackers = [];
  state.blockedDomains = [];
  state.lastSync = null;
  state.config = { ...DEFAULT_CONFIG };
  state.deviceId = await generateDeviceId();
  
  // Update UI
  updateEmailDisplay();
  updateSyncStatus();
  updateStats();
  setStatus('error', 'Reset');
  
  alert('All local data cleared!');
}
