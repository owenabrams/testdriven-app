/**
 * PWA Service Factory
 * 
 * Professional service factory that ensures all PWA services
 * have consistent interfaces and proper error handling
 */

class PWAServiceFactory {
  constructor() {
    this.services = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all PWA services based on configuration
   */
  async initialize(config) {
    console.log('🏭 PWA Service Factory initializing...');
    
    try {
      // Clear existing services
      this.services.clear();
      
      // Initialize services based on config
      if (config.serviceWorker) {
        await this.initializeServiceWorker();
      }
      
      if (config.offlineStorage) {
        await this.initializeOfflineStorage();
      }
      
      if (config.backgroundSync) {
        await this.initializeBackgroundSync();
      }
      
      if (config.pushNotifications) {
        await this.initializePushNotifications();
      }
      
      this.initialized = true;
      console.log('✅ PWA Service Factory initialized successfully');
      console.log('📋 Active services:', Array.from(this.services.keys()));
      
      return true;
      
    } catch (error) {
      console.error('❌ PWA Service Factory initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Initialize Service Worker
   */
  async initializeServiceWorker() {
    try {
      console.log('🔧 Initializing Service Worker...');
      
      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker not supported');
        return;
      }

      // Import service worker manager
      const { default: swManager } = await import('../utils/serviceWorkerManager');
      
      // Register service worker
      const registration = await swManager.register('/sw-safe.js');
      
      if (registration) {
        this.services.set('serviceWorker', registration);
        this.services.set('serviceWorkerManager', swManager);
        console.log('✅ Service Worker initialized');
      } else {
        throw new Error('Service Worker registration failed');
      }
      
    } catch (error) {
      console.error('❌ Service Worker initialization failed:', error);
      // Don't throw - allow app to continue without service worker
      console.log('📱 Continuing without service worker...');
    }
  }

  /**
   * Initialize Offline Storage
   */
  async initializeOfflineStorage() {
    try {
      console.log('💾 Initializing Offline Storage...');
      
      // Import offline storage service
      const { default: offlineStorage } = await import('../services/offlineStorage');
      
      // Ensure the service has an init method
      if (typeof offlineStorage.init !== 'function') {
        throw new Error('Offline storage service missing init() method');
      }
      
      // Initialize the service
      await offlineStorage.init();
      
      // Verify initialization
      if (!offlineStorage.isInitialized()) {
        throw new Error('Offline storage failed to initialize properly');
      }
      
      this.services.set('offlineStorage', offlineStorage);
      console.log('✅ Offline Storage initialized');
      
    } catch (error) {
      console.error('❌ Offline Storage initialization failed:', error);
      throw error; // This is critical, so throw
    }
  }

  /**
   * Initialize Background Sync
   */
  async initializeBackgroundSync() {
    try {
      console.log('🔄 Initializing Background Sync...');
      
      const { default: syncService } = await import('../services/syncService');
      
      // Initialize if method exists
      if (typeof syncService.init === 'function') {
        await syncService.init();
      }
      
      this.services.set('syncService', syncService);
      console.log('✅ Background Sync initialized');
      
    } catch (error) {
      console.error('❌ Background Sync initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize Push Notifications
   */
  async initializePushNotifications() {
    try {
      console.log('🔔 Initializing Push Notifications...');
      
      const { default: notificationService } = await import('../services/notificationService');
      
      // Initialize if method exists
      if (typeof notificationService.initialize === 'function') {
        const initialized = await notificationService.initialize();
        if (!initialized) {
          throw new Error('Push notifications initialization returned false');
        }
      }
      
      this.services.set('notificationService', notificationService);
      console.log('✅ Push Notifications initialized');
      
    } catch (error) {
      console.error('❌ Push Notifications initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get a service by name
   */
  getService(serviceName) {
    if (!this.initialized) {
      console.warn('⚠️ PWA Service Factory not initialized yet');
      return null;
    }
    
    return this.services.get(serviceName) || null;
  }

  /**
   * Check if a service is available
   */
  hasService(serviceName) {
    return this.services.has(serviceName);
  }

  /**
   * Get all service names
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Get factory status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      serviceCount: this.services.size,
      services: this.getServiceNames()
    };
  }

  /**
   * Shutdown all services
   */
  async shutdown() {
    console.log('🛑 Shutting down PWA services...');
    
    for (const [name, service] of this.services) {
      try {
        if (service && typeof service.shutdown === 'function') {
          await service.shutdown();
          console.log(`✅ ${name} shut down`);
        }
      } catch (error) {
        console.error(`❌ Error shutting down ${name}:`, error);
      }
    }
    
    this.services.clear();
    this.initialized = false;
    console.log('✅ PWA Service Factory shut down');
  }
}

// Export singleton instance
export default new PWAServiceFactory();
