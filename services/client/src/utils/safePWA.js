/**
 * Safe PWA Integration
 * 
 * This module provides safe, non-blocking PWA features that won't break the app
 * if they fail. The app works perfectly without PWA, and PWA features are
 * purely additive enhancements.
 */

class SafePWA {
  constructor() {
    this.isEnabled = false;
    this.features = {
      serviceWorker: false,
      offlineStorage: false,
      notifications: false
    };
    this.debug = process.env.NODE_ENV === 'development';
  }

  /**
   * Initialize PWA features safely - never throws errors
   */
  async initialize(options = {}) {
    try {
      console.log('🔍 SafePWA: Checking PWA support...', options);
      this.log('🔍 Checking PWA support...');

      // Only enable PWA if explicitly requested AND supported
      if (!options.enable) {
        console.log('📱 SafePWA: PWA disabled by configuration');
        this.log('📱 PWA disabled by configuration');
        return { success: true, message: 'PWA disabled', features: this.features };
      }

      const isSupported = this.isPWASupported();
      console.log('🔍 SafePWA: Browser support check:', isSupported);

      if (!isSupported) {
        console.log('⚠️ SafePWA: PWA not supported in this browser');
        this.log('⚠️ PWA not supported in this browser');
        return { success: true, message: 'PWA not supported', features: this.features };
      }

      console.log('🔧 SafePWA: Starting feature initialization...');

      // Try to enable service worker
      if (options.serviceWorker) {
        console.log('🔧 SafePWA: Enabling service worker...');
        await this.enableServiceWorker();
        console.log('🔧 SafePWA: Service worker result:', this.features.serviceWorker);
      }

      // Try to enable offline storage
      if (options.offlineStorage) {
        console.log('🔧 SafePWA: Enabling offline storage...');
        await this.enableOfflineStorage();
        console.log('🔧 SafePWA: Offline storage result:', this.features.offlineStorage);
      }

      // Try to enable notifications
      if (options.notifications) {
        console.log('🔧 SafePWA: Enabling notifications...');
        await this.enableNotifications();
        console.log('🔧 SafePWA: Notifications result:', this.features.notifications);
      }

      this.isEnabled = Object.values(this.features).some(enabled => enabled);

      console.log(`✅ SafePWA: Initialization complete. Features:`, this.features);
      console.log(`✅ SafePWA: Is enabled:`, this.isEnabled);
      this.log(`✅ PWA initialization complete. Features: ${JSON.stringify(this.features)}`);
      return {
        success: true,
        message: 'PWA initialized',
        features: this.features
      };

    } catch (error) {
      console.warn('PWA initialization failed, continuing without PWA:', error);
      return { 
        success: true, 
        message: 'App running without PWA features',
        error: error.message 
      };
    }
  }

  /**
   * Check if PWA features are supported
   */
  isPWASupported() {
    return (
      'serviceWorker' in navigator &&
      'caches' in window &&
      'indexedDB' in window
    );
  }

