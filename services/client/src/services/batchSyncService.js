import axios from 'axios';
import offlineStorage from './offlineStorage';
import notificationService from './notificationService';

// Batch Sync Service for efficient bulk operations
class BatchSyncService {
  constructor() {
    this.batchSize = 10; // Number of operations per batch
    this.batchTimeout = 5000; // 5 seconds timeout for batching
    this.pendingBatches = new Map();
    this.batchTimers = new Map();
  }

  // Add operation to batch queue
  async addToBatch(operation) {
    const batchKey = this.getBatchKey(operation);
    
    if (!this.pendingBatches.has(batchKey)) {
      this.pendingBatches.set(batchKey, []);
    }
    
    const batch = this.pendingBatches.get(batchKey);
    batch.push(operation);
    
    // Set or reset batch timer
    this.resetBatchTimer(batchKey);
    
    // Process batch if it reaches the size limit
    if (batch.length >= this.batchSize) {
      await this.processBatch(batchKey);
    }
  }

  // Get batch key for grouping operations
  getBatchKey(operation) {
    return `${operation.type}_${operation.endpoint}`;
  }

  // Reset batch timer
  resetBatchTimer(batchKey) {
    // Clear existing timer
    if (this.batchTimers.has(batchKey)) {
      clearTimeout(this.batchTimers.get(batchKey));
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.processBatch(batchKey);
    }, this.batchTimeout);
    
