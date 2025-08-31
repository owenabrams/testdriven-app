import networkStatus from './networkStatus';
import syncService from './syncService';
import notificationService from './notificationService';

// Background Sync Service with intelligent retry logic
class BackgroundSyncService {
  constructor() {
    this.isRunning = false;
    this.syncQueue = [];
    this.retryQueue = [];
    this.syncInterval = null;
    this.retryTimeouts = new Map();
    
    // Configuration
    this.config = {
      syncInterval: 30000, // 30 seconds
      maxRetries: 5,
      baseRetryDelay: 1000, // 1 second
      maxRetryDelay: 300000, // 5 minutes
      backoffMultiplier: 2,
      batchSize: 10,
      priorityThreshold: 3 // High priority items get processed first
    };
    
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      retriedSyncs: 0,
      lastSyncTime: null,
      averageSyncTime: 0
    };
    
    this.initialize();
  }

  initialize() {
    // Start background sync when online
    this.networkUnsubscribe = networkStatus.subscribe((isOnline) => {
      if (isOnline) {
        this.startBackgroundSync();
      } else {
        this.stopBackgroundSync();
      }
    });
    
    // Start immediately if online
    if (networkStatus.getStatus()) {
      this.startBackgroundSync();
    }
    
    console.log('🔄 Background sync service initialized');
  }

  // Start background sync
  startBackgroundSync() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Starting background sync');
    
    // Immediate sync
    this.performSync();
    
    // Set up interval
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.config.syncInterval);
    
    // Process retry queue
    this.processRetryQueue();
  }

  // Stop background sync
  stopBackgroundSync() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    console.log('⏹️ Stopping background sync');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Clear retry timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
  }

  // Perform sync operation
  async performSync() {
    if (!networkStatus.getStatus()) {
      console.log('📵 Skipping sync - offline');
      return;
    }

    const startTime = Date.now();
    this.syncStats.totalSyncs++;
    
    try {
      console.log('🔄 Performing background sync...');
      
      // Perform the actual sync
      const result = await syncService.syncAll();
      
      // Update stats
      const syncTime = Date.now() - startTime;
      this.syncStats.successfulSyncs++;
      this.syncStats.lastSyncTime = new Date().toISOString();
      this.updateAverageSyncTime(syncTime);
      
      console.log(`✅ Background sync completed in ${syncTime}ms`);
      
      // Notify if significant changes were synced
      if (result && result.syncedCount > 0) {
        await notificationService.notifyBackgroundSync();
      }
      
    } catch (error) {
      console.error('❌ Background sync failed:', error);
      this.syncStats.failedSyncs++;
      
      // Add to retry queue with exponential backoff
      this.addToRetryQueue({
        operation: 'FULL_SYNC',
        error: error.message,
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  }

  // Add operation to retry queue
  addToRetryQueue(operation) {
    if (operation.retryCount >= this.config.maxRetries) {
      console.warn('🚫 Max retries reached for operation:', operation);
      return;
    }
    
    this.retryQueue.push(operation);
    this.scheduleRetry(operation);
  }

  // Schedule retry with exponential backoff
  scheduleRetry(operation) {
    const delay = this.calculateRetryDelay(operation.retryCount);
    const retryId = `${operation.operation}_${operation.timestamp}`;
    
    console.log(`⏰ Scheduling retry for ${operation.operation} in ${delay}ms (attempt ${operation.retryCount + 1})`);
    
    const timeout = setTimeout(async () => {
      await this.executeRetry(operation);
      this.retryTimeouts.delete(retryId);
    }, delay);
    
    this.retryTimeouts.set(retryId, timeout);
  }

  // Calculate retry delay with exponential backoff
  calculateRetryDelay(retryCount) {
    const delay = this.config.baseRetryDelay * Math.pow(this.config.backoffMultiplier, retryCount);
    return Math.min(delay, this.config.maxRetryDelay);
  }

  // Execute retry operation
  async executeRetry(operation) {
    if (!networkStatus.getStatus()) {
      // Reschedule if still offline
      this.scheduleRetry(operation);
      return;
    }
    
    console.log(`🔄 Retrying operation: ${operation.operation} (attempt ${operation.retryCount + 1})`);
    
    try {
      switch (operation.operation) {
        case 'FULL_SYNC':
          await syncService.syncAll();
          break;
        case 'PARTIAL_SYNC':
          await this.performPartialSync(operation.data);
          break;
        default:
          console.warn('Unknown retry operation:', operation.operation);
          return;
      }
      
      console.log(`✅ Retry successful for: ${operation.operation}`);
      this.syncStats.retriedSyncs++;
      
      // Remove from retry queue
      this.retryQueue = this.retryQueue.filter(op => 
        op.timestamp !== operation.timestamp || op.operation !== operation.operation
      );
      
    } catch (error) {
      console.error(`❌ Retry failed for ${operation.operation}:`, error);
      
      // Increment retry count and reschedule
      operation.retryCount++;
      operation.error = error.message;
      
      if (operation.retryCount < this.config.maxRetries) {
        this.scheduleRetry(operation);
      } else {
        console.error('🚫 Max retries exceeded for operation:', operation);
        // Remove from retry queue
        this.retryQueue = this.retryQueue.filter(op => 
          op.timestamp !== operation.timestamp || op.operation !== operation.operation
        );
      }
    }
  }

  // Process retry queue
  processRetryQueue() {
    if (!this.isRunning || this.retryQueue.length === 0) return;
    
    // Sort by priority and retry count
    const sortedQueue = this.retryQueue.sort((a, b) => {
      // Higher priority first
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Lower retry count first
      return a.retryCount - b.retryCount;
    });
    
    // Process high-priority items immediately
    const highPriorityItems = sortedQueue.filter(op => 
      (op.priority || 0) >= this.config.priorityThreshold
    );
    
    for (const operation of highPriorityItems) {
      this.executeRetry(operation);
    }
  }

  // Perform partial sync for specific data
  async performPartialSync(data) {
    // Implementation for partial sync
    console.log('🔄 Performing partial sync:', data);
    // This would sync only specific items or types
  }

  // Update average sync time
  updateAverageSyncTime(syncTime) {
    if (this.syncStats.averageSyncTime === 0) {
      this.syncStats.averageSyncTime = syncTime;
    } else {
      // Moving average
      this.syncStats.averageSyncTime = 
        (this.syncStats.averageSyncTime * 0.8) + (syncTime * 0.2);
    }
  }

  // Force immediate sync
  async forceSyncNow() {
    if (!networkStatus.getStatus()) {
      throw new Error('Cannot sync while offline');
    }
    
    console.log('🚀 Forcing immediate sync...');
    await this.performSync();
  }

  // Add high-priority sync operation
  addPrioritySync(operation) {
    const priorityOperation = {
      ...operation,
      priority: this.config.priorityThreshold,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    this.addToRetryQueue(priorityOperation);
  }

  // Configure background sync
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Restart with new configuration
    if (this.isRunning) {
      this.stopBackgroundSync();
      this.startBackgroundSync();
    }
    
    console.log('⚙️ Background sync reconfigured:', this.config);
  }

  // Get sync statistics
  getStats() {
    return {
      ...this.syncStats,
      isRunning: this.isRunning,
      queueSize: this.retryQueue.length,
      activeRetries: this.retryTimeouts.size,
      config: this.config,
      successRate: this.syncStats.totalSyncs > 0 ? 
        (this.syncStats.successfulSyncs / this.syncStats.totalSyncs * 100).toFixed(2) + '%' : '0%'
    };
  }

  // Clear retry queue
  clearRetryQueue() {
    this.retryQueue = [];
    
    // Clear timeouts
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
    
    console.log('🗑️ Retry queue cleared');
  }

  // Pause background sync
  pause() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('⏸️ Background sync paused');
  }

  // Resume background sync
  resume() {
    if (this.isRunning && !this.syncInterval) {
      this.syncInterval = setInterval(() => {
        this.performSync();
      }, this.config.syncInterval);
      console.log('▶️ Background sync resumed');
    }
  }

  // Cleanup
  destroy() {
    this.stopBackgroundSync();
    
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
    
    console.log('🗑️ Background sync service destroyed');
  }
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService();
export default backgroundSyncService;
