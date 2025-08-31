/**
 * Console Log Capture Script
 * 
 * Run this in the browser console at http://localhost to capture all PWA logs
 */

console.log('🎯 Console Log Capture Started');
console.log('=' .repeat(50));

// Store original console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Log storage
const capturedLogs = [];

// Enhanced logging function
function captureLog(level, args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  
  const logEntry = {
    timestamp,
    level,
    message,
    args
  };
  
  capturedLogs.push(logEntry);
  
  // Call original method
  switch (level) {
    case 'log':
      originalLog.apply(console, [`[${timestamp}]`, ...args]);
      break;
    case 'error':
      originalError.apply(console, [`[${timestamp}] ❌`, ...args]);
      break;
    case 'warn':
      originalWarn.apply(console, [`[${timestamp}] ⚠️`, ...args]);
      break;
  }
}

// Override console methods
console.log = (...args) => captureLog('log', args);
console.error = (...args) => captureLog('error', args);
console.warn = (...args) => captureLog('warn', args);

// PWA-specific log filtering
function getPWALogs() {
  return capturedLogs.filter(log => 
    log.message.includes('PWA') || 
    log.message.includes('Service Worker') ||
    log.message.includes('Offline') ||
    log.message.includes('IndexedDB') ||
    log.message.includes('🚀') ||
    log.message.includes('✅') ||
    log.message.includes('❌') ||
    log.message.includes('⚠️')
  );
}

// Display functions
function showAllLogs() {
  console.log('\n📋 ALL CAPTURED LOGS:');
  console.log('=' .repeat(50));
  capturedLogs.forEach((log, index) => {
    originalLog(`${index + 1}. [${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`);
  });
}

function showPWALogs() {
  const pwaLogs = getPWALogs();
  console.log('\n🔍 PWA-RELATED LOGS:');
  console.log('=' .repeat(50));
  pwaLogs.forEach((log, index) => {
    originalLog(`${index + 1}. [${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`);
  });
}

function showErrorLogs() {
  const errorLogs = capturedLogs.filter(log => log.level === 'error');
  console.log('\n❌ ERROR LOGS:');
  console.log('=' .repeat(50));
  errorLogs.forEach((log, index) => {
    originalError(`${index + 1}. [${log.timestamp}]: ${log.message}`);
  });
}

function clearCapturedLogs() {
  capturedLogs.length = 0;
  console.log('🗑️ Captured logs cleared');
}

function exportLogs() {
  const logText = capturedLogs.map(log => 
    `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`
  ).join('\n');
  
  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pwa-console-logs-${new Date().toISOString().slice(0,19)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('💾 Logs exported to file');
}

// PWA Status Check
async function checkPWAStatus() {
  console.log('\n🔍 CHECKING PWA STATUS:');
  console.log('=' .repeat(30));
  
  try {
    // Check if PWADebugger is available
    if (typeof window.PWADebugger !== 'undefined') {
      console.log('✅ PWADebugger available');
      
      const status = window.PWADebugger.getPWAStatus();
      console.log('📊 PWA Manager Status:', status);
      
      const config = window.PWADebugger.getCurrentConfig();
      console.log('📋 PWA Configuration:', config);
      
      // Check services
      if (status.services && status.services.length > 0) {
        console.log('🔧 Active Services:', status.services);
      } else {
        console.log('⚠️ No active services found');
      }
      
    } else {
      console.log('❌ PWADebugger not available');
    }
    
    // Check Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`🔧 Service Worker Registrations: ${registrations.length}`);
      registrations.forEach(reg => console.log(`  - ${reg.scope}`));
    }
    
    // Check IndexedDB
    if ('indexedDB' in window) {
      console.log('💾 IndexedDB supported');
      
      // Try to open the app database
      try {
        const request = indexedDB.open('testdriven-app', 1);
        await new Promise((resolve, reject) => {
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            console.log('📦 App Database:', {
              name: db.name,
              version: db.version,
              stores: Array.from(db.objectStoreNames)
            });
            db.close();
            resolve();
          };
        });
      } catch (error) {
        console.log('❌ Database check failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ PWA status check failed:', error);
  }
}

// Force PWA reinitialization
async function forcePWAInit() {
  console.log('\n🔄 FORCING PWA REINITIALIZATION:');
  console.log('=' .repeat(40));
  
  try {
    if (window.PWADebugger && window.PWADebugger.PWAManager) {
      const PWAManager = window.PWADebugger.PWAManager;
      const config = window.PWADebugger.getCurrentConfig();
      
      console.log('🔧 Reinitializing PWA Manager...');
      await PWAManager.initialize(config);
      
      const status = PWAManager.getStatus();
      console.log('📊 New PWA Status:', status);
      
    } else {
      console.log('❌ PWA Manager not accessible');
    }
  } catch (error) {
    console.error('❌ PWA reinitialization failed:', error);
  }
}

// Make functions available globally
window.logCapture = {
  showAllLogs,
  showPWALogs,
  showErrorLogs,
  clearCapturedLogs,
  exportLogs,
  checkPWAStatus,
  forcePWAInit,
  getCapturedLogs: () => capturedLogs,
  getPWALogs
};

console.log('🛠️ Console Log Capture Ready!');
console.log('Available commands:');
console.log('  - logCapture.showAllLogs() - Show all captured logs');
console.log('  - logCapture.showPWALogs() - Show PWA-related logs only');
console.log('  - logCapture.showErrorLogs() - Show error logs only');
console.log('  - logCapture.checkPWAStatus() - Check current PWA status');
console.log('  - logCapture.forcePWAInit() - Force PWA reinitialization');
console.log('  - logCapture.exportLogs() - Export logs to file');
console.log('');
console.log('🎯 Now refresh the page to capture PWA initialization logs...');

// Auto-check PWA status after a delay
setTimeout(() => {
  console.log('\n🔍 Auto-checking PWA status...');
  checkPWAStatus();
}, 3000);
