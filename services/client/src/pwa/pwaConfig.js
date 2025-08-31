/**
 * PWA Configuration - Phase-based Feature Management
 * 
 * This file controls which PWA features are enabled in your application.
 * Change the getCurrentConfig() function to switch between phases.
 */

// Phase 1: Standard Web App (no PWA features)
export const PHASE_1_CONFIG = {
  serviceWorker: false,
  offlineStorage: false,
  backgroundSync: false,
  pushNotifications: false,
  offlineAuth: false,
  conflictResolution: false,
  advancedCaching: false,
  batchSync: false
};

// Phase 2: Basic PWA (service worker + offline storage)
export const PHASE_2_CONFIG = {
  serviceWorker: true,
  offlineStorage: true,
  backgroundSync: false,
  pushNotifications: false,
  offlineAuth: false,
  conflictResolution: false,
  advancedCaching: false,
  batchSync: false
};

// Phase 3: Intermediate PWA (add sync and notifications)
export const PHASE_3_CONFIG = {
  serviceWorker: true,
  offlineStorage: true,
  backgroundSync: true,
  pushNotifications: true,
  offlineAuth: false,
  conflictResolution: false,
  advancedCaching: false,
  batchSync: false
};

// Phase 4: Advanced PWA (all features)
export const PHASE_4_CONFIG = {
  serviceWorker: true,
  offlineStorage: true,
  backgroundSync: true,
  pushNotifications: true,
  offlineAuth: true,
  conflictResolution: true,
  advancedCaching: true,
  batchSync: true
};

/**
 * Get current configuration
 * Change this function to switch between phases
 */
export function getCurrentConfig() {
  // 🔧 CHANGE THIS LINE TO SWITCH PHASES:
  return PHASE_2_CONFIG;  // ← Currently: Basic PWA with offline storage
  
  // Uncomment one of these to switch phases:
  // return PHASE_1_CONFIG;  // Standard web app (no PWA)
  // return PHASE_2_CONFIG;  // Basic PWA (service worker + storage)
  // return PHASE_3_CONFIG;  // Intermediate PWA (+ sync + notifications)
  // return PHASE_4_CONFIG;  // Advanced PWA (all features)
}

/**
 * Feature descriptions for UI display
 */
export const FEATURE_DESCRIPTIONS = {
  serviceWorker: 'Enables offline caching and background processing',
  offlineStorage: 'Stores data locally using IndexedDB for offline access',
  backgroundSync: 'Syncs data when connection is restored',
  pushNotifications: 'Sends push notifications to users',
  offlineAuth: 'Handles authentication while offline',
  conflictResolution: 'Resolves data conflicts between offline and online data',
  advancedCaching: 'Advanced caching strategies for better performance',
  batchSync: 'Efficient batch synchronization of multiple items'
};

/**
 * Troubleshooting guide for common issues
 */
export const TROUBLESHOOTING = {
  'App not loading': 'Switch to PHASE_1_CONFIG to disable all PWA features',
  'Service worker errors': 'Set serviceWorker: false in your phase config',
  'Storage errors': 'Set offlineStorage: false in your phase config',
  'Sync issues': 'Set backgroundSync: false in your phase config',
  'Notification problems': 'Set pushNotifications: false in your phase config',
  'Authentication issues': 'Set offlineAuth: false in your phase config',
  'Data conflicts': 'Set conflictResolution: false in your phase config',
  'Performance issues': 'Set advancedCaching: false in your phase config',
  'Batch sync problems': 'Set batchSync: false in your phase config'
};

/**
 * Get app mode description based on current config
 */
export function getAppMode() {
  const config = getCurrentConfig();
  const enabledFeatures = Object.keys(config).filter(key => config[key]);
  
  if (enabledFeatures.length === 0) {
    return 'Standard Web App';
  } else if (enabledFeatures.length <= 2) {
    return 'Basic PWA';
  } else if (enabledFeatures.length <= 4) {
    return 'Intermediate PWA';
  } else {
    return 'Advanced PWA';
  }
}

/**
 * Check if PWA features are enabled
 */
export function isPWAEnabled() {
  const config = getCurrentConfig();
  return Object.values(config).some(enabled => enabled);
}

export default {
  PHASE_1_CONFIG,
  PHASE_2_CONFIG,
  PHASE_3_CONFIG,
  PHASE_4_CONFIG,
  getCurrentConfig,
  FEATURE_DESCRIPTIONS,
  TROUBLESHOOTING,
  getAppMode,
  isPWAEnabled
};
