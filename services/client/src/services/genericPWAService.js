import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generic PWA Service for Offline Functionality
 * 
 * This service provides a generic interface for any service to use PWA features:
 * - Offline storage with IndexedDB
 * - Sync queue for offline operations
 * - Automatic retry logic
 * - Support for CRUD operations
 * 
 * Usage for any service:
 * 1. Define your service configuration
 * 2. Use the generic methods for offline operations
 * 3. The service handles sync queue automatically
 */

const DB_NAME = 'testdriven-app';
const DB_VERSION = 2; // Increment when adding new services

// Generic stores that work for any service
const GENERIC_STORES = {
  SYNC_QUEUE: 'syncQueue',
  PENDING_ACTIONS: 'pendingActions'
};

class GenericPWAService {
  constructor(serviceName, config) {
    this.serviceName = serviceName;
    this.config = {
      endpoint: config.endpoint || `/${serviceName}`,
      storeName: config.storeName || serviceName,
      keyPath: config.keyPath || 'id',
      indexes: config.indexes || [],
      ...config
    };
    
    this.dbPromise = this.initializeDB();
  }

  async initializeDB() {
    return openDB(DB_NAME, DB_VERSION, {
      upgrade: (db, oldVersion, newVersion, transaction) => {
        // Create generic sync queue store
        if (!db.objectStoreNames.contains(GENERIC_STORES.SYNC_QUEUE)) {
          const syncStore = db.createObjectStore(GENERIC_STORES.SYNC_QUEUE, { keyPath: 'id' });
          syncStore.createIndex('serviceName', 'serviceName');
          syncStore.createIndex('priority', 'priority');
          syncStore.createIndex('timestamp', 'timestamp');
          syncStore.createIndex('retryCount', 'retryCount');
        }

        // Create generic pending actions store
        if (!db.objectStoreNames.contains(GENERIC_STORES.PENDING_ACTIONS)) {
          const actionsStore = db.createObjectStore(GENERIC_STORES.PENDING_ACTIONS, { keyPath: 'id' });
          actionsStore.createIndex('serviceName', 'serviceName');
          actionsStore.createIndex('timestamp', 'timestamp');
          actionsStore.createIndex('type', 'type');
        }

        // Create service-specific store
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const serviceStore = db.createObjectStore(this.config.storeName, { 
            keyPath: this.config.keyPath 
          });
          
          // Add service-specific indexes
          this.config.indexes.forEach(index => {
            serviceStore.createIndex(index.name, index.keyPath, index.options || {});
          });
        }
      },
    });
  }

  // Generic CRUD operations
  async getAll() {
    const db = await this.dbPromise;
    return db.getAll(this.config.storeName);
  }

  async getById(id) {
    const db = await this.dbPromise;
    return db.get(this.config.storeName, id);
  }

  async add(item) {
    const db = await this.dbPromise;
    const itemWithId = {
      ...item,
      id: item.id || uuidv4(),
      createdAt: item.createdAt || new Date().toISOString(),
      synced: item.synced !== undefined ? item.synced : false
    };
    
    await db.add(this.config.storeName, itemWithId);
    
    // Only add to sync queue if not already synced
    if (!itemWithId.synced) {
      await this.addToSyncQueue({
        type: `CREATE_${this.serviceName.toUpperCase()}`,
        data: itemWithId,
        endpoint: this.config.endpoint,
        method: 'POST'
      });
    }
    
    return itemWithId;
  }

  async update(id, updates) {
    const db = await this.dbPromise;
    const item = await db.get(this.config.storeName, id);
    if (!item) throw new Error(`${this.serviceName} not found`);
    
    const updatedItem = {
      ...item,
      ...updates,
      updatedAt: new Date().toISOString(),
      synced: false
    };
    
    await db.put(this.config.storeName, updatedItem);
    
    // Add to sync queue
    await this.addToSyncQueue({
      type: `UPDATE_${this.serviceName.toUpperCase()}`,
      data: updatedItem,
      endpoint: `${this.config.endpoint}/${id}`,
      method: 'PUT'
    });
    
    return updatedItem;
  }

  async delete(id) {
    const db = await this.dbPromise;
    const item = await db.get(this.config.storeName, id);
    if (!item) throw new Error(`${this.serviceName} not found`);
    
    await db.delete(this.config.storeName, id);
    
    // Add to sync queue
    await this.addToSyncQueue({
      type: `DELETE_${this.serviceName.toUpperCase()}`,
      data: { id },
      endpoint: `${this.config.endpoint}/${id}`,
      method: 'DELETE'
    });
    
    return true;
  }

  // Sync queue operations
  async addToSyncQueue(action) {
    const db = await this.dbPromise;
    const syncItem = {
      id: uuidv4(),
      serviceName: this.serviceName,
      ...action,
      timestamp: new Date().toISOString(),
      priority: this.getPriority(action.type),
      retryCount: 0
    };
    
    await db.add(GENERIC_STORES.SYNC_QUEUE, syncItem);
    return syncItem;
  }

  async getSyncQueue() {
    const db = await this.dbPromise;
    const tx = db.transaction(GENERIC_STORES.SYNC_QUEUE, 'readonly');
    const index = tx.store.index('serviceName');
    return index.getAll(this.serviceName);
  }

  async removeSyncItem(id) {
    const db = await this.dbPromise;
    await db.delete(GENERIC_STORES.SYNC_QUEUE, id);
  }

  async updateSyncItem(id, updates) {
    const db = await this.dbPromise;
    const item = await db.get(GENERIC_STORES.SYNC_QUEUE, id);
    if (!item) return;
    
    const updatedItem = { ...item, ...updates };
    await db.put(GENERIC_STORES.SYNC_QUEUE, updatedItem);
    return updatedItem;
  }

  // Generic sync process
  async processSync(isOnline = true) {
    if (!isOnline) return { success: false, message: 'Offline' };

    const syncQueue = await this.getSyncQueue();
    if (syncQueue.length === 0) {
      return { success: true, message: 'Nothing to sync' };
    }

    const results = {
      synced: [],
      failed: []
    };

    for (const item of syncQueue) {
      try {
        const response = await fetch(item.endpoint, {
          method: item.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: item.method !== 'DELETE' ? JSON.stringify(this.prepareDataForSync(item)) : undefined
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Remove from sync queue
        await this.removeSyncItem(item.id);
        
        // Handle successful sync based on operation type
        if (item.type.startsWith('CREATE_')) {
          const responseData = await response.json();
          await this.handleCreateSyncSuccess(item, responseData);
        }
        
        results.synced.push(item);

      } catch (error) {
        console.error(`Failed to sync ${item.type}:`, error);
        results.failed.push(item);
        
        // Update retry count
        await this.updateSyncItem(item.id, {
          retryCount: (item.retryCount || 0) + 1,
          lastError: error.message
        });
      }
    }

    return {
      success: true,
      synced: results.synced.length,
      failed: results.failed.length,
      message: `${results.synced.length} synced, ${results.failed.length} failed`
    };
  }

  // Utility methods (can be overridden by specific services)
  prepareDataForSync(syncItem) {
    // Default implementation - can be overridden
    return syncItem.data;
  }

  async handleCreateSyncSuccess(syncItem, responseData) {
    // Default implementation - update local item with server ID
    // Can be overridden by specific services
    if (responseData.data && responseData.data[this.serviceName]) {
      const serverItem = responseData.data[this.serviceName];
      const updatedItem = {
        ...syncItem.data,
        id: serverItem.id,
        synced: true,
        createdAt: serverItem.created_date || syncItem.data.createdAt
      };
      
      const db = await this.dbPromise;
      await db.put(this.config.storeName, updatedItem);
    }
  }

  getPriority(actionType) {
    const priorities = {
      [`CREATE_${this.serviceName.toUpperCase()}`]: 1,
      [`UPDATE_${this.serviceName.toUpperCase()}`]: 2,
      [`DELETE_${this.serviceName.toUpperCase()}`]: 3
    };
    return priorities[actionType] || 5;
  }

  async clearAllData() {
    const db = await this.dbPromise;
    const tx = db.transaction([this.config.storeName, GENERIC_STORES.SYNC_QUEUE, GENERIC_STORES.PENDING_ACTIONS], 'readwrite');
    await Promise.all([
      tx.objectStore(this.config.storeName).clear(),
      // Clear only this service's sync queue items
      this.clearServiceSyncQueue(),
      // Clear only this service's pending actions
      this.clearServicePendingActions()
    ]);
  }

  async clearServiceSyncQueue() {
    const db = await this.dbPromise;
    const tx = db.transaction(GENERIC_STORES.SYNC_QUEUE, 'readwrite');
    const index = tx.store.index('serviceName');
    const items = await index.getAll(this.serviceName);
    
    for (const item of items) {
      await tx.store.delete(item.id);
    }
  }

  async clearServicePendingActions() {
    const db = await this.dbPromise;
    const tx = db.transaction(GENERIC_STORES.PENDING_ACTIONS, 'readwrite');
    const index = tx.store.index('serviceName');
    const items = await index.getAll(this.serviceName);
    
    for (const item of items) {
      await tx.store.delete(item.id);
    }
  }
}

export default GenericPWAService;
