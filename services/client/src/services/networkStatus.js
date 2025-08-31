// Network Status Service
class NetworkStatusService {
  constructor() {
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners(false);
    });
  }

  // Subscribe to network status changes
  subscribe(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  notifyListeners(isOnline) {
    this.listeners.forEach(callback => callback(isOnline));
  }

  // Check if online with actual network test
  async checkConnectivity() {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource to verify connectivity
      const response = await fetch(`${process.env.REACT_APP_USERS_SERVICE_URL}/health`, {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getStatus() {
    return this.isOnline;
  }
}

// Export singleton instance
export const networkStatus = new NetworkStatusService();
export default networkStatus;
