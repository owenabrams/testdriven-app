/**
 * PWA Cache Clearing Script
 * 
 * This script completely clears all PWA-related cache and storage
 * Run this in the browser console at http://localhost
 */

console.log('🧹 Starting PWA Cache Clearing...');
console.log('=' .repeat(50));

async function clearPWACache() {
  const results = [];
  
  function logResult(action, status, message) {
    const icon = status === 'success' ? '✅' : status === 'error' ? '❌' : 'ℹ️';
    console.log(`${icon} ${action}: ${message}`);
    results.push({ action, status, message });
  }
  
  try {
    // 1. Clear Service Worker Registrations
    logResult('Service Workers', 'info', 'Clearing service worker registrations...');
    
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      logResult('Service Workers', 'info', `Found ${registrations.length} registrations`);
      
      for (const registration of registrations) {
        try {
          await registration.unregister();
          logResult('Service Worker', 'success', `Unregistered: ${registration.scope}`);
        } catch (error) {
          logResult('Service Worker', 'error', `Failed to unregister: ${error.message}`);
        }
      }
    } else {
      logResult('Service Workers', 'info', 'Service Worker not supported');
    }
    
    // 2. Clear Cache Storage
    logResult('Cache Storage', 'info', 'Clearing cache storage...');
    
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      logResult('Cache Storage', 'info', `Found ${cacheNames.length} caches: ${cacheNames.join(', ')}`);
      
      for (const cacheName of cacheNames) {
        try {
          await caches.delete(cacheName);
          logResult('Cache', 'success', `Deleted cache: ${cacheName}`);
        } catch (error) {
          logResult('Cache', 'error', `Failed to delete cache ${cacheName}: ${error.message}`);
        }
      }
    } else {
      logResult('Cache Storage', 'info', 'Cache API not supported');
    }
    
    // 3. Clear IndexedDB Databases
    logResult('IndexedDB', 'info', 'Clearing IndexedDB databases...');
    
    if ('indexedDB' in window) {
      // List of known databases to clear
      const dbNames = [
        'testdriven-app',
        'PWATestDB',
        'keyval-store',
        'workbox-background-sync',
        'workbox-expiration'
      ];
      
      for (const dbName of dbNames) {
        try {
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          
          await new Promise((resolve, reject) => {
            deleteRequest.onerror = () => {
              logResult('IndexedDB', 'error', `Failed to delete ${dbName}: ${deleteRequest.error}`);
              resolve(); // Continue with other databases
            };
            
            deleteRequest.onsuccess = () => {
              logResult('IndexedDB', 'success', `Deleted database: ${dbName}`);
              resolve();
            };
            
            deleteRequest.onblocked = () => {
              logResult('IndexedDB', 'error', `Delete blocked for ${dbName} (close all tabs)`);
              resolve();
            };
          });
          
        } catch (error) {
          logResult('IndexedDB', 'error', `Error deleting ${dbName}: ${error.message}`);
        }
      }
    } else {
      logResult('IndexedDB', 'info', 'IndexedDB not supported');
    }
    
    // 4. Clear Local Storage
    logResult('Local Storage', 'info', 'Clearing localStorage...');
    
    try {
      const localStorageKeys = Object.keys(localStorage);
      logResult('Local Storage', 'info', `Found ${localStorageKeys.length} items`);
      
      localStorage.clear();
      logResult('Local Storage', 'success', 'Cleared all localStorage items');
    } catch (error) {
      logResult('Local Storage', 'error', `Failed to clear localStorage: ${error.message}`);
    }
    
    // 5. Clear Session Storage
    logResult('Session Storage', 'info', 'Clearing sessionStorage...');
    
    try {
      const sessionStorageKeys = Object.keys(sessionStorage);
      logResult('Session Storage', 'info', `Found ${sessionStorageKeys.length} items`);
      
      sessionStorage.clear();
      logResult('Session Storage', 'success', 'Cleared all sessionStorage items');
    } catch (error) {
      logResult('Session Storage', 'error', `Failed to clear sessionStorage: ${error.message}`);
    }
    
    // 6. Clear Application Cache (deprecated but still check)
    if ('applicationCache' in window && window.applicationCache.status !== window.applicationCache.UNCACHED) {
      logResult('App Cache', 'info', 'Application cache detected (deprecated)');
      try {
        window.applicationCache.update();
        logResult('App Cache', 'success', 'Application cache updated');
      } catch (error) {
        logResult('App Cache', 'error', `Failed to update app cache: ${error.message}`);
      }
    }
    
    // 7. Clear any PWA-specific global variables
    logResult('Global Variables', 'info', 'Clearing PWA global variables...');
    
    const pwaGlobals = ['PWADebugger', 'PWAManager', 'socketService'];
    pwaGlobals.forEach(globalVar => {
      if (window[globalVar]) {
        delete window[globalVar];
        logResult('Global Variable', 'success', `Cleared ${globalVar}`);
      }
    });
    
  } catch (error) {
    logResult('Cache Clearing', 'error', `Unexpected error: ${error.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  const successful = results.filter(r => r.status === 'success').length;
  const errors = results.filter(r => r.status === 'error').length;
  
  console.log(`📊 Cache Clearing Results: ${successful} successful, ${errors} errors`);
  
  if (errors === 0) {
    console.log('🎉 PWA cache cleared successfully!');
    console.log('💡 Now refresh the page for a clean PWA test');
  } else {
    console.log('⚠️ Some cache clearing operations failed. Check details above.');
  }
  
  console.log('\n🔄 Recommended next steps:');
  console.log('1. Close all browser tabs for this site');
  console.log('2. Refresh the page (Ctrl+F5 or Cmd+Shift+R)');
  console.log('3. Wait for PWA to reinitialize');
  console.log('4. Run PWA tests again');
  
  return results;
}

// Additional helper functions
window.clearPWACache = clearPWACache;

// Hard reset function
window.hardResetPWA = async function() {
  console.log('💥 Performing HARD PWA Reset...');
  
  // Clear cache first
  await clearPWACache();
  
  // Force reload without cache
  console.log('🔄 Force reloading page...');
  window.location.reload(true);
};

// Quick cache check function
window.checkPWACache = async function() {
  console.log('🔍 Checking PWA Cache Status...');
  
  // Service Workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log(`📋 Service Workers: ${registrations.length} registrations`);
    registrations.forEach(reg => console.log(`  - ${reg.scope}`));
  }
  
  // Cache Storage
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log(`📋 Cache Storage: ${cacheNames.length} caches`);
    cacheNames.forEach(name => console.log(`  - ${name}`));
  }
  
  // IndexedDB
  console.log('📋 IndexedDB: Checking databases...');
  const dbNames = ['testdriven-app', 'PWATestDB'];
  for (const dbName of dbNames) {
    try {
      const request = indexedDB.open(dbName, 1);
      await new Promise((resolve) => {
        request.onsuccess = () => {
          console.log(`  - ${dbName}: EXISTS`);
          request.result.close();
          resolve();
        };
        request.onerror = () => {
          console.log(`  - ${dbName}: NOT FOUND`);
          resolve();
        };
      });
    } catch (error) {
      console.log(`  - ${dbName}: ERROR - ${error.message}`);
    }
  }
  
  // Storage
  console.log(`📋 Local Storage: ${Object.keys(localStorage).length} items`);
  console.log(`📋 Session Storage: ${Object.keys(sessionStorage).length} items`);
};

console.log('🛠️ PWA Cache Clearing Tools Loaded!');
console.log('Available commands:');
console.log('  - clearPWACache() - Clear all PWA cache and storage');
console.log('  - hardResetPWA() - Clear cache and force reload');
console.log('  - checkPWACache() - Check current cache status');
console.log('');
console.log('🚀 Run clearPWACache() to start cleaning...');