    this.batchTimers.set(batchKey, timer);
  }

  // Process a batch of operations
  async processBatch(batchKey) {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.length === 0) return;
    
    console.log(`🔄 Processing batch: ${batchKey} (${batch.length} operations)`);
    
    // Clear timer and batch
    if (this.batchTimers.has(batchKey)) {
      clearTimeout(this.batchTimers.get(batchKey));
      this.batchTimers.delete(batchKey);
    }
    this.pendingBatches.delete(batchKey);
    
    try {
      const results = await this.executeBatch(batch);
      console.log(`✅ Batch completed: ${batchKey}`, results);
      return results;
    } catch (error) {
      console.error(`❌ Batch failed: ${batchKey}`, error);
      
      // Re-queue failed operations individually
      await this.requeueFailedOperations(batch);
      throw error;
    }
  }

  // Execute batch operations
  async executeBatch(batch) {
    const operationType = batch[0].type;
    
    switch (operationType) {
      case 'CREATE_USER':
        return await this.batchCreateUsers(batch);
      case 'UPDATE_USER':
        return await this.batchUpdateUsers(batch);
      case 'DELETE_USER':
        return await this.batchDeleteUsers(batch);
      default:
        throw new Error(`Unsupported batch operation: ${operationType}`);
    }
  }

  // Batch create users
  async batchCreateUsers(batch) {
    const users = batch.map(op => ({
      username: op.data.username,
      email: op.data.email,
      localId: op.data.id
    }));
    
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_USERS_SERVICE_URL}/users/batch`,
        { users }
      );
      
      const createdUsers = response.data.data.users;
      const results = [];
      
      // Update local storage with server IDs
      for (let i = 0; i < batch.length; i++) {
        const operation = batch[i];
        const serverUser = createdUsers[i];
        
        if (serverUser) {
          await offlineStorage.markUserSynced(operation.data.id, serverUser.id);
          results.push({ success: true, localId: operation.data.id, serverId: serverUser.id });
        } else {
          results.push({ success: false, localId: operation.data.id, error: 'No server response' });
        }
      }
      
      return results;
    } catch (error) {
      // Fallback to individual operations if batch fails
      if (error.response && error.response.status === 404) {
        console.warn('Batch endpoint not available, falling back to individual operations');
        return await this.fallbackToIndividualOperations(batch);
      }
      throw error;
    }
  }

  // Batch update users
  async batchUpdateUsers(batch) {
    const updates = batch.map(op => ({
      id: op.data.id,
      username: op.data.username,
      email: op.data.email
    }));
    
    try {
      const response = await axios.put(
        `${process.env.REACT_APP_USERS_SERVICE_URL}/users/batch`,
        { users: updates }
      );
      
      const updatedUsers = response.data.data.users;
      const results = [];
      
      // Update local storage
      for (let i = 0; i < batch.length; i++) {
        const operation = batch[i];
        const serverUser = updatedUsers[i];
        
        if (serverUser) {
          await offlineStorage.markUserSynced(operation.data.id, serverUser.id);
          results.push({ success: true, localId: operation.data.id, serverId: serverUser.id });
        } else {
          results.push({ success: false, localId: operation.data.id, error: 'No server response' });
        }
      }
      
      return results;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return await this.fallbackToIndividualOperations(batch);
      }
      throw error;
    }
  }

  // Batch delete users
  async batchDeleteUsers(batch) {
    const userIds = batch.map(op => op.data.id);
    
    try {
      await axios.delete(
        `${process.env.REACT_APP_USERS_SERVICE_URL}/users/batch`,
        { data: { userIds } }
      );
      
      return batch.map(op => ({ 
        success: true, 
        localId: op.data.id 
      }));
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return await this.fallbackToIndividualOperations(batch);
      }
      throw error;
    }
  }

  // Fallback to individual operations
  async fallbackToIndividualOperations(batch) {
    const results = [];
    
    for (const operation of batch) {
      try {
        const result = await this.executeIndividualOperation(operation);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ 
          success: false, 
          localId: operation.data.id, 
          error: error.message 
        });
      }
    }
    
    return results;
  }

  // Execute individual operation
  async executeIndividualOperation(operation) {
    switch (operation.type) {
      case 'CREATE_USER':
        const createResponse = await axios.post(
          `${process.env.REACT_APP_USERS_SERVICE_URL}/users`,
          {
            username: operation.data.username,
            email: operation.data.email
          }
        );
        const createdUser = createResponse.data.data.user;
        await offlineStorage.markUserSynced(operation.data.id, createdUser.id);
        return { localId: operation.data.id, serverId: createdUser.id };
        
      case 'UPDATE_USER':
        const updateResponse = await axios.put(
          `${process.env.REACT_APP_USERS_SERVICE_URL}/users/${operation.data.id}`,
          {
            username: operation.data.username,
            email: operation.data.email
          }
        );
        const updatedUser = updateResponse.data.data.user;
        await offlineStorage.markUserSynced(operation.data.id, updatedUser.id);
        return { localId: operation.data.id, serverId: updatedUser.id };
        
      case 'DELETE_USER':
        await axios.delete(
          `${process.env.REACT_APP_USERS_SERVICE_URL}/users/${operation.data.id}`
        );
        return { localId: operation.data.id };
        
      default:
        throw new Error(`Unsupported operation: ${operation.type}`);
    }
  }

  // Re-queue failed operations
  async requeueFailedOperations(batch) {
    for (const operation of batch) {
      await offlineStorage.addToSyncQueue({
        ...operation,
        retries: (operation.retries || 0) + 1,
        lastError: 'Batch operation failed',
        lastRetryAt: new Date().toISOString()
      });
    }
  }

  // Process all pending batches immediately
  async flushAllBatches() {
    const batchKeys = Array.from(this.pendingBatches.keys());
    const results = [];
    
    for (const batchKey of batchKeys) {
      try {
        const result = await this.processBatch(batchKey);
        results.push({ batchKey, success: true, result });
      } catch (error) {
        results.push({ batchKey, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // Get batch statistics
  getBatchStats() {
    const stats = {
      pendingBatches: this.pendingBatches.size,
      totalPendingOperations: 0,
      batchDetails: {}
    };
    
    for (const [batchKey, batch] of this.pendingBatches) {
      stats.totalPendingOperations += batch.length;
      stats.batchDetails[batchKey] = batch.length;
    }
    
    return stats;
  }

  // Configure batch settings
  configure(options = {}) {
    if (options.batchSize) this.batchSize = options.batchSize;
    if (options.batchTimeout) this.batchTimeout = options.batchTimeout;
  }
}

// Export singleton instance
export const batchSyncService = new BatchSyncService();
export default batchSyncService;
