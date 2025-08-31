import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'testdriven-app';
const DB_VERSION = 1;

// Database stores
const STORES = {
  USERS: 'users',
  PENDING_ACTIONS: 'pendingActions',
  SYNC_QUEUE: 'syncQueue'
};

// Initialize IndexedDB
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Users store
    if (!db.objectStoreNames.contains(STORES.USERS)) {
      const usersStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
      usersStore.createIndex('username', 'username', { unique: true });
      usersStore.createIndex('email', 'email', { unique: true });
    }

    // Pending actions store (for offline operations)
    if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
      const actionsStore = db.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: 'id' });
      actionsStore.createIndex('timestamp', 'timestamp');
      actionsStore.createIndex('type', 'type');
    }

    // Sync queue store
    if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
      const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
      syncStore.createIndex('priority', 'priority');
      syncStore.createIndex('timestamp', 'timestamp');
    }
  },
});

// Offline Storage Service
class OfflineStorageService {
  constructor() {
    this.initialized = false;
    this.db = null;
  }

  /**
   * Initialize the offline storage service
   * This method MUST exist for PWA Manager compatibility
   */
  async init() {
    if (this.initialized) {
      console.log('💾 Offline storage already initialized');
      return true;
    }

    try {
      console.log('🔧 Initializing offline storage...');

      // Test database connection
      this.db = await dbPromise;

      // Verify all required stores exist
      const requiredStores = [STORES.USERS, STORES.PENDING_ACTIONS, STORES.SYNC_QUEUE];
      const availableStores = Array.from(this.db.objectStoreNames);

      for (const store of requiredStores) {
        if (!availableStores.includes(store)) {
          throw new Error(`Required store '${store}' not found in database`);
        }
      }

      console.log('💾 Offline storage initialized successfully');
      console.log('📦 Available stores:', availableStores);

      this.initialized = true;
      return true;

    } catch (error) {
      console.error('❌ Offline storage initialization failed:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized() {
    return this.initialized;
  }

  // Users operations
  async getAllUsers() {
    const db = await dbPromise;
    return db.getAll(STORES.USERS);
  }

  async getUnsyncedUsers() {
    const db = await dbPromise;
    const tx = db.transaction(STORES.USERS, 'readonly');
    const users = await tx.store.getAll();
    return users.filter(user => !user.synced);
  }

  async getUserById(id) {
    const db = await dbPromise;
    return db.get(STORES.USERS, id);
  }

  async addUser(user) {
    const db = await dbPromise;
    const userWithId = {
      ...user,
      id: user.id || uuidv4(),
      createdAt: user.createdAt || new Date().toISOString(),
      synced: user.synced !== undefined ? user.synced : false
    };

    await db.add(STORES.USERS, userWithId);

    // Only add to sync queue if not already synced
    if (!userWithId.synced) {
      await this.addToSyncQueue({
        type: 'CREATE_USER',
        data: userWithId,
        endpoint: '/users',
        method: 'POST'
      });
    }

    return userWithId;
  }

  async updateUser(id, updates) {
    const db = await dbPromise;
    const user = await db.get(STORES.USERS, id);
    if (!user) throw new Error('User not found');
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString(),
      synced: false
    };
    
    await db.put(STORES.USERS, updatedUser);
    
    // Add to sync queue
    await this.addToSyncQueue({
      type: 'UPDATE_USER',
      data: updatedUser,
      endpoint: `/users/${id}`,
      method: 'PUT'
    });
    
    return updatedUser;
  }

  async deleteUser(id) {
    const db = await dbPromise;
    const user = await db.get(STORES.USERS, id);
    if (!user) throw new Error('User not found');
    
    await db.delete(STORES.USERS, id);
    
    // Add to sync queue
    await this.addToSyncQueue({
      type: 'DELETE_USER',
      data: { id },
      endpoint: `/users/${id}`,
      method: 'DELETE'
    });
    
    return true;
  }

  // Sync operations
  async addToSyncQueue(action) {
    const db = await dbPromise;
    const syncItem = {
      id: uuidv4(),
      ...action,
      timestamp: new Date().toISOString(),
      priority: this.getPriority(action.type),
      retries: 0,
      maxRetries: 3
    };
    
    await db.add(STORES.SYNC_QUEUE, syncItem);
    return syncItem;
  }

  async getSyncQueue() {
    const db = await dbPromise;
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const index = tx.store.index('priority');
    return index.getAll();
  }

  async removeSyncItem(id) {
    const db = await dbPromise;
    await db.delete(STORES.SYNC_QUEUE, id);
  }

  async updateSyncItem(id, updates) {
    const db = await dbPromise;
    const item = await db.get(STORES.SYNC_QUEUE, id);
    if (!item) return;
    
    const updatedItem = { ...item, ...updates };
    await db.put(STORES.SYNC_QUEUE, updatedItem);
    return updatedItem;
  }

  // Utility methods
  getPriority(actionType) {
    const priorities = {
      'CREATE_USER': 1,
      'UPDATE_USER': 2,
      'DELETE_USER': 3
    };
    return priorities[actionType] || 5;
  }

  async clearAllData() {
    const db = await dbPromise;
    const tx = db.transaction([STORES.USERS, STORES.PENDING_ACTIONS, STORES.SYNC_QUEUE], 'readwrite');
    await Promise.all([
      tx.objectStore(STORES.USERS).clear(),
      tx.objectStore(STORES.PENDING_ACTIONS).clear(),
      tx.objectStore(STORES.SYNC_QUEUE).clear()
    ]);
  }

  // Sync users from server (when online)
  async syncUsersFromServer(serverUsers) {
    const db = await dbPromise;
    const tx = db.transaction(STORES.USERS, 'readwrite');
    
    // Clear existing synced users
    const localUsers = await tx.store.getAll();
    for (const user of localUsers) {
      if (user.synced) {
        await tx.store.delete(user.id);
      }
    }
    
    // Add server users
    for (const user of serverUsers) {
      await tx.store.put({
        ...user,
        synced: true,
        lastSyncAt: new Date().toISOString()
      });
    }
    
    await tx.done;
  }

  // Mark user as synced
  async markUserSynced(localId, serverId) {
    const db = await dbPromise;
    const user = await db.get(STORES.USERS, localId);
    if (!user) return;
    
    const syncedUser = {
      ...user,
      id: serverId || user.id,
      synced: true,
      lastSyncAt: new Date().toISOString()
    };
    
    // If server ID is different, delete old record and add new one
    if (serverId && serverId !== localId) {
      await db.delete(STORES.USERS, localId);
    }
    
    await db.put(STORES.USERS, syncedUser);
    return syncedUser;
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();
export default offlineStorage;
