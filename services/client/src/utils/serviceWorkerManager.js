/**
 * Service Worker Manager - Safe PWA Management
 * 
 * This utility provides safe service worker registration/unregistration
 * with proper error handling and fallback mechanisms.
 */

class ServiceWorkerManager {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
    this.registrations = [];
    this.debug = process.env.NODE_ENV === 'development';
  }

  /**
   * Safely register a service worker with error handling
   */
  async register(swPath = '/sw.js', options = {}) {
    if (!this.isSupported) {
      this.log('Service Worker not supported in this browser');
      return null;
    }

    try {
      // Check if service worker file exists first
      const response = await fetch(swPath, { method: 'HEAD' });
      if (!response.ok) {
        this.log(`Service worker file not found: ${swPath}`);
        return null;
      }

      const registration = await navigator.serviceWorker.register(swPath, options);
      this.registrations.push(registration);
      
      this.log(`Service worker registered: ${registration.scope}`);
      
      // Add error handling for the service worker
      registration.addEventListener('error', (error) => {
        console.error('Service Worker error:', error);
        this.handleServiceWorkerError(registration, error);
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      this.handleRegistrationError(error);
      return null;
    }
  }

  /**
   * Safely unregister all service workers
   */
  async unregisterAll() {
    if (!this.isSupported) {
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const unregisterPromises = registrations.map(registration => {
        this.log(`Unregistering service worker: ${registration.scope}`);
        return registration.unregister();
      });
      
      await Promise.all(unregisterPromises);
      this.registrations = [];
      this.log('All service workers unregistered');
    } catch (error) {
      console.error('Failed to unregister service workers:', error);
    }
  }

  /**
   * Clear all caches safely
   */
  async clearAllCaches() {
    if (!('caches' in window)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      const deletePromises = cacheNames.map(cacheName => {
        this.log(`Deleting cache: ${cacheName}`);
        return caches.delete(cacheName);
      });
      
      await Promise.all(deletePromises);
      this.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }

  /**
   * Handle service worker errors by unregistering problematic workers
   */
  async handleServiceWorkerError(registration, error) {
    console.warn('Service worker error detected, unregistering:', error);
    
    try {
      await registration.unregister();
      this.log('Problematic service worker unregistered');
    } catch (unregisterError) {
      console.error('Failed to unregister problematic service worker:', unregisterError);
    }
  }

  /**
   * Handle registration errors
   */
  handleRegistrationError(error) {
    // If registration fails due to script errors, clear everything
    if (error.message.includes('script') || error.message.includes('syntax')) {
      console.warn('Service worker script error detected, clearing all service workers');
      this.unregisterAll();
      this.clearAllCaches();
    }
  }

  /**
   * Check if service workers are causing issues
   */
  async healthCheck() {
    if (!this.isSupported) {
      return { healthy: true, reason: 'Service workers not supported' };
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      // Check if any service workers are in error state
      for (let registration of registrations) {
        if (registration.installing && registration.installing.state === 'redundant') {
          return { healthy: false, reason: 'Service worker in redundant state' };
        }
      }
      
      return { healthy: true, registrations: registrations.length };
    } catch (error) {
      return { healthy: false, reason: error.message };
    }
  }

  /**
   * Emergency cleanup - use when app won't load
   */
  async emergencyCleanup() {
    this.log('🚨 Emergency cleanup initiated');
    
    try {
      await this.unregisterAll();
      await this.clearAllCaches();
      
      // Clear storage as well
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
      
      this.log('✅ Emergency cleanup completed');
      return true;
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return false;
    }
  }

  /**
   * Safe logging
   */
  log(message) {
    if (this.debug) {
      console.log(`[SW Manager] ${message}`);
    }
  }
}

// Export singleton instance
export default new ServiceWorkerManager();
