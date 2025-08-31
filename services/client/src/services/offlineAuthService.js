import { openDB } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import networkStatus from './networkStatus';
import notificationService from './notificationService';

// Offline-Capable Authentication Service
class OfflineAuthService {
  constructor() {
    this.dbName = 'testdriven-auth';
    this.dbVersion = 1;
    this.currentUser = null;
    this.authListeners = [];
    this.tokenRefreshInterval = null;
    this.isInitialized = false;
    
    this.initializeAuth();
  }

  async initializeAuth() {
    try {
      // Initialize auth database
      this.db = await openDB(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Users store for offline auth
          if (!db.objectStoreNames.contains('authUsers')) {
            const authStore = db.createObjectStore('authUsers', { keyPath: 'id' });
            authStore.createIndex('username', 'username', { unique: true });
            authStore.createIndex('email', 'email', { unique: true });
          }
          
          // Sessions store
          if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
            sessionStore.createIndex('userId', 'userId');
            sessionStore.createIndex('token', 'token', { unique: true });
          }
          
          // Auth tokens store
          if (!db.objectStoreNames.contains('tokens')) {
            const tokenStore = db.createObjectStore('tokens', { keyPath: 'type' });
          }
        }
      });

      // Restore session if available
      await this.restoreSession();
      
      this.isInitialized = true;
      console.log('🔐 Offline auth service initialized');
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
    }
  }

  // Register new user (works offline)
  async register(userData) {
    const { username, email, password } = userData;
    
    try {
      // Check if user already exists locally
      const existingUser = await this.getUserByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Create user locally
      const user = {
        id: uuidv4(),
        username,
        email,
        passwordHash: await this.hashPassword(password),
        createdAt: new Date().toISOString(),
        isVerified: false,
        synced: false,
        role: 'user'
      };

      // Store user locally
      await this.db.add('authUsers', user);
      
      // Create session
      const session = await this.createSession(user);
      
      // Set current user
      this.currentUser = { ...user };
      delete this.currentUser.passwordHash;
      
      // Notify listeners
      this.notifyAuthListeners('REGISTER', this.currentUser);
      
      // Queue for server sync if online
      if (networkStatus.getStatus()) {
        await this.syncUserToServer(user);
      } else {
        await notificationService.sendNotification('👤 Account Created Offline', {
          body: 'Your account will be synced when you\'re back online',
          tag: 'auth-offline'
        });
      }
      
      console.log('✅ User registered offline:', username);
      return { user: this.currentUser, session };
      
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  // Login user (offline-first)
  async login(credentials) {
    const { username, password } = credentials;
    
    try {
      // Try offline login first
      const user = await this.getUserByUsername(username);
      
      if (user && await this.verifyPassword(password, user.passwordHash)) {
        // Valid offline login
        const session = await this.createSession(user);
        
        this.currentUser = { ...user };
        delete this.currentUser.passwordHash;
        
        this.notifyAuthListeners('LOGIN', this.currentUser);
        
        // Try to sync with server if online
        if (networkStatus.getStatus()) {
          await this.syncLoginWithServer(credentials);
        }
        
        console.log('✅ Offline login successful:', username);
        return { user: this.currentUser, session };
      }
      
      // If offline login fails and we're online, try server
      if (networkStatus.getStatus()) {
        return await this.loginWithServer(credentials);
      }
      
      throw new Error('Invalid credentials');
      
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    if (!this.currentUser) return;
    
    try {
      // Clear current session
      await this.clearCurrentSession();
      
      // Clear tokens
      await this.clearTokens();
      
      // Clear current user
      const loggedOutUser = this.currentUser;
      this.currentUser = null;
      
      // Stop token refresh
      if (this.tokenRefreshInterval) {
        clearInterval(this.tokenRefreshInterval);
        this.tokenRefreshInterval = null;
      }
      
      // Notify listeners
      this.notifyAuthListeners('LOGOUT', loggedOutUser);
      
      console.log('✅ User logged out');
      
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.currentUser;
  }

  // Check if user has specific role
  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  // Subscribe to auth events
  onAuthChange(callback) {
    this.authListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  // Notify auth listeners
  notifyAuthListeners(event, user) {
    this.authListeners.forEach(callback => {
      try {
        callback(event, user);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  // Create user session
  async createSession(user) {
    const session = {
      id: uuidv4(),
      userId: user.id,
      token: this.generateToken(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      isActive: true
    };

    await this.db.add('sessions', session);
    await this.storeToken('session', session.token);
    
    return session;
  }

  // Get user by username
  async getUserByUsername(username) {
    const tx = this.db.transaction('authUsers', 'readonly');
    const index = tx.store.index('username');
    return await index.get(username);
  }

  // Hash password (simple implementation - use bcrypt in production)
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt'); // Add proper salt in production
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Verify password
  async verifyPassword(password, hash) {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  // Generate token
  generateToken() {
    return uuidv4() + '.' + Date.now() + '.' + Math.random().toString(36);
  }

  // Store token
  async storeToken(type, token) {
    await this.db.put('tokens', { type, token, createdAt: new Date().toISOString() });
  }

  // Get token
  async getToken(type) {
    const tokenData = await this.db.get('tokens', type);
    return tokenData ? tokenData.token : null;
  }

  // Clear tokens
  async clearTokens() {
    const tx = this.db.transaction('tokens', 'readwrite');
    await tx.store.clear();
  }

  // Clear current session
  async clearCurrentSession() {
    const sessionToken = await this.getToken('session');
    if (sessionToken) {
      const tx = this.db.transaction('sessions', 'readwrite');
      const index = tx.store.index('token');
      const session = await index.get(sessionToken);
      if (session) {
        await tx.store.delete(session.id);
      }
    }
  }

  // Restore session on app start
  async restoreSession() {
    try {
      const sessionToken = await this.getToken('session');
      if (!sessionToken) return;

      const tx = this.db.transaction('sessions', 'readonly');
      const index = tx.store.index('token');
      const session = await index.get(sessionToken);
      
      if (session && new Date(session.expiresAt) > new Date()) {
        // Valid session found
        const user = await this.db.get('authUsers', session.userId);
        if (user) {
          this.currentUser = { ...user };
          delete this.currentUser.passwordHash;
          
          console.log('🔐 Session restored for:', user.username);
          this.notifyAuthListeners('RESTORE', this.currentUser);
        }
      } else if (session) {
        // Expired session
        await this.clearCurrentSession();
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }
  }

  // Sync user to server
  async syncUserToServer(user) {
    try {
      // This would sync with your actual auth server
      console.log('🔄 Syncing user to server:', user.username);
      // Implementation depends on your backend API
    } catch (error) {
      console.error('Failed to sync user to server:', error);
    }
  }

  // Sync login with server
  async syncLoginWithServer(credentials) {
    try {
      // This would validate with your actual auth server
      console.log('🔄 Syncing login with server');
      // Implementation depends on your backend API
    } catch (error) {
      console.error('Failed to sync login with server:', error);
    }
  }

  // Login with server (when offline login fails)
  async loginWithServer(credentials) {
    try {
      // This would authenticate with your actual auth server
      console.log('🌐 Attempting server login');
      // Implementation depends on your backend API
      throw new Error('Server login not implemented');
    } catch (error) {
      console.error('Server login failed:', error);
      throw error;
    }
  }

  // Get auth statistics
  async getAuthStats() {
    const stats = {
      totalUsers: 0,
      activeSessions: 0,
      syncedUsers: 0,
      currentUser: this.currentUser ? this.currentUser.username : null
    };

    try {
      const users = await this.db.getAll('authUsers');
      const sessions = await this.db.getAll('sessions');
      
      stats.totalUsers = users.length;
      stats.syncedUsers = users.filter(u => u.synced).length;
      stats.activeSessions = sessions.filter(s => 
        new Date(s.expiresAt) > new Date()
      ).length;
    } catch (error) {
      console.error('Failed to get auth stats:', error);
    }

    return stats;
  }
}

// Export singleton instance
export const offlineAuthService = new OfflineAuthService();
export default offlineAuthService;
