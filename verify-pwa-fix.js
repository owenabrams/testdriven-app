/**
 * PWA Fix Verification Script
 * 
 * Run this in the browser console at http://localhost to verify PWA fixes
 */

console.log('🔧 Verifying PWA Fixes...');
console.log('=' .repeat(50));

async function verifyPWAFixes() {
  const results = [];
  
  function logResult(test, status, message) {
    const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${message}`);
    results.push({ test, status, message });
  }
  
  try {
    // Test 1: Check if PWA Debugger is available
    if (typeof window.PWADebugger !== 'undefined') {
      logResult('PWA Debugger', 'pass', 'Available globally');
      
      // Test 2: Check PWA Manager status
      const status = window.PWADebugger.getPWAStatus();
      logResult('PWA Manager', status.initialized ? 'pass' : 'fail', 
        `Initialized: ${status.initialized}`);
      
      if (status.initialized) {
        // Test 3: Check available services
        logResult('PWA Services', 'pass', 
          `${status.services.length} services: ${status.services.join(', ')}`);
        
        // Test 4: Check offline storage specifically
        if (status.services.includes('offlineStorage')) {
          logResult('Offline Storage', 'pass', 'Service is registered');
          
          // Test 5: Try to access offline storage
          const offlineStorage = window.PWADebugger.PWAManager.getService('offlineStorage');
          if (offlineStorage) {
            logResult('Storage Access', 'pass', 'Can access offline storage service');
            
            // Test 6: Check if initialized
            if (offlineStorage.isInitialized && offlineStorage.isInitialized()) {
              logResult('Storage Init', 'pass', 'Offline storage is initialized');
              
              // Test 7: Try to get users
              try {
                const users = await offlineStorage.getAllUsers();
                logResult('Storage Data', 'pass', `Found ${users.length} users in storage`);
              } catch (error) {
                logResult('Storage Data', 'fail', `Error getting users: ${error.message}`);
              }
            } else {
              logResult('Storage Init', 'fail', 'Offline storage not initialized');
            }
          } else {
            logResult('Storage Access', 'fail', 'Cannot access offline storage service');
          }
        } else {
          logResult('Offline Storage', 'fail', 'Service not registered');
        }
      }
      
      // Test 8: Check app mode
      const appMode = window.PWADebugger.getAppMode();
      logResult('App Mode', appMode.includes('Failed') ? 'fail' : 'pass', appMode);
      
    } else {
      logResult('PWA Debugger', 'fail', 'Not available - app may not be loaded');
    }
    
    // Test 9: Check Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      logResult('Service Worker', registrations.length > 0 ? 'pass' : 'warn', 
        `${registrations.length} registrations found`);
    }
    
    // Test 10: Check IndexedDB
    if ('indexedDB' in window) {
      logResult('IndexedDB', 'pass', 'Supported');
      
      // Quick IndexedDB test
      try {
        const request = indexedDB.open('testdriven-app', 1);
        await new Promise((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            logResult('App Database', 'pass', `Database exists with stores: ${Array.from(db.objectStoreNames).join(', ')}`);
            db.close();
            resolve();
          };
        });
      } catch (error) {
        logResult('App Database', 'fail', `Database error: ${error.message}`);
      }
    }
    
  } catch (error) {
    logResult('Verification', 'fail', `Test failed: ${error.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warn').length;
  
  console.log(`📊 Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  
  if (failed === 0) {
    console.log('🎉 PWA fixes appear to be working!');
  } else {
    console.log('⚠️ Some issues remain. Check the details above.');
  }
  
  return results;
}

// Auto-run verification
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(verifyPWAFixes, 3000); // Wait 3 seconds for PWA initialization
    });
  } else {
    setTimeout(verifyPWAFixes, 3000);
  }
}

// Make available globally
window.verifyPWAFixes = verifyPWAFixes;
