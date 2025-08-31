import React, { Component } from 'react';

class NotificationSystem extends Component {
  getNotificationIcon(type) {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'sync': return '🔄';
      case 'offline': return '📴';
      case 'realtime': return '🔔';
      default: return 'ℹ️';
    }
  }

  getNotificationClass(type) {
    switch (type) {
      case 'success': return 'is-success';
      case 'error': return 'is-danger';
      case 'warning': return 'is-warning';
      case 'info': return 'is-info';
      case 'sync': return 'is-primary';
      case 'offline': return 'is-warning';
      case 'realtime': return 'is-link';
      default: return 'is-info';
    }
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  render() {
    const { notifications, onRemoveNotification } = this.props;

    if (!notifications || notifications.length === 0) {
      return null;
    }

    return (
      <div 
        className="notifications-container" 
        style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          zIndex: 1000,
          maxWidth: '400px'
        }}
      >
        {notifications.map((notification, index) => (
          <div 
            key={notification.id}
            className={`notification ${this.getNotificationClass(notification.type)}`}
            style={{ 
              marginBottom: '10px',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              animation: `slideInRight 0.3s ease-out ${index * 0.1}s both`,
              transform: 'translateX(100%)',
              opacity: 0
            }}
          >
            <button 
              className="delete"
              onClick={() => onRemoveNotification(notification.id)}
              style={{ 
                position: 'absolute',
                top: '8px',
                right: '8px'
              }}
            ></button>
            
            <div className="level">
              <div className="level-left">
                <div className="level-item">
                  <span className="icon is-medium">
                    <span style={{ fontSize: '1.5rem' }}>
                      {this.getNotificationIcon(notification.type)}
                    </span>
                  </span>
                </div>
                <div className="level-item">
                  <div>
                    <p className="has-text-weight-semibold">
                      {notification.title || this.getNotificationTitle(notification.type)}
                    </p>
                    <p className="is-size-7">
                      {notification.message}
                    </p>
                  </div>
                </div>
              </div>
              <div className="level-right">
                <div className="level-item">
                  <span className="tag is-light is-small">
                    {this.formatTimestamp(notification.timestamp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar for sync operations */}
            {notification.type === 'sync' && notification.progress !== undefined && (
              <progress 
                className="progress is-small is-primary" 
                value={notification.progress} 
                max="100"
              >
                {notification.progress}%
              </progress>
            )}
          </div>
        ))}

        {/* CSS Animation */}
        <style jsx>{`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          .notifications-container .notification {
            transition: all 0.3s ease;
          }
          
          .notifications-container .notification:hover {
            transform: translateX(-5px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
          }
        `}</style>
      </div>
    );
  }

  getNotificationTitle(type) {
    switch (type) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warning': return 'Warning';
      case 'info': return 'Information';
      case 'sync': return 'Synchronizing';
      case 'offline': return 'Offline Mode';
      case 'realtime': return 'Real-time Update';
      default: return 'Notification';
    }
  }
}

export default NotificationSystem;
