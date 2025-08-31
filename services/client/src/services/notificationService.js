// Push Notification Service
class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    this.permission = this.isSupported ? Notification.permission : 'denied';
    this.registration = null;
    this.subscription = null;
    
    this.notificationQueue = [];
    this.isInitialized = false;
  }

  // Initialize push notifications
  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;
      
      // Request permission if needed
      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission();
      }

      if (this.permission === 'granted') {
        await this.setupPushSubscription();
        this.isInitialized = true;
        console.log('✅ Push notifications initialized');
        
        // Process queued notifications
        this.processNotificationQueue();
        return true;
      } else {
        console.warn('Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Setup push subscription
  async setupPushSubscription() {
    try {
      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (!this.subscription) {
        // Create new subscription
        const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 
          'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9f8HtLlVLVWjbzgSjN6QjvOUHBmcfBo3UYdGd-Rqvr_7LdVPp2lA'; // Demo key
        
        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
        });
        
        console.log('📱 Push subscription created');
      }
    } catch (error) {
      console.error('Failed to setup push subscription:', error);
    }
  }

  // Send local notification
  async sendNotification(title, options = {}) {
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return;
    }

    if (this.permission !== 'granted') {
      // Queue notification for later
      this.notificationQueue.push({ title, options });
      
      if (!this.isInitialized) {
        await this.initialize();
      }
      return;
    }

    const defaultOptions = {
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'testdriven-app',
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      if (this.registration) {
        // Use service worker for better reliability
        await this.registration.showNotification(title, defaultOptions);
      } else {
        // Fallback to regular notification
        new Notification(title, defaultOptions);
      }
      
      console.log('📬 Notification sent:', title);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  // Sync status notifications
  async notifySyncStart() {
    await this.sendNotification('🔄 Syncing Data', {
      body: 'Synchronizing your offline changes with the server...',
      tag: 'sync-status',
      silent: true
    });
  }

  async notifySyncComplete(syncedCount = 0) {
    await this.sendNotification('✅ Sync Complete', {
      body: `Successfully synced ${syncedCount} item${syncedCount !== 1 ? 's' : ''}`,
      tag: 'sync-status',
      requireInteraction: false
    });
  }

  async notifySyncError(error) {
    await this.sendNotification('❌ Sync Failed', {
      body: `Sync failed: ${error.message || 'Unknown error'}`,
      tag: 'sync-error',
      requireInteraction: true
    });
  }

  // Conflict notifications
  async notifyConflict(conflictCount = 1) {
    await this.sendNotification('⚠️ Data Conflict', {
      body: `${conflictCount} data conflict${conflictCount > 1 ? 's' : ''} need${conflictCount === 1 ? 's' : ''} your attention`,
      tag: 'conflict',
      requireInteraction: true,
      actions: [
        {
          action: 'resolve',
          title: 'Resolve Now'
        },
        {
          action: 'later',
          title: 'Later'
        }
      ]
    });
  }

  // Network status notifications
  async notifyOnline() {
    await this.sendNotification('🌐 Back Online', {
      body: 'Internet connection restored. Syncing your data...',
      tag: 'network-status',
      silent: false
    });
  }

  async notifyOffline() {
    await this.sendNotification('📵 Gone Offline', {
      body: 'No internet connection. Your changes will be saved locally.',
      tag: 'network-status',
      silent: false
    });
  }

  // User action notifications
  async notifyUserAdded(username) {
    await this.sendNotification('👤 User Added', {
      body: `${username} has been added successfully`,
      tag: 'user-action',
      silent: true
    });
  }

  async notifyUserUpdated(username) {
    await this.sendNotification('✏️ User Updated', {
      body: `${username} has been updated successfully`,
      tag: 'user-action',
      silent: true
    });
  }

  async notifyUserDeleted(username) {
    await this.sendNotification('🗑️ User Deleted', {
      body: `${username} has been deleted successfully`,
      tag: 'user-action',
      silent: true
    });
  }

  // Background sync notifications
  async notifyBackgroundSync() {
    await this.sendNotification('🔄 Background Sync', {
      body: 'Syncing your offline changes in the background...',
      tag: 'background-sync',
      silent: true
    });
  }

  // Process queued notifications
  async processNotificationQueue() {
    while (this.notificationQueue.length > 0) {
      const { title, options } = this.notificationQueue.shift();
      await this.sendNotification(title, options);
    }
  }

  // Request permission
  async requestPermission() {
    if (!this.isSupported) return false;
    
    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  // Check if notifications are enabled
  isEnabled() {
    return this.isSupported && this.permission === 'granted';
  }

  // Get notification permission status
  getPermissionStatus() {
    return this.permission;
  }

  // Utility: Convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Clear all notifications with specific tag
  async clearNotifications(tag) {
    if (this.registration) {
      const notifications = await this.registration.getNotifications({ tag });
      notifications.forEach(notification => notification.close());
    }
  }

  // Get active notifications
  async getActiveNotifications() {
    if (this.registration) {
      return await this.registration.getNotifications();
    }
    return [];
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
