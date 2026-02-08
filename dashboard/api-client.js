/**
 * Privacy Shield API Client
 *
 * JavaScript module for interacting with the Privacy Shield FastAPI backend.
 * This module connects to Snowflake through the API endpoints.
 *
 * Usage:
 *   import { getCookies, getTrackers, getBlocklist } from './api-client.js';
 *   const data = await getCookies('user@example.com', 500);
 */

// API Configuration
const API_URL = 'http://localhost:8000';  // Change this to your deployed API URL

/**
 * Fetch cookie data for a user from Snowflake
 *
 * @param {string} email - User's email address
 * @param {number} limit - Maximum number of cookies to return (default: 500)
 * @returns {Promise<{cookies: Array, stats: Object}>} Cookie data and statistics
 *
 * @example
 * const result = await getCookies('user@example.com', 100);
 * console.log(result.cookies);  // Array of cookie objects
 * console.log(result.stats);    // { TOTAL_COOKIES, TRACKER_COUNT, ... }
 */
export async function getCookies(email, limit = 500) {
  try {
    const response = await fetch(
      `${API_URL}/api/cookies?email=${encodeURIComponent(email)}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      cookies: data.cookies || [],
      stats: data.stats || {}
    };
  } catch (error) {
    console.error('Error fetching cookies:', error);
    throw error;
  }
}

/**
 * Fetch tracker history for a user from Snowflake
 *
 * @param {string} email - User's email address
 * @param {number} limit - Maximum number of trackers to return (default: 500)
 * @returns {Promise<{trackers: Array, stats: Array}>} Tracker data and statistics by company
 *
 * @example
 * const result = await getTrackers('user@example.com', 100);
 * console.log(result.trackers);  // Array of tracker objects
 * console.log(result.stats);     // Array of { company, category, count, total_hits }
 */
export async function getTrackers(email, limit = 500) {
  try {
    const response = await fetch(
      `${API_URL}/api/trackers/history?email=${encodeURIComponent(email)}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    return {
      trackers: data.trackers || [],
      stats: data.stats || []
    };
  } catch (error) {
    console.error('Error fetching trackers:', error);
    throw error;
  }
}

/**
 * Fetch user's blocklist from Snowflake
 *
 * @param {string} email - User's email address
 * @param {string} deviceId - Device identifier (optional)
 * @returns {Promise<Array<string>>} Array of blocked domain strings
 *
 * @example
 * const blocklist = await getBlocklist('user@example.com');
 * console.log(blocklist);  // ['doubleclick.net', 'facebook.net', ...]
 */
export async function getBlocklist(email, deviceId = '') {
  try {
    let url = `${API_URL}/api/blocklist?email=${encodeURIComponent(email)}`;
    if (deviceId) {
      url += `&deviceId=${encodeURIComponent(deviceId)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.domains || [];
  } catch (error) {
    console.error('Error fetching blocklist:', error);
    throw error;
  }
}

/**
 * Add a domain to user's blocklist
 *
 * @param {string} domain - Domain to block
 * @param {string} email - User's email address
 * @param {string} reason - Reason for blocking (optional)
 * @returns {Promise<{success: boolean, message: string}>} Result of the operation
 *
 * @example
 * const result = await addToBlocklist('ads.example.com', 'user@example.com', 'Aggressive tracking');
 * console.log(result.message);
 */
export async function addToBlocklist(domain, email, reason = '') {
  try {
    const response = await fetch(`${API_URL}/api/blocklist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        domain,
        email,
        reason
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding to blocklist:', error);
    throw error;
  }
}

/**
 * Upload tracker and cookie data from browser extension to Snowflake
 *
 * @param {string} email - User's email address
 * @param {string} deviceId - Device identifier
 * @param {Array} trackers - Array of tracker objects
 * @param {Array} cookies - Array of cookie objects
 * @returns {Promise<{success: boolean, cookies_inserted: number, trackers_inserted: number}>}
 *
 * @example
 * const result = await uploadData('user@example.com', 'device-123', trackers, cookies);
 * console.log(`Inserted ${result.cookies_inserted} cookies and ${result.trackers_inserted} trackers`);
 */
export async function uploadData(email, deviceId, trackers = [], cookies = []) {
  try {
    const response = await fetch(`${API_URL}/api/trackers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        deviceId,
        trackers,
        cookies,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error uploading data:', error);
    throw error;
  }
}

/**
 * Check API health status
 *
 * @returns {Promise<{status: string, database: string}>} Health status
 *
 * @example
 * const health = await checkHealth();
 * console.log(health.database);  // "connected" or "disconnected"
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
}

/**
 * Get statistics about the tracker database (DuckDuckGo database info)
 *
 * @returns {Promise<{total_trackers: number, total_companies: number, categories: Array}>}
 *
 * @example
 * const stats = await getDatabaseStats();
 * console.log(`Database has ${stats.total_trackers} trackers`);
 */
export async function getDatabaseStats() {
  try {
    const response = await fetch(`${API_URL}/stats`);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching database stats:', error);
    throw error;
  }
}

/**
 * Identify a single tracking domain using DuckDuckGo database
 *
 * @param {string} domain - Domain or URL to identify
 * @returns {Promise<{domain: string, company: string, category: string, description: string, is_tracker: boolean}>}
 *
 * @example
 * const info = await identifyDomain('google-analytics.com');
 * console.log(info.company);  // "Google Analytics"
 */
export async function identifyDomain(domain) {
  try {
    const response = await fetch(`${API_URL}/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error identifying domain:', error);
    throw error;
  }
}

/**
 * Identify multiple tracking domains at once
 *
 * @param {Array<string>} domains - Array of domains to identify
 * @returns {Promise<Object>} Object mapping domains to their information
 *
 * @example
 * const results = await identifyDomainsBatch(['doubleclick.net', 'facebook.com']);
 * console.log(results['doubleclick.net'].company);  // "Google"
 */
export async function identifyDomainsBatch(domains) {
  try {
    const response = await fetch(`${API_URL}/identify/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domains })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error identifying domains:', error);
    throw error;
  }
}

// Export API_URL for configuration
export { API_URL };
