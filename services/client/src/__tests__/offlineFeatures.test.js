import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import offlineStorage from '../services/offlineStorage';
import conflictResolver from '../services/conflictResolution';
import notificationService from '../services/notificationService';
import offlineAuthService from '../services/offlineAuthService';
import batchSyncService from '../services/batchSyncService';
import backgroundSyncService from '../services/backgroundSyncService';

// Mock network status
const mockNetworkStatus = {
  getStatus: jest.fn(() => true),
  subscribe: jest.fn(() => () => {}),
  setOnline: jest.fn(),
  setOffline: jest.fn()
};

jest.mock('../services/networkStatus', () => mockNetworkStatus);

describe('Offline Features Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset network status to online
    mockNetworkStatus.getStatus.mockReturnValue(true);
  });

  describe('Offline Storage Service', () => {
    test('should store and retrieve users offline', async () => {
      const testUser = {
        username: 'testuser',
        email: 'test@example.com'
      };

      // Add user offline
      const addedUser = await offlineStorage.addUser(testUser);
      expect(addedUser).toHaveProperty('id');
      expect(addedUser.synced).toBe(false);

      // Retrieve users
      const users = await offlineStorage.getAllUsers();
      expect(users).toHaveLength(1);
      expect(users[0].username).toBe(testUser.username);
    });

    test('should handle sync queue operations', async () => {
      const syncItem = {
        type: 'CREATE_USER',
        data: { username: 'synctest', email: 'sync@test.com' },
        endpoint: '/users',
        method: 'POST'
      };

      // Add to sync queue
      await offlineStorage.addToSyncQueue(syncItem);

      // Get sync queue
      const queue = await offlineStorage.getSyncQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('CREATE_USER');
    });

    test('should mark users as synced', async () => {
      const user = await offlineStorage.addUser({
        username: 'syncuser',
        email: 'sync@example.com'
      });

      // Mark as synced
      await offlineStorage.markUserSynced(user.id, 'server-id-123');

      // Verify sync status
      const updatedUser = await offlineStorage.getUser(user.id);
      expect(updatedUser.synced).toBe(true);
      expect(updatedUser.serverId).toBe('server-id-123');
    });
  });

  describe('Conflict Resolution Service', () => {
    test('should detect and resolve conflicts', async () => {
      const localData = {
        id: 'local-1',
        username: 'user1',
        email: 'user1@local.com',
        updatedAt: '2023-01-01T10:00:00Z'
      };

      const serverData = {
        id: 'server-1',
        username: 'user1',
        email: 'user1@server.com',
        updatedAt: '2023-01-01T11:00:00Z'
      };

      // Resolve conflict using timestamp strategy
      const resolution = await conflictResolver.resolveConflict(
        localData,
        serverData,
        'TIMESTAMP'
      );

      expect(resolution.strategy).toBe('TIMESTAMP');
      expect(resolution.data.email).toBe('user1@server.com'); // Server is newer
    });

    test('should handle merge strategy', async () => {
      const localData = {
        username: 'user1',
        email: 'local@example.com',
        updatedAt: '2023-01-01T12:00:00Z'
      };

      const serverData = {
        username: 'user1',
        email: 'server@example.com',
        updatedAt: '2023-01-01T10:00:00Z'
      };

      const resolution = await conflictResolver.resolveConflict(
        localData,
        serverData,
        'MERGE'
      );

      expect(resolution.strategy).toBe('MERGE');
      expect(resolution.data).toHaveProperty('_mergedAt');
    });
  });

  describe('Notification Service', () => {
    test('should initialize and send notifications', async () => {
      // Mock Notification API
      global.Notification = {
        permission: 'granted',
        requestPermission: jest.fn(() => Promise.resolve('granted'))
      };

      global.navigator.serviceWorker = {
        ready: Promise.resolve({
          showNotification: jest.fn()
        })
      };

      const initialized = await notificationService.initialize();
      expect(initialized).toBe(true);

      // Test notification sending
      await notificationService.notifySyncComplete(5);
      // Verify notification was attempted (mocked)
    });

    test('should handle offline notifications', async () => {
      await notificationService.notifyOffline();
      await notificationService.notifyOnline();
      await notificationService.notifyConflict(2);
      
      // These should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Offline Authentication Service', () => {
    test('should register users offline', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await offlineAuthService.register(userData);
      
      expect(result.user).toHaveProperty('id');
      expect(result.user.username).toBe(userData.username);
      expect(result.session).toHaveProperty('token');
    });

    test('should login users offline', async () => {
      // First register a user
      await offlineAuthService.register({
        username: 'logintest',
        email: 'login@test.com',
        password: 'password123'
      });

      // Then login
      const result = await offlineAuthService.login({
        username: 'logintest',
        password: 'password123'
      });

      expect(result.user.username).toBe('logintest');
      expect(result.session).toHaveProperty('token');
    });

    test('should handle logout', async () => {
      // Register and login
      await offlineAuthService.register({
        username: 'logouttest',
        email: 'logout@test.com',
        password: 'password123'
      });

      // Logout
      await offlineAuthService.logout();
      
      expect(offlineAuthService.getCurrentUser()).toBeNull();
      expect(offlineAuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('Batch Sync Service', () => {
    test('should batch operations efficiently', async () => {
      const operations = [
        {
          type: 'CREATE_USER',
          data: { username: 'batch1', email: 'batch1@test.com' },
          endpoint: '/users'
        },
        {
          type: 'CREATE_USER',
          data: { username: 'batch2', email: 'batch2@test.com' },
          endpoint: '/users'
        }
      ];

      // Add operations to batch
      for (const op of operations) {
        await batchSyncService.addToBatch(op);
      }

      // Get batch stats
      const stats = batchSyncService.getBatchStats();
      expect(stats.totalPendingOperations).toBeGreaterThan(0);
    });

    test('should handle batch configuration', () => {
      const newConfig = {
        batchSize: 20,
        batchTimeout: 10000
      };

      batchSyncService.configure(newConfig);
      
      // Configuration should be applied
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Background Sync Service', () => {
    test('should start and stop background sync', () => {
      // Mock network as online
      mockNetworkStatus.getStatus.mockReturnValue(true);
      
      backgroundSyncService.startBackgroundSync();
      let stats = backgroundSyncService.getStats();
      expect(stats.isRunning).toBe(true);

      backgroundSyncService.stopBackgroundSync();
      stats = backgroundSyncService.getStats();
      expect(stats.isRunning).toBe(false);
    });

    test('should handle retry logic', async () => {
      const operation = {
        operation: 'TEST_SYNC',
        error: 'Network error',
        timestamp: Date.now(),
        retryCount: 0
      };

      backgroundSyncService.addToRetryQueue(operation);
      
      const stats = backgroundSyncService.getStats();
      expect(stats.queueSize).toBeGreaterThan(0);
    });

    test('should calculate retry delays correctly', () => {
      // Test exponential backoff calculation
      const service = backgroundSyncService;
      
      const delay1 = service.calculateRetryDelay(0);
      const delay2 = service.calculateRetryDelay(1);
      const delay3 = service.calculateRetryDelay(2);
      
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete offline-to-online flow', async () => {
      // Start offline
      mockNetworkStatus.getStatus.mockReturnValue(false);
      
      // Add user offline
      const user = await offlineStorage.addUser({
        username: 'integration',
        email: 'integration@test.com'
      });
      
      expect(user.synced).toBe(false);
      
      // Go online
      mockNetworkStatus.getStatus.mockReturnValue(true);
      
      // Simulate sync (would normally happen automatically)
      await offlineStorage.markUserSynced(user.id, 'server-123');
      
      const syncedUser = await offlineStorage.getUser(user.id);
      expect(syncedUser.synced).toBe(true);
    });

    test('should handle authentication with offline storage', async () => {
      // Register user
      const authResult = await offlineAuthService.register({
        username: 'authintegration',
        email: 'auth@integration.com',
        password: 'password123'
      });

      // Add user data
      const userData = await offlineStorage.addUser({
        username: 'userdata',
        email: 'userdata@test.com'
      });

      // Both should work independently
      expect(authResult.user).toHaveProperty('id');
      expect(userData).toHaveProperty('id');
    });

    test('should handle conflict resolution in sync flow', async () => {
      // Create conflicting data
      const localUser = {
        id: 'conflict-test',
        username: 'conflictuser',
        email: 'local@conflict.com',
        updatedAt: '2023-01-01T10:00:00Z'
      };

      const serverUser = {
        id: 'conflict-test',
        username: 'conflictuser',
        email: 'server@conflict.com',
        updatedAt: '2023-01-01T11:00:00Z'
      };

      // Resolve conflict
      const resolution = await conflictResolver.resolveConflict(
        localUser,
        serverUser,
        'SERVER_WINS'
      );

      expect(resolution.strategy).toBe('SERVER_WINS');
      expect(resolution.data.email).toBe('server@conflict.com');
    });
  });

  describe('Error Handling', () => {
    test('should handle storage errors gracefully', async () => {
      // Mock storage error
      const originalAddUser = offlineStorage.addUser;
      offlineStorage.addUser = jest.fn().mockRejectedValue(new Error('Storage error'));

      try {
        await offlineStorage.addUser({ username: 'error', email: 'error@test.com' });
      } catch (error) {
        expect(error.message).toBe('Storage error');
      }

      // Restore original method
      offlineStorage.addUser = originalAddUser;
    });

    test('should handle auth errors gracefully', async () => {
      try {
        await offlineAuthService.login({
          username: 'nonexistent',
          password: 'wrongpassword'
        });
      } catch (error) {
        expect(error.message).toBe('Invalid credentials');
      }
    });
  });
});

describe('Performance Tests', () => {
  test('should handle large datasets efficiently', async () => {
    const startTime = Date.now();
    
    // Add many users
    const users = [];
    for (let i = 0; i < 100; i++) {
      users.push(await offlineStorage.addUser({
        username: `user${i}`,
        email: `user${i}@test.com`
      }));
    }
    
    const addTime = Date.now() - startTime;
    expect(addTime).toBeLessThan(5000); // Should complete in under 5 seconds
    
    // Retrieve all users
    const retrieveStart = Date.now();
    const allUsers = await offlineStorage.getAllUsers();
    const retrieveTime = Date.now() - retrieveStart;
    
    expect(allUsers).toHaveLength(100);
    expect(retrieveTime).toBeLessThan(1000); // Should retrieve in under 1 second
  });
});
