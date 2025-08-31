/**
 * PWA Functionality Test Runner
 * 
 * This script tests all PWA functionality programmatically
 * Run this in the browser console at http://localhost
 */

console.log('🧪 Starting Comprehensive PWA Functionality Tests...');
console.log('=' .repeat(60));

// Test Results Storage
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Test Helper Functions
function logTest(testName, status, message, details = null) {
  const icons = {
    pass: '✅',
    fail: '❌', 
    warn: '⚠️',
    info: 'ℹ️'
  };
  
  const result = {
    test: testName,
    status,
    message,
    details,
    timestamp: new Date().toISOString()
  };
  
  testResults.tests.push(result);
  
  if (status === 'pass') testResults.passed++;
  else if (status === 'fail') testResults.failed++;
  else if (status === 'warn') testResults.warnings++;
  
  console.log(`${icons[status]} ${testName}: ${message}`);
  if (details) console.log('   Details:', details);
}

// Test 1: PWA Configuration
async function testPWAConfiguration() {
  console.log('\n📋 Test 1: PWA Configuration');
  console.log('-'.repeat(40));
  
  try {
    // Check if PWADebugger is available
    if (typeof window.PWADebugger !== 'undefined') {
      logTest('PWA Debugger', 'pass', 'PWA Debugger is available globally');
      
      // Get current configuration
      const config = window.PWADebugger.getCurrentConfig();
      logTest('PWA Config', 'pass', 'Configuration loaded successfully', config);
      
      // Check enabled features
      const enabledFeatures = Object.keys(config).filter(key => config[key]);
      logTest('PWA Features', 'info', `${enabledFeatures.length} features enabled`, enabledFeatures);
      
      // Check app mode
      const appMode = window.PWADebugger.getAppMode();
      if (appMode.includes('Failed')) {
        logTest('App Mode', 'fail', `App mode indicates failure: ${appMode}`);
      } else {
        logTest('App Mode', 'pass', `App mode: ${appMode}`);
      }
      
    } else {
      logTest('PWA Debugger', 'fail', 'PWA Debugger not available - app may not be loaded');
    }
  } catch (error) {
    logTest('PWA Configuration', 'fail', 'Configuration test failed', error.message);
  }
}

// Test 2: PWA Manager Status
async function testPWAManager() {
  console.log('\n🔧 Test 2: PWA Manager Status');
  console.log('-'.repeat(40));
  
  try {
    if (window.PWADebugger && window.PWADebugger.PWAManager) {
      const status = window.PWADebugger.getPWAStatus();
      
      if (status.initialized) {
        logTest('PWA Manager', 'pass', 'PWA Manager is initialized');
      } else {
        logTest('PWA Manager', 'fail', 'PWA Manager is not initialized');
      }
      
      logTest('PWA Services', 'info', `${status.services.length} services active`, status.services);
      logTest('PWA Features', 'info', 'Feature status', status.features);
      
    } else {
      logTest('PWA Manager', 'fail', 'PWA Manager not accessible');
    }
  } catch (error) {
    logTest('PWA Manager', 'fail', 'PWA Manager test failed', error.message);
  }
}

// Test 3: Service Worker
async function testServiceWorker() {
  console.log('\n🔧 Test 3: Service Worker');
  console.log('-'.repeat(40));
  
  try {
    if ('serviceWorker' in navigator) {
      logTest('SW Support', 'pass', 'Service Worker API is supported');
      
      // Check registrations
      const registrations = await navigator.serviceWorker.getRegistrations();
      logTest('SW Registrations', 'info', `Found ${registrations.length} registrations`);
      
      if (registrations.length > 0) {
        registrations.forEach((reg, index) => {
          logTest(`SW Registration ${index + 1}`, 'pass', `Scope: ${reg.scope}`);
        });
      }
      
      // Check active service worker
      if (navigator.serviceWorker.controller) {
        logTest('SW Controller', 'pass', 'Active service worker found');
      } else {
        logTest('SW Controller', 'warn', 'No active service worker (may be first load)');
      }
      
    } else {
      logTest('SW Support', 'fail', 'Service Worker not supported in this browser');
    }
  } catch (error) {
    logTest('Service Worker', 'fail', 'Service Worker test failed', error.message);
  }
}

