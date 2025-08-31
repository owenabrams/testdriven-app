import React, { Component } from 'react';
import { Route, Routes } from 'react-router-dom';
import axios from 'axios';
import socketService from './services/socketService';

// PWA Components and Services
import PWAManager from './pwa/PWAManager';
import { getCurrentConfig, getAppMode, isPWAEnabled } from './pwa/pwaConfig';
import PWAStatusBar from './components/PWAStatusBar';
import NotificationSystem from './components/NotificationSystem';

// Main Components
import UsersList from './components/UsersList';
import AddUser from './components/AddUser';
import About from './components/About';

class App extends Component {
  constructor() {
    super();
    this.state = {
      users: [],
      username: '',
      email: '',
      password: '',
      notifications: [],
      // PWA State
      pwaEnabled: isPWAEnabled(),
      appMode: getAppMode(),
      isOnline: navigator.onLine,
      syncStatus: 'idle',
      // Offline Storage
      offlineUsers: [],
      pendingSync: []
    };
    this.addUser = this.addUser.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  async componentDidMount() {
    // Initialize PWA features first
    await this.initializePWA();

    // Setup network monitoring
    this.setupNetworkMonitoring();

    // Load users (from API or offline storage)
    this.getUsers();

    // Setup SocketIO for real-time features
    this.setupSocketIO();
  }

  componentWillUnmount() {
    // Clean up socket connection
    socketService.disconnect();

    // Clean up network monitoring
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  /**
   * Initialize PWA features based on configuration
   */
  async initializePWA() {
    if (!this.state.pwaEnabled) {
      console.log('📱 PWA features disabled - running as standard web app');
      return;
    }

    try {
      console.log(`🚀 Initializing PWA in ${this.state.appMode} mode...`);
      const config = getCurrentConfig();
      console.log('📋 PWA Configuration:', config);
      console.log('🔍 PWA Manager object:', PWAManager);
      console.log('🔍 PWA Manager initialize method:', typeof PWAManager.initialize);

      await PWAManager.initialize(config);

      // Load offline users if offline storage was initialized
      if (config.offlineStorage) {
        console.log('💾 Loading offline users...');
        await this.loadOfflineUsers();
      }

      console.log('✅ PWA initialization complete');

      // Verify PWA Manager actually initialized
      const pwaStatus = PWAManager.getStatus();
      if (pwaStatus.initialized) {
        console.log('✅ PWA Manager verification successful');
        this.setState({
          appMode: getAppMode() + ' (Ready)',
          pwaEnabled: true
        });
      } else {
        console.error('❌ PWA Manager failed to initialize properly');
        throw new Error('PWA Manager initialization verification failed');
      }

    } catch (error) {
      console.error('❌ PWA initialization failed:', error);
      console.error('📋 Error details:', {
        message: error.message,
        stack: error.stack,
        config: getCurrentConfig()
      });

      // Show detailed error in notification
      this.addNotification(
        `PWA initialization failed: ${error.message}. Running in standard web app mode.`,
        'error',
        'PWA Initialization Error',
        { autoRemoveTime: 10000 }
      );

      // Gracefully degrade to standard web app
      this.setState({
        pwaEnabled: false,
        appMode: 'Standard Web App (PWA Failed: ' + error.message + ')'
      });
    }
  }

  /**
   * Load offline users from storage
   */
  async loadOfflineUsers() {
    try {
      console.log('🔍 Checking for offline storage service...');
      const offlineStorage = PWAManager.getService('offlineStorage');

      if (offlineStorage && offlineStorage.isInitialized()) {
        console.log('✅ Offline storage service found and initialized');
        try {
          const offlineUsers = await offlineStorage.getAllUsers();
          this.setState({ offlineUsers });
          console.log(`📦 Loaded ${offlineUsers.length} users from offline storage`);
        } catch (error) {
          console.error('❌ Failed to load users from offline storage:', error);
        }
      } else {
        console.warn('⚠️ Offline storage service not available or not initialized');
        console.log('📋 Available services:', Object.keys(PWAManager.services || {}));
      }
    } catch (error) {
      console.error('❌ Offline storage initialization failed:', error);
      console.error('📋 Available services:', Object.keys(PWAManager.services || {}));
    }
  }

  /**
   * Setup network monitoring for PWA features
   */
  setupNetworkMonitoring() {
    this.handleOnline = () => {
      console.log('🌐 Network: Online');
      this.setState({ isOnline: true });
      this.syncPendingData();
    };

    this.handleOffline = () => {
      console.log('📴 Network: Offline');
      this.setState({ isOnline: false });
    };

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  /**
   * Sync pending data when network comes back online
   */
  async syncPendingData() {
    if (!this.state.pwaEnabled || this.state.pendingSync.length === 0) {
      return;
    }

    this.setState({ syncStatus: 'syncing' });

    // Show sync progress notification
    this.addNotification(
      `Synchronizing ${this.state.pendingSync.length} items...`,
      'sync',
      'Background Sync',
      { persistent: true, progress: 0 }
    );

    try {
      const offlineStorage = PWAManager.getService('offlineStorage');
      if (offlineStorage && offlineStorage.isInitialized()) {
        // Get unsynced users
        const unsyncedUsers = await offlineStorage.getUnsyncedUsers();

        // Sync each user to the server
        for (const user of unsyncedUsers) {
          try {
            const response = await axios.post(`${process.env.REACT_APP_USERS_SERVICE_URL}/users`, {
              username: user.username,
              email: user.email,
              password: user.password
            });

            // Mark user as synced
            await offlineStorage.markUserSynced(user.id, response.data.data.user.id);
          } catch (syncError) {
            console.error('❌ Failed to sync user:', user.username, syncError);
          }
        }

        this.setState({ pendingSync: [], syncStatus: 'success' });

        // Remove sync notification and show success
        this.setState(prevState => ({
          notifications: prevState.notifications.filter(n => n.type !== 'sync')
        }));

        this.addNotification(
          `Synchronized ${unsyncedUsers.length} items successfully`,
          'success',
          'Sync Complete'
        );

        // Refresh users list
        this.getUsers();
      } else {
        throw new Error('Offline storage service not available');
      }
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.setState({ syncStatus: 'error' });

      // Remove sync notification and show error
      this.setState(prevState => ({
        notifications: prevState.notifications.filter(n => n.type !== 'sync')
      }));

      this.addNotification(
        'Synchronization failed. Will retry automatically.',
        'error',
        'Sync Error'
      );
    }

    // Reset sync status after 3 seconds
    setTimeout(() => {
      this.setState({ syncStatus: 'idle' });
    }, 3000);
  }

  setupSocketIO() {
    // Connect to SocketIO server
    socketService.connect();

    // Listen for real-time user additions
    socketService.onUserAdded((data) => {
      console.log('🔔 Real-time user added:', data);
      // Refresh users list to show new user
      this.getUsers();
      this.addNotification(
        `${data.user.username} joined the platform`,
        'realtime',
        'New User Added'
      );
    });

    // Listen for real-time user updates
    socketService.onUserUpdated((data) => {
      console.log('🔔 Real-time user updated:', data);
      this.getUsers();
      this.addNotification(
        `${data.user.username} updated their profile`,
        'realtime',
        'User Updated'
      );
    });

    // Listen for general notifications
    socketService.onNotification((data) => {
      console.log('🔔 Real-time notification:', data);
      this.addNotification(data.message, 'realtime', data.title || 'Real-time Update');
    });
  }

  addNotification(message, type = 'info', title = null, options = {}) {
    const notification = {
      id: Date.now() + Math.random(), // Ensure uniqueness
      message,
      type,
      title,
      timestamp: new Date().toISOString(),
      progress: options.progress,
      persistent: options.persistent || false
    };

    this.setState(prevState => ({
      notifications: [...prevState.notifications, notification]
    }));

    // Auto-remove notification after specified time (default 5 seconds)
    if (!notification.persistent) {
      const autoRemoveTime = options.autoRemoveTime || 5000;
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, autoRemoveTime);
    }
  }

  removeNotification(id) {
    this.setState(prevState => ({
      notifications: prevState.notifications.filter(n => n.id !== id)
    }));
  }

  /**
   * Toggle PWA status display
   */
  togglePWAStatus = () => {
    this.setState(prevState => ({
      showPWAStatus: !prevState.showPWAStatus
    }));
  }



  /**
   * Manual sync trigger
   */
  triggerSync = async () => {
    if (this.state.isOnline && this.state.pwaEnabled) {
      await this.syncPendingData();
    }
  }

  /**
   * Get users with PWA offline support
   */
  async getUsers() {
    try {
      if (this.state.isOnline) {
        // Online: fetch from API
        const response = await axios.get(`${process.env.REACT_APP_USERS_SERVICE_URL}/users`);
        const users = response.data.data.users;
        this.setState({ users });

        // If PWA enabled, also update offline storage
        if (this.state.pwaEnabled) {
          const usersPWAService = PWAManager.getService('usersPWAService');
          if (usersPWAService) {
            await usersPWAService.saveAll(users);
            this.setState({ offlineUsers: users });
          }
        }
      } else if (this.state.pwaEnabled) {
        // Offline: load from offline storage
        const usersPWAService = PWAManager.getService('usersPWAService');
        if (usersPWAService) {
          const offlineUsers = await usersPWAService.getAll();
          this.setState({ users: offlineUsers, offlineUsers });
          this.addNotification(
            `Showing ${offlineUsers.length} cached users`,
            'offline',
            'Offline Mode'
          );
        }
      } else {
        // Offline without PWA: show empty state
        this.setState({ users: [] });
        this.addNotification(
          'No internet connection. Enable PWA features for offline support.',
          'error',
          'Connection Error'
        );
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);

      // Fallback to offline storage if available
      if (this.state.pwaEnabled) {
        const usersPWAService = PWAManager.getService('usersPWAService');
        if (usersPWAService) {
          const offlineUsers = await usersPWAService.getAll();
          this.setState({ users: offlineUsers, offlineUsers });
          this.addNotification(
            `API unavailable. Showing ${offlineUsers.length} cached users.`,
            'warning',
            'Fallback Mode'
          );
        }
      }
    }
  }

  /**
   * Add user with PWA offline support
   */
  async addUser(event) {
    event.preventDefault();
    const userData = {
      username: this.state.username,
      email: this.state.email,
      password: this.state.password
    };

    try {
      if (this.state.isOnline) {
        // Online: send to API
        await axios.post(`${process.env.REACT_APP_USERS_SERVICE_URL}/users`, userData);
        this.getUsers();
        this.setState({ username: '', email: '', password: '' });
        this.addNotification(
          `${userData.username} has been added to the platform`,
          'success',
          'User Created'
        );
      } else if (this.state.pwaEnabled) {
        // Offline: save to offline storage for later sync
        const offlineStorage = PWAManager.getService('offlineStorage');
        if (offlineStorage && offlineStorage.isInitialized()) {
          const tempUser = {
            id: Date.now(), // Temporary ID
            ...userData,
            createdAt: new Date().toISOString(),
            synced: false
          };

          try {
            await offlineStorage.addUser(tempUser);
            this.setState(prevState => ({
              users: [...prevState.users, tempUser],
              offlineUsers: [...prevState.offlineUsers, tempUser],
              pendingSync: [...prevState.pendingSync, tempUser],
              username: '',
              email: '',
              password: ''
            }));

            this.addNotification(
              `${userData.username} saved locally and will sync when online`,
              'offline',
              'Offline Save'
            );
          } catch (error) {
            console.error('❌ Failed to save user offline:', error);
            this.addNotification(
              'Failed to save user offline',
              'error',
              'Offline Save Error'
            );
          }
        } else {
          this.addNotification(
            'Offline storage not available',
            'error',
            'Offline Error'
          );
        }
      } else {
        // Offline without PWA: show error
        this.addNotification(
          'Cannot add users while offline. Enable PWA features for offline support.',
          'error',
          'Offline Error'
        );
      }
    } catch (error) {
      console.error('❌ Error adding user:', error);
      this.addNotification(
        'Failed to add user. Please try again.',
        'error',
        'Add User Error'
      );
    }
  }

  handleChange(event) {
    const obj = {};
    obj[event.target.name] = event.target.value;
    this.setState(obj);
  }
  render() {
    const {
      users, username, email, password, notifications,
      pwaEnabled, appMode, isOnline, syncStatus,
      offlineUsers, pendingSync
    } = this.state;

    return (
      <section className="section">
        <div className="container">
          {/* Professional PWA Status Bar */}
          <PWAStatusBar
            appMode={appMode}
            isOnline={isOnline}
            syncStatus={syncStatus}
            pendingSync={pendingSync}
            pwaEnabled={pwaEnabled}
            onTogglePWAStatus={this.togglePWAStatus}

            onTriggerSync={this.triggerSync}
          />



          {/* Professional Notification System */}
          <NotificationSystem
            notifications={notifications}
            onRemoveNotification={this.removeNotification}
          />

          {/* Main Content */}
          <div className="columns">
            <div className="column">
              <Routes>
                <Route path='/' element={
                  <div>
                    {/* Page Header */}
                    <div className="hero is-light" style={{ borderRadius: '8px', marginBottom: '2rem' }}>
                      <div className="hero-body">
                        <div className="level">
                          <div className="level-left">
                            <div className="level-item">
                              <div>
                                <h1 className="title is-2">👥 User Management</h1>
                                <p className="subtitle is-5">
                                  Manage users with real-time updates and offline support
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="level-right">
                            <div className="level-item">
                              <div className="tags">
                                <span className="tag is-primary">
                                  {users.length} Users
                                </span>
                                {pwaEnabled && offlineUsers.length > 0 && (
                                  <span className="tag is-info">
                                    {offlineUsers.length} Cached
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Offline Mode Banner */}
                    {!isOnline && (
                      <div className="notification is-warning" style={{ borderRadius: '8px' }}>
                        <div className="level">
                          <div className="level-left">
                            <div className="level-item">
                              <span className="icon is-large">
                                <span style={{ fontSize: '2rem' }}>📴</span>
                              </span>
                            </div>
                            <div className="level-item">
                              <div>
                                <p className="has-text-weight-semibold">Offline Mode Active</p>
                                <p className="is-size-7">
                                  {pwaEnabled
                                    ? `Showing ${offlineUsers.length} cached users. New users will sync when online.`
                                    : 'Limited functionality available. Enable PWA features for offline support.'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Content Grid */}
                    <div className="columns">
                      <div className="column is-5">
                        <div className="box" style={{ borderRadius: '8px' }}>
                          <h2 className="title is-4">➕ Add New User</h2>
                          <AddUser
                            username={username}
                            email={email}
                            password={password}
                            addUser={this.addUser}
                            handleChange={this.handleChange}
                          />
                        </div>
                      </div>
                      <div className="column is-7">
                        <div className="box" style={{ borderRadius: '8px' }}>
                          <h2 className="title is-4">📋 Users List</h2>
                          <UsersList users={users}/>
                        </div>
                      </div>
                    </div>
                  </div>
                } />
                <Route path='/about' element={<About/>}/>
                <Route path='/pwa-test' element={
                  <div>
                    <div className="hero is-light" style={{ borderRadius: '8px', marginBottom: '2rem' }}>
                      <div className="hero-body">
                        <h1 className="title is-2">🧪 PWA Testing</h1>
                        <p className="subtitle is-5">
                          Test and debug Progressive Web App functionality
                        </p>
                      </div>
                    </div>

                  </div>
                }/>
              </Routes>
            </div>
          </div>


        </div>
      </section>
    );
  }
}

export default App;
