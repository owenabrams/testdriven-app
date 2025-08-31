import GenericPWAService from './genericPWAService';

/**
 * Users PWA Service
 * 
 * Extends the generic PWA service for user-specific operations.
 * This demonstrates how to create service-specific PWA functionality
 * that can be easily replicated for other services.
 */

class UsersPWAService extends GenericPWAService {
  constructor() {
    super('users', {
      endpoint: '/users',
      storeName: 'users',
      keyPath: 'id',
      indexes: [
        { name: 'username', keyPath: 'username', options: { unique: true } },
        { name: 'email', keyPath: 'email', options: { unique: true } },
        { name: 'synced', keyPath: 'synced' },
        { name: 'createdAt', keyPath: 'createdAt' }
      ]
    });
  }

  // Override data preparation for sync to match Flask API expectations
  prepareDataForSync(syncItem) {
    const { username, email } = syncItem.data;
    return { username, email };
  }

  // Override create sync success handler for Flask API response format
  async handleCreateSyncSuccess(syncItem, responseData) {
    if (responseData.data && responseData.data.user) {
      const serverUser = responseData.data.user;
      const updatedUser = {
        ...syncItem.data,
        id: serverUser.id,
        synced: true,
        createdAt: serverUser.created_date || syncItem.data.createdAt
      };
      
      const db = await this.dbPromise;
      await db.put(this.config.storeName, updatedUser);
      return updatedUser;
    }
  }

  // User-specific methods
  async getUserByEmail(email) {
    const db = await this.dbPromise;
    const tx = db.transaction(this.config.storeName, 'readonly');
    const index = tx.store.index('email');
    return index.get(email);
  }

  async getUserByUsername(username) {
    const db = await this.dbPromise;
    const tx = db.transaction(this.config.storeName, 'readonly');
    const index = tx.store.index('username');
    return index.get(username);
  }

  async getUnsyncedUsers() {
    const db = await this.dbPromise;
    const tx = db.transaction(this.config.storeName, 'readonly');
    const index = tx.store.index('synced');
    return index.getAll(false);
  }

  async getSyncedUsers() {
    const db = await this.dbPromise;
    const tx = db.transaction(this.config.storeName, 'readonly');
    const index = tx.store.index('synced');
    return index.getAll(true);
  }

  // Sync users from server (when online)
  async syncUsersFromServer(serverUsers) {
    const db = await this.dbPromise;
    const tx = db.transaction(this.config.storeName, 'readwrite');
    
    for (const serverUser of serverUsers) {
      const localUser = {
        id: serverUser.id,
        username: serverUser.username,
        email: serverUser.email,
        synced: true,
        createdAt: serverUser.created_date || new Date().toISOString()
      };
      
      // Use put to update existing or add new
      await tx.store.put(localUser);
    }
    
    await tx.done;
  }

  // Get sync statistics
  async getSyncStats() {
    const allUsers = await this.getAll();
    const syncQueue = await this.getSyncQueue();
    
    return {
      total: allUsers.length,
      synced: allUsers.filter(u => u.synced).length,
      unsynced: allUsers.filter(u => !u.synced).length,
      queuedOperations: syncQueue.length,
      pendingCreates: syncQueue.filter(q => q.type === 'CREATE_USERS').length,
      pendingUpdates: syncQueue.filter(q => q.type === 'UPDATE_USERS').length,
      pendingDeletes: syncQueue.filter(q => q.type === 'DELETE_USERS').length
    };
  }
}

// Export singleton instance
const usersPWAService = new UsersPWAService();
export default usersPWAService;
