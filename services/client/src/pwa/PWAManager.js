/**
 * PWA Manager - Professional Progressive Web App Manager
 *
 * This manager provides a robust, production-ready PWA implementation
 * with proper error handling and service management.
 */

class PWAManager {
  constructor() {
    this.features = {
      serviceWorker: false,
      offlineStorage: false,
      backgroundSync: false,
      pushNotifications: false,
      offlineAuth: false,
      conflictResolution: false,
      advancedCaching: false,
      batchSync: false
    };

    this.services = {};
    this.initialized = false;
  }

  /**
   * Initialize PWA features based on configuration
   */
  async initialize(config = {}) {
    console.log('🚀 PWA Manager initializing...');
    console.log('📥 Received config:', config);
    console.log('🔧 Current features before merge:', this.features);

    // Merge config with defaults
    this.features = { ...this.features, ...config };
    console.log('✅ Features after merge:', this.features);

    try {
      // Initialize services directly
      if (this.features.offlineStorage) {
        await this.initOfflineStorage();
      }

      if (this.features.serviceWorker) {
        await this.initServiceWorker();
      }

      this.initialized = true;
      console.log('✅ PWA Manager initialized successfully');
      console.log('📱 Enabled features:', Object.keys(this.features).filter(key => this.features[key]));
      console.log('🔧 Active services:', Object.keys(this.services));

    } catch (error) {
      console.error('❌ PWA Manager initialization failed:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        features: this.features
      });
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Initialize Service Worker
   */
  async initServiceWorker() {
    try {
      console.log('🔧 Initializing Service Worker...');

      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker not supported');
        return;
      }

      const { default: swManager } = await import('../utils/serviceWorkerManager');
      const registration = await swManager.register('/sw-safe.js');

      if (registration) {
        this.services.serviceWorker = registration;
        this.services.serviceWorkerManager = swManager;
        console.log('✅ Service Worker initialized');
      }
    } catch (error) {
      console.error('❌ Service Worker initialization failed:', error);
      // Don't throw - allow app to continue
    }
  }

  /**
   * Offline Storage initialization
   */
  async initOfflineStorage() {
    try {
      console.log('🔍 Importing offline storage service...');
      const { offlineStorage } = await import('../services/offlineStorage');

      console.log('🔧 Initializing offline storage...');
      await offlineStorage.init();

      this.services.offlineStorage = offlineStorage;
      console.log('✅ Offline Storage initialized successfully');

      // Test basic functionality
      const testUsers = await offlineStorage.getAllUsers();
      console.log(`📦 Found ${testUsers.length} existing users in offline storage`);

    } catch (error) {
      console.error('❌ Offline Storage initialization failed:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Background Sync initialization
   */
  async initBackgroundSync() {
    try {
      const { default: syncService } = await import('../services/syncService');
      this.services.syncService = syncService;
      console.log('✅ Background Sync initialized');
    } catch (error) {
      console.error('❌ Background Sync initialization failed:', error);
      throw error;
    }
  }

  /**
   * Push Notifications initialization
   */
  async initPushNotifications() {
    try {
      const { default: notificationService } = await import('../services/notificationService');
      const initialized = await notificationService.initialize();
      if (initialized) {
        this.services.notificationService = notificationService;
        console.log('✅ Push Notifications initialized');
      }
    } catch (error) {
      console.error('❌ Push Notifications initialization failed:', error);
      throw error;
    }
  }

  /**
   * Offline Auth initialization
   */
  async initOfflineAuth() {
    try {
      const { default: offlineAuthService } = await import('../services/offlineAuthService');
      this.services.offlineAuthService = offlineAuthService;
      console.log('✅ Offline Auth initialized');
    } catch (error) {
      console.error('❌ Offline Auth initialization failed:', error);
      throw error;
    }
  }

  /**
   * Conflict Resolution initialization
   */
  async initConflictResolution() {
    try {
      const { default: conflictResolver } = await import('../services/conflictResolver');
      this.services.conflictResolver = conflictResolver;
      console.log('✅ Conflict Resolution initialized');
    } catch (error) {
      console.error('❌ Conflict Resolution initialization failed:', error);
      throw error;
    }
  }

  /**
   * Advanced Caching initialization
   */
  async initAdvancedCaching() {
    try {
      const { default: cacheService } = await import('../services/cacheService');
      this.services.cacheService = cacheService;
      console.log('✅ Advanced Caching initialized');
    } catch (error) {
      console.error('❌ Advanced Caching initialization failed:', error);
      throw error;
    }
  }

  /**
   * Batch Sync initialization
   */
  async initBatchSync() {
    try {
      const { default: batchSyncService } = await import('../services/batchSyncService');
      this.services.batchSyncService = batchSyncService;
      console.log('✅ Batch Sync initialized');
    } catch (error) {
      console.error('❌ Batch Sync initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get a service if it's enabled and initialized
   */
  getService(serviceName) {
    if (!this.initialized) {
      console.warn('⚠️ PWA Manager not initialized yet');
      return null;
    }

    return this.services[serviceName] || null;
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(featureName) {
    return this.features[featureName] || false;
  }

  /**
   * Get status of all features
   */
  getStatus() {
    return {
      initialized: this.initialized,
      features: this.features,
      services: Object.keys(this.services)
    };
  }

  /**
   * Shutdown PWA Manager
   */
  async shutdown() {
    console.log('🛑 PWA Manager shutting down...');

    try {
      await this.serviceFactory.shutdown();
      this.initialized = false;
      console.log('✅ PWA Manager shut down successfully');
    } catch (error) {
      console.error('❌ PWA Manager shutdown failed:', error);
    }
  }
}

// Export singleton instance
export default new PWAManager();
