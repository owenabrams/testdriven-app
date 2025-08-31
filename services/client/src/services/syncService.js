import axios from 'axios';
import offlineStorage from './offlineStorage';
import networkStatus from './networkStatus';
import conflictResolver from './conflictResolution';
import notificationService from './notificationService';
import batchSyncService from './batchSyncService';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncInProgress = false;
    
    // Auto-sync when coming online
    networkStatus.subscribe((isOnline) => {
      if (isOnline && !this.syncInProgress) {
        this.syncAll();
      }
    });
  }

  // Sync all pending actions
  async syncAll() {
    if (this.syncInProgress || !networkStatus.getStatus()) {
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 Starting sync...');

    // Notify sync start
    await notificationService.notifySyncStart();

    try {
      // First, sync users from server
      await this.syncUsersFromServer();

      // Then, sync pending local actions
      const syncedCount = await this.syncPendingActions();

      console.log('✅ Sync completed successfully');

      // Notify sync completion
      await notificationService.notifySyncComplete(syncedCount);
    } catch (error) {
      console.error('❌ Sync failed:', error);

      // Notify sync error
      await notificationService.notifySyncError(error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync users from server to local storage
  async syncUsersFromServer() {
    try {
      const response = await axios.get(`${process.env.REACT_APP_USERS_SERVICE_URL}/users`);
      const serverUsers = response.data.data.users;
      
      await offlineStorage.syncUsersFromServer(serverUsers);
      console.log(`📥 Synced ${serverUsers.length} users from server`);
    } catch (error) {
      console.error('Failed to sync users from server:', error);
      throw error;
    }
  }

  // Sync pending local actions to server (with batching)
  async syncPendingActions() {
    const syncQueue = await offlineStorage.getSyncQueue();
    console.log(`📤 Syncing ${syncQueue.length} pending actions`);

    if (syncQueue.length === 0) return 0;

    // Group operations by type for batching
    const batchGroups = this.groupOperationsForBatching(syncQueue);
    let syncedCount = 0;

    // Process each batch group
    for (const [groupKey, operations] of batchGroups) {
      console.log(`🔄 Processing ${groupKey} batch (${operations.length} operations)`);

      try {
        // Add operations to batch service
        for (const operation of operations) {
          await batchSyncService.addToBatch(operation);
        }

        // Flush batches for this group
        const batchResults = await batchSyncService.flushAllBatches();

        // Process results
        for (const batchResult of batchResults) {
          if (batchResult.success) {
            // Remove successfully synced items
            for (const operation of operations) {
              await offlineStorage.removeSyncItem(operation.id);
              syncedCount++;
            }
          } else {
            // Handle failed operations
            await this.handleBatchFailure(operations, batchResult.error);
          }
        }

      } catch (error) {
        console.error(`Failed to sync batch ${groupKey}:`, error);
        await this.handleBatchFailure(operations, error.message);
      }
    }

    return syncedCount;
  }

  // Group operations for efficient batching
  groupOperationsForBatching(operations) {
    const groups = new Map();

    for (const operation of operations) {
      const groupKey = `${operation.type}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }

      groups.get(groupKey).push(operation);
    }

    return groups;
  }

  // Handle batch operation failures
  async handleBatchFailure(operations, errorMessage) {
    for (const operation of operations) {
      // Increment retry count
      const updatedItem = await offlineStorage.updateSyncItem(operation.id, {
        retries: (operation.retries || 0) + 1,
        lastError: errorMessage,
        lastRetryAt: new Date().toISOString()
      });

      // Remove if max retries reached
      if (updatedItem && updatedItem.retries >= updatedItem.maxRetries) {
        console.warn(`Max retries reached for action ${operation.id}, removing from queue`);
        await offlineStorage.removeSyncItem(operation.id);
      }
    }
  }

  // Sync a single action
  async syncSingleAction(item) {
    const { type, data, endpoint, method } = item;
    
    switch (type) {
      case 'CREATE_USER':
        return this.syncCreateUser(item);
      case 'UPDATE_USER':
        return this.syncUpdateUser(item);
      case 'DELETE_USER':
        return this.syncDeleteUser(item);
      default:
        throw new Error(`Unknown sync action type: ${type}`);
    }
  }

  async syncCreateUser(item) {
    const { data } = item;
    const localId = data.id;

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_USERS_SERVICE_URL}/users`,
        {
          username: data.username,
          email: data.email
        }
      );

      const serverUser = response.data.data.user;

      // Update local user with server ID and mark as synced
      await offlineStorage.markUserSynced(localId, serverUser.id);

      console.log(`✅ Created user ${data.username} on server`);
      return serverUser;
    } catch (error) {
      // Handle conflicts with enhanced resolution
      if (error.response && error.response.status === 400) {
        console.warn(`⚠️ Conflict detected for user ${data.username}`);

        // Try to get existing user from server
        try {
          const existingResponse = await axios.get(
            `${process.env.REACT_APP_USERS_SERVICE_URL}/users`
          );
          const existingUser = existingResponse.data.data.users.find(
            u => u.username === data.username || u.email === data.email
          );

          if (existingUser) {
            // Resolve conflict
            const resolution = await conflictResolver.resolveConflict(
              data,
              existingUser,
              'TIMESTAMP'
            );

            // Update local storage with resolved data
            await offlineStorage.markUserSynced(localId, existingUser.id);
            console.log(`🔄 Conflict resolved for user ${data.username}`);
            return resolution.data;
          }
        } catch (fetchError) {
          console.error('Failed to fetch existing user for conflict resolution:', fetchError);
        }

        // Fallback: mark as synced to avoid infinite retries
        await offlineStorage.markUserSynced(localId);
        return;
      }
      throw error;
    }
  }

  async syncUpdateUser(item) {
    const { data } = item;
    
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_USERS_SERVICE_URL}/users/${data.id}`,
        {
          username: data.username,
          email: data.email
        }
      );
      
      const serverUser = response.data.data.user;
      await offlineStorage.markUserSynced(data.id, serverUser.id);
      
      console.log(`✅ Updated user ${data.username} on server`);
      return serverUser;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn(`User ${data.id} not found on server, treating as create`);
        // Convert to create action
        return this.syncCreateUser({
          ...item,
          type: 'CREATE_USER',
          endpoint: '/users',
          method: 'POST'
        });
      }
      throw error;
    }
  }

  async syncDeleteUser(item) {
    const { data } = item;
    
    try {
      await axios.delete(`${process.env.REACT_APP_USERS_SERVICE_URL}/users/${data.id}`);
      console.log(`✅ Deleted user ${data.id} on server`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn(`User ${data.id} already deleted on server`);
        return; // Consider it successful
      }
      throw error;
    }
  }

  // Manual sync trigger
  async forceSync() {
    return this.syncAll();
  }

  // Get sync status
  getSyncStatus() {
    return {
      isSyncing: this.syncInProgress,
      isOnline: networkStatus.getStatus()
    };
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;
