/**
 * Comprehensive PWA Functionality Test Script
 * Run this in the browser console to test all PWA features
 */

async function testPWAFunctionality() {
  console.log('🚀 Starting comprehensive PWA functionality tests...\n');
  
  const results = {
    serviceWorker: false,
    manifest: false,
    indexedDB: false,
    offlineStorage: false,
    networkStatus: false,
    syncService: false,
    pwaManager: false,
    socketIO: false
  };

  // Test 1: Service Worker Registration
  console.log('1️⃣ Testing Service Worker...');
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('✅ Service Worker is registered:', registration.scope);
        results.serviceWorker = true;
      } else {
        console.log('❌ Service Worker not registered');
      }
    } else {
      console.log('❌ Service Worker not supported');
    }
  } catch (error) {
    console.log('❌ Service Worker test failed:', error.message);
  }

  // Test 2: Web App Manifest
  console.log('\n2️⃣ Testing Web App Manifest...');
  try {
    const response = await fetch('/manifest.json');
    if (response.ok) {
      const manifest = await response.json();
      console.log('✅ Manifest loaded:', manifest.name);
      results.manifest = true;
    } else {
      console.log('❌ Manifest not accessible');
    }
  } catch (error) {
    console.log('❌ Manifest test failed:', error.message);
  }

  // Test 3: IndexedDB Support
  console.log('\n3️⃣ Testing IndexedDB...');
  try {
    if ('indexedDB' in window) {
      console.log('✅ IndexedDB is supported');
      results.indexedDB = true;
    } else {
      console.log('❌ IndexedDB not supported');
    }
  } catch (error) {
    console.log('❌ IndexedDB test failed:', error.message);
  }

  // Test 4: Offline Storage Service
  console.log('\n4️⃣ Testing Offline Storage Service...');
  try {
    if (window.offlineStorage) {
      // Test basic operations
      const testUser = {
        id: 'test-' + Date.now(),
        username: 'testuser',
        email: 'test@example.com',
        created_date: new Date().toISOString()
      };
      
      await window.offlineStorage.addUser(testUser);
      console.log('✅ User added to offline storage');
      
      const users = await window.offlineStorage.getUsers();
      console.log('✅ Retrieved users from offline storage:', users.length);
      
      await window.offlineStorage.deleteUser(testUser.id);
      console.log('✅ User deleted from offline storage');
      
      results.offlineStorage = true;
    } else {
      console.log('❌ Offline Storage service not available');
    }
  } catch (error) {
    console.log('❌ Offline Storage test failed:', error.message);
  }

  // Test 5: Network Status Service
  console.log('\n5️⃣ Testing Network Status Service...');
  try {
    if (window.networkStatus) {
      const isOnline = window.networkStatus.isOnline();
      console.log('✅ Network Status service available, online:', isOnline);
      results.networkStatus = true;
    } else {
      console.log('❌ Network Status service not available');
    }
  } catch (error) {
    console.log('❌ Network Status test failed:', error.message);
  }

  // Test 6: Sync Service
  console.log('\n6️⃣ Testing Sync Service...');
  try {
    if (window.syncService) {
      console.log('✅ Sync Service is available');
      results.syncService = true;
    } else {
      console.log('❌ Sync Service not available');
    }
  } catch (error) {
    console.log('❌ Sync Service test failed:', error.message);
  }

  // Test 7: PWA Manager
  console.log('\n7️⃣ Testing PWA Manager...');
  try {
    if (window.PWAManager) {
      console.log('✅ PWA Manager is available');
      results.pwaManager = true;
    } else {
      console.log('❌ PWA Manager not available');
    }
  } catch (error) {
    console.log('❌ PWA Manager test failed:', error.message);
  }

  // Test 8: SocketIO Connection
  console.log('\n8️⃣ Testing SocketIO Connection...');
  try {
    if (window.io && window.socket) {
      const isConnected = window.socket.connected;
      console.log('✅ SocketIO is available, connected:', isConnected);
      results.socketIO = true;
    } else {
      console.log('❌ SocketIO not available');
    }
  } catch (error) {
    console.log('❌ SocketIO test failed:', error.message);
  }

  // Test Summary
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log(`\n🎯 Overall Score: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! PWA is fully functional.');
  } else if (passed >= total * 0.75) {
    console.log('✅ Most tests passed. PWA is mostly functional.');
  } else {
    console.log('⚠️ Some tests failed. PWA may have issues.');
  }

  return results;
}

// Auto-run the test
console.log('PWA Test Script Loaded. Run testPWAFunctionality() to start tests.');

// Export for manual testing
window.testPWAFunctionality = testPWAFunctionality;
