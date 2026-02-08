/**
 * DuckDuckGo Tracker Database Manager
 * Downloads and maintains the DDG tracker blocklist locally
 */

export const DDG_TRACKER_DATABASE = {
  // DuckDuckGo's tracker blocklist URL
  TDS_URL: 'https://staticcdn.duckduckgo.com/trackerblocking/v6/current/tds.json',

  // Update frequency (24 hours)
  UPDATE_INTERVAL_HOURS: 24,

  // In-memory cache
  trackerData: null,
  lastUpdate: null
};

// Promise that resolves when the database is ready
let _dbReadyResolve;
let _dbReady = new Promise(resolve => { _dbReadyResolve = resolve; });

/**
 * Wait for the DDG database to finish loading.
 * Returns immediately if already loaded.
 */
export function waitForDatabase() {
  return _dbReady;
}

/**
 * Initialize the tracker database
 */
export async function initializeTrackerDatabase() {
  try {
    // Load from storage first
    const stored = await chrome.storage.local.get(['ddgTrackerData', 'ddgLastUpdate']);

    if (stored.ddgTrackerData && stored.ddgLastUpdate) {
      DDG_TRACKER_DATABASE.trackerData = stored.ddgTrackerData;
      DDG_TRACKER_DATABASE.lastUpdate = new Date(stored.ddgLastUpdate);
      console.log('Loaded DDG tracker database from storage');
    }

    // Check if we need to update
    const needsUpdate = !DDG_TRACKER_DATABASE.lastUpdate ||
      (Date.now() - DDG_TRACKER_DATABASE.lastUpdate.getTime()) >
      (DDG_TRACKER_DATABASE.UPDATE_INTERVAL_HOURS * 60 * 60 * 1000);

    if (needsUpdate) {
      await updateTrackerDatabase();
    }

    // Set up periodic updates
    setupTrackerDatabaseAlarm();

    // Signal that the database is ready
    _dbReadyResolve();

  } catch (error) {
    console.error('Failed to initialize tracker database:', error);
    // Still resolve so requests aren't blocked forever
    _dbReadyResolve();
  }
}

/**
 * Download latest tracker database from DuckDuckGo
 */
export async function updateTrackerDatabase() {
  try {
    console.log('Updating DDG tracker database...');

    const response = await fetch(DDG_TRACKER_DATABASE.TDS_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const tds = await response.json();

    // Process and optimize the data structure for fast lookups
    const processedData = processTrackerData(tds);

    // Store in memory
    DDG_TRACKER_DATABASE.trackerData = processedData;
    DDG_TRACKER_DATABASE.lastUpdate = new Date();

    // Persist to storage
    await chrome.storage.local.set({
      ddgTrackerData: processedData,
      ddgLastUpdate: DDG_TRACKER_DATABASE.lastUpdate.toISOString()
    });

    console.log(`DDG tracker database updated: ${Object.keys(processedData.trackers).length} trackers`);
    return { success: true, count: Object.keys(processedData.trackers).length };

  } catch (error) {
    console.error('Failed to update tracker database:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process raw DDG data into optimized lookup structure
 * DDG TDS format: { trackers: { "domain.com": { owner: {...}, default: "block", ... } }, entities: {...} }
 */
function processTrackerData(tds) {
  const processed = {
    trackers: {},      // domain -> tracker info
    entities: {}       // company/entity information
  };

  // Process trackers - convert to flat lookup
  if (tds.trackers) {
    for (const [domain, trackerInfo] of Object.entries(tds.trackers)) {
      processed.trackers[domain] = {
        domain: domain,
        owner: trackerInfo.owner?.name || 'Unknown',
        category: trackerInfo.categories?.[0] || 'tracking',
        default: trackerInfo.default || 'ignore',
        // Store subdomains for faster matching
        subdomains: trackerInfo.subdomains || []
      };
    }
  }

  // Process entities (companies)
  if (tds.entities) {
    processed.entities = tds.entities;
  }

  return processed;
}

/**
 * Check if a domain is a tracker using the DDG database
 * @param {string} hostname - The hostname to check
 * @returns {Object|null} Tracker info if found, null otherwise
 */
export function checkAgainstDDGDatabase(hostname) {
  if (!DDG_TRACKER_DATABASE.trackerData) {
    return null;
  }

  const trackers = DDG_TRACKER_DATABASE.trackerData.trackers;
  const cleanHostname = hostname.toLowerCase();

  // Direct match
  if (trackers[cleanHostname]) {
    return {
      isTracker: true,
      isDDGTracker: true,
      domain: cleanHostname,
      company: trackers[cleanHostname].owner,
      category: trackers[cleanHostname].category,
      action: trackers[cleanHostname].default
    };
  }

  // Check if it's a subdomain of a known tracker
  // e.g., "ads.example.com" should match if "example.com" is in the database
  const parts = cleanHostname.split('.');
  for (let i = 1; i < parts.length; i++) {
    const parentDomain = parts.slice(i).join('.');

    if (trackers[parentDomain]) {
      return {
        isTracker: true,
        isDDGTracker: true,
        domain: parentDomain,
        company: trackers[parentDomain].owner,
        category: trackers[parentDomain].category,
        action: trackers[parentDomain].default
      };
    }
  }

  return null;
}

/**
 * Set up alarm for periodic database updates
 */
function setupTrackerDatabaseAlarm() {
  chrome.alarms.create('updateDDGDatabase', {
    periodInMinutes: DDG_TRACKER_DATABASE.UPDATE_INTERVAL_HOURS * 60
  });
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateDDGDatabase') {
    updateTrackerDatabase();
  }
});
