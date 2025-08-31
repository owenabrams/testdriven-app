import React, { Component } from 'react';
import { getCurrentConfig, getAppMode, isPWAEnabled } from '../pwa/pwaConfig';

class PWAStatusBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showDropdown: false,
      lastSyncTime: null
    };
  }

  componentDidMount() {
    // Update last sync time when sync completes
    if (this.props.syncStatus === 'success') {
      this.setState({ lastSyncTime: new Date() });
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.syncStatus !== 'success' && this.props.syncStatus === 'success') {
      this.setState({ lastSyncTime: new Date() });
    }
  }

  toggleDropdown = () => {
    this.setState(prevState => ({
      showDropdown: !prevState.showDropdown
    }));
  }

  formatLastSync() {
    if (!this.state.lastSyncTime) return 'Never';
    const now = new Date();
    const diff = Math.floor((now - this.state.lastSyncTime) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }

  render() {
    const {
      appMode, isOnline, syncStatus, pendingSync,
      onTogglePWAStatus, onTriggerSync, onTogglePWASettings, pwaEnabled
    } = this.props;
    const { showDropdown } = this.state;

    return (
      <div className="navbar is-light" style={{ 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div className="navbar-brand">
          <div className="navbar-item">
            <div className="level">
              <div className="level-left">
                <div className="level-item">
                  <span className="icon-text">
                    <span className="icon">
                      <span>📱</span>
                    </span>
                    <span className="has-text-weight-semibold">{appMode}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="navbar-menu">
          <div className="navbar-start">
            {/* Network Status */}
            <div className="navbar-item">
              <div className="field is-grouped">
                <div className="control">
                  <span className={`tag ${isOnline ? 'is-success' : 'is-danger'}`}>
                    <span className="icon">
                      <span>{isOnline ? '🌐' : '📴'}</span>
                    </span>
                    <span>{isOnline ? 'Online' : 'Offline'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Sync Status */}
            {pwaEnabled && (
              <div className="navbar-item">
                <div className="field is-grouped">
                  <div className="control">
                    <span className={`tag ${
                      syncStatus === 'success' ? 'is-success' : 
                      syncStatus === 'error' ? 'is-danger' : 
                      syncStatus === 'syncing' ? 'is-warning' : 'is-light'
                    }`}>
                      <span className="icon">
                        <span>
                          {syncStatus === 'syncing' ? '🔄' : 
                           syncStatus === 'success' ? '✅' :
                           syncStatus === 'error' ? '❌' : '💤'}
                        </span>
                      </span>
                      <span>
                        {syncStatus === 'syncing' ? 'Syncing...' : 
                         syncStatus === 'success' ? 'Synced' :
                         syncStatus === 'error' ? 'Error' : 'Idle'}
                      </span>
                    </span>
                  </div>
                  {syncStatus === 'success' && (
                    <div className="control">
                      <span className="tag is-light is-small">
                        {this.formatLastSync()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Sync Counter */}
            {pwaEnabled && pendingSync && pendingSync.length > 0 && (
              <div className="navbar-item">
                <span className="tag is-warning">
                  <span className="icon">
                    <span>⏳</span>
                  </span>
                  <span>{pendingSync.length} pending</span>
                </span>
              </div>
            )}
          </div>

          <div className="navbar-end">
            {/* Sync Button */}
            {pwaEnabled && pendingSync && pendingSync.length > 0 && (
              <div className="navbar-item">
                <button 
                  className={`button is-primary is-small ${syncStatus === 'syncing' ? 'is-loading' : ''}`}
                  onClick={onTriggerSync}
                  disabled={!isOnline || syncStatus === 'syncing'}
                >
                  <span className="icon">
                    <span>🔄</span>
                  </span>
                  <span>Sync Now</span>
                </button>
              </div>
            )}

            {/* PWA Controls Dropdown */}
            <div className={`navbar-item has-dropdown ${showDropdown ? 'is-active' : ''}`}>
              <a 
                className="navbar-link is-arrowless"
                onClick={this.toggleDropdown}
                style={{ cursor: 'pointer' }}
              >
                <span className="icon-text">
                  <span className="icon">
                    <span>⚙️</span>
                  </span>
                  <span>PWA</span>
                </span>
              </a>

              <div className="navbar-dropdown is-right">
                <a
                  className="navbar-item"
                  onClick={() => {
                    onTogglePWAStatus();
                    this.toggleDropdown();
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="icon-text">
                    <span className="icon">
                      <span>📊</span>
                    </span>
                    <span>Diagnostics</span>
                  </span>
                </a>

                <a
                  className="navbar-item"
                  onClick={() => {
                    onTogglePWASettings();
                    this.toggleDropdown();
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="icon-text">
                    <span className="icon">
                      <span>⚙️</span>
                    </span>
                    <span>Settings</span>
                  </span>
                </a>

                <hr className="navbar-divider" />
                
                <div className="navbar-item">
                  <div className="content is-small">
                    <p className="has-text-grey">
                      <strong>Last Sync:</strong><br/>
                      {this.formatLastSync()}
                    </p>
                  </div>
                </div>
                
                {!isOnline && (
                  <div className="navbar-item">
                    <div className="notification is-warning is-light">
                      <p className="is-size-7">
                        📴 Offline mode active
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default PWAStatusBar;