// Test 4: IndexedDB and Offline Storage
async function testOfflineStorage() {
  console.log('\n💾 Test 4: Offline Storage');
  console.log('-'.repeat(40));
  
  try {
    if ('indexedDB' in window) {
      logTest('IndexedDB Support', 'pass', 'IndexedDB is supported');
      
      // Test basic IndexedDB connection
      const request = indexedDB.open('PWATestDB', 1);
      
      await new Promise((resolve, reject) => {
        request.onerror = () => {
          logTest('IndexedDB Connection', 'fail', 'Failed to connect to IndexedDB');
          reject(request.error);
        };
        
        request.onsuccess = () => {
          logTest('IndexedDB Connection', 'pass', 'Successfully connected to IndexedDB');
          request.result.close();
          resolve();
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains('test')) {
            db.createObjectStore('test', { keyPath: 'id' });
          }
          logTest('IndexedDB Setup', 'pass', 'Object store created successfully');
        };
      });
      
      // Test PWA offline storage service
      if (window.PWADebugger && window.PWADebugger.PWAManager) {
        const offlineStorage = window.PWADebugger.PWAManager.getService('offlineStorage');
        if (offlineStorage) {
          logTest('PWA Storage Service', 'pass', 'Offline storage service is available');
          
          try {
            const users = await offlineStorage.getAllUsers();
            logTest('PWA Storage Data', 'pass', `Found ${users.length} stored users`, users);
          } catch (error) {
            logTest('PWA Storage Data', 'warn', 'Could not retrieve users', error.message);
          }
        } else {
          logTest('PWA Storage Service', 'warn', 'Offline storage service not available');
        }
      }
      
    } else {
      logTest('IndexedDB Support', 'fail', 'IndexedDB not supported in this browser');
    }
  } catch (error) {
    logTest('Offline Storage', 'fail', 'Offline storage test failed', error.message);
  }
}

// Test 5: Network Status
async function testNetworkStatus() {
  console.log('\n🌐 Test 5: Network Status');
  console.log('-'.repeat(40));
  
  try {
    const isOnline = navigator.onLine;
    logTest('Network Status', isOnline ? 'pass' : 'warn', `Network is ${isOnline ? 'online' : 'offline'}`);
    
    // Test network event listeners
    let onlineEventFired = false;
    let offlineEventFired = false;
    
    const onlineHandler = () => { onlineEventFired = true; };
    const offlineHandler = () => { offlineEventFired = true; };
    
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    
    logTest('Network Events', 'pass', 'Network event listeners attached');
    
    // Clean up
    setTimeout(() => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    }, 1000);
    
  } catch (error) {
    logTest('Network Status', 'fail', 'Network status test failed', error.message);
  }
}

// Test 6: Real-time Features (SocketIO)
async function testRealTimeFeatures() {
  console.log('\n🔔 Test 6: Real-time Features');
  console.log('-'.repeat(40));
  
  try {
    // Check if SocketIO is available
    if (typeof io !== 'undefined') {
      logTest('SocketIO Library', 'pass', 'Socket.IO library is available');
    } else {
      logTest('SocketIO Library', 'warn', 'Socket.IO library not found in global scope');
    }
    
    // Check for socket service
    if (window.socketService) {
      logTest('Socket Service', 'pass', 'Socket service is available');
    } else {
      logTest('Socket Service', 'warn', 'Socket service not found in global scope');
    }
    
    // Test WebSocket support
    if ('WebSocket' in window) {
      logTest('WebSocket Support', 'pass', 'WebSocket API is supported');
    } else {
      logTest('WebSocket Support', 'fail', 'WebSocket not supported in this browser');
    }
    
  } catch (error) {
    logTest('Real-time Features', 'fail', 'Real-time features test failed', error.message);
  }
}

// Test 7: PWA UI Components
async function testPWAUI() {
  console.log('\n🎨 Test 7: PWA UI Components');
  console.log('-'.repeat(40));
  
  try {
    // Check for PWA status bar
    const statusBar = document.querySelector('.navbar');
    if (statusBar) {
      logTest('PWA Status Bar', 'pass', 'PWA status bar found in DOM');
    } else {
      logTest('PWA Status Bar', 'warn', 'PWA status bar not found');
    }
    
    // Check for PWA debugger
    const debugger = document.querySelector('.box h4');
    if (debugger && debugger.textContent.includes('PWA Debugger')) {
      logTest('PWA Debugger UI', 'pass', 'PWA Debugger component found');
    } else {
      logTest('PWA Debugger UI', 'warn', 'PWA Debugger component not found');
    }
    
    // Check for notification system
    const notifications = document.querySelector('.notifications-container');
    logTest('Notification System', notifications ? 'pass' : 'info', 
      notifications ? 'Notification container found' : 'No active notifications (normal)');
    
  } catch (error) {
    logTest('PWA UI', 'fail', 'PWA UI test failed', error.message);
  }
}

// Main Test Runner
async function runAllTests() {
  console.log('🚀 Running All PWA Tests...\n');
  
  await testPWAConfiguration();
  await testPWAManager();
  await testServiceWorker();
  await testOfflineStorage();
  await testNetworkStatus();
  await testRealTimeFeatures();
  await testPWAUI();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📋 Total Tests: ${testResults.tests.length}`);
  
  const successRate = Math.round((testResults.passed / testResults.tests.length) * 100);
  console.log(`📈 Success Rate: ${successRate}%`);
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL CRITICAL TESTS PASSED! PWA is functioning correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the details above.');
  }
  
  // Return results for programmatic access
  return testResults;
}

// Auto-run tests if this script is executed
if (typeof window !== 'undefined') {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runAllTests, 2000); // Wait 2 seconds for PWA initialization
    });
  } else {
    setTimeout(runAllTests, 2000);
  }
}

// Export for manual execution
window.runPWATests = runAllTests;