  /**
   * Safely enable service worker
   */
  async enableServiceWorker() {
    try {
      console.log('🔧 SafePWA: Checking service worker file...');
      // Check if service worker file exists
      const swResponse = await fetch('/sw.js', { method: 'HEAD' });
      if (!swResponse.ok) {
        console.log('📄 SafePWA: No service worker file found, skipping');
        this.log('📄 No service worker file found, skipping');
        return;
      }
      console.log('📄 SafePWA: Service worker file found');

      // Test the service worker by fetching it
      const swContent = await fetch('/sw.js').then(r => r.text());
      console.log('📄 SafePWA: Service worker content loaded, length:', swContent.length);

      // Basic safety check - look for common problematic patterns
      const problematicPatterns = [
        /CACHE_NAME(?!\s*=)/,  // CACHE_NAME used but not defined
        /undefined\./,          // undefined.something
        /null\./,              // null.something
      ];

      for (let pattern of problematicPatterns) {
        if (pattern.test(swContent)) {
          console.warn('⚠️ SafePWA: Potentially problematic service worker detected, skipping');
          return;
        }
      }
      console.log('📄 SafePWA: Service worker safety checks passed');

      // Register service worker
      console.log('📄 SafePWA: Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('📄 SafePWA: Service worker registered:', registration);

      // Add error handler
      registration.addEventListener('error', (error) => {
        console.warn('Service worker error, unregistering:', error);
        registration.unregister();
      });

      this.features.serviceWorker = true;
      console.log('✅ SafePWA: Service worker enabled successfully');
      this.log('✅ Service worker registered safely');

    } catch (error) {
      console.error('⚠️ SafePWA: Service worker registration failed:', error);
      this.log('⚠️ Service worker registration failed:', error.message);
      // Don't throw - just continue without service worker
    }
  }

  /**
   * Safely enable offline storage
   */
  async enableOfflineStorage() {
    try {
      console.log('🔧 SafePWA: Importing offline storage service...');
      // Import and initialize the offline storage service
      const { default: offlineStorage } = await import('../services/offlineStorage');
      console.log('🔧 SafePWA: Offline storage service imported');

      // Test the storage by trying to get users
      console.log('🔧 SafePWA: Testing offline storage...');
      const testUsers = await offlineStorage.getAllUsers();
      console.log('🔧 SafePWA: Offline storage test successful, users:', testUsers.length);

      this.services.offlineStorage = offlineStorage;
      this.features.offlineStorage = true;
      console.log('✅ SafePWA: Offline storage enabled successfully');
      this.log('✅ Offline storage enabled');

    } catch (error) {
      console.error('⚠️ SafePWA: Offline storage not available:', error);
      this.log('⚠️ Offline storage not available:', error.message);
    }
  }

  /**
   * Safely enable notifications
   */
  async enableNotifications() {
    try {
      if (!('Notification' in window)) {
        this.log('⚠️ Notifications not supported');
        return;
      }

      if (Notification.permission === 'granted') {
        this.features.notifications = true;
        this.log('✅ Notifications enabled');
      } else if (Notification.permission !== 'denied') {
        // Don't auto-request permission - let the app decide when
        this.log('📝 Notifications available (permission not requested)');
      }

    } catch (error) {
      this.log('⚠️ Notifications setup failed:', error.message);
    }
  }

  /**
   * Request notification permission safely
   */
  async requestNotificationPermission() {
    try {
      if (!('Notification' in window)) {
        return false;
      }

      const permission = await Notification.requestPermission();
      this.features.notifications = permission === 'granted';
      return this.features.notifications;

    } catch (error) {
      this.log('⚠️ Notification permission request failed:', error.message);
      return false;
    }
  }

  /**
   * Show notification safely
   */
  async showNotification(title, options = {}) {
    try {
      if (!this.features.notifications) {
        this.log('📱 Notifications not available, showing console message instead');
        console.log(`Notification: ${title}`, options.body);
        return;
      }

      new Notification(title, options);

    } catch (error) {
      this.log('⚠️ Failed to show notification:', error.message);
      // Fallback to console
      console.log(`Notification: ${title}`, options.body);
    }
  }

  /**
   * Get PWA status
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      supported: this.isPWASupported(),
      features: this.features,
      services: Object.keys(this.services)
    };
  }

  /**
   * Get a specific service if available
   */
  getService(serviceName) {
    return this.services[serviceName] || null;
  }

  /**
   * Emergency cleanup - removes all PWA features
   */
  async emergencyCleanup() {
    try {
      this.log('🚨 Emergency PWA cleanup...');

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // Clear caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      this.features = { serviceWorker: false, offlineStorage: false, notifications: false };
      this.isEnabled = false;

      this.log('✅ Emergency cleanup complete');
      return true;

    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return false;
    }
  }

  /**
   * Safe logging
   */
  log(message, ...args) {
    if (this.debug) {
      console.log(`[SafePWA] ${message}`, ...args);
    }
  }
}

// Export singleton
const safePWAInstance = new SafePWA();
export default safePWAInstance;
