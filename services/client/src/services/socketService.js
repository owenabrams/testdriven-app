// services/client/src/services/socketService.js
// Real-time service for Chat, Live Dashboard, and Notifications

import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.currentRoom = null;
    this.username = null;
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    // Connect to Flask-SocketIO server
    this.socket = io(process.env.REACT_APP_USERS_SERVICE_URL || 'http://localhost:5001', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('🔌 Connected to real-time server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from real-time server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Real-time connection error:', error);
      this.isConnected = false;
    });

    this.socket.on('status', (data) => {
      console.log('📡 Server status:', data.msg);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
      this.currentRoom = null;
      console.log('🔌 Disconnected from real-time server');
    }
  }

  // GENERIC EVENT MANAGEMENT
  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }
    
    this.socket.on(event, callback);
    
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
    }
  }

  // CHAT FUNCTIONALITY
  joinChat(room = 'general', username = 'Anonymous') {
    this.currentRoom = room;
    this.username = username;
    this.emit('join_chat', { room, username });
  }

  leaveChat(room = null, username = null) {
    const chatRoom = room || this.currentRoom;
    const chatUsername = username || this.username;
    this.emit('leave_chat', { room: chatRoom, username: chatUsername });
    if (room === this.currentRoom) {
      this.currentRoom = null;
    }
  }

  sendMessage(message, room = null, username = null) {
    const chatRoom = room || this.currentRoom || 'general';
    const chatUsername = username || this.username || 'Anonymous';
    this.emit('send_message', {
      room: chatRoom,
      username: chatUsername,
      message,
      timestamp: new Date().toISOString()
    });
  }

  onChatMessage(callback) {
    this.on('new_message', callback);
  }

  onChatStatus(callback) {
    this.on('chat_status', callback);
  }

  // LIVE DASHBOARD FUNCTIONALITY
  joinDashboard() {
    this.emit('join_dashboard');
  }

  leaveDashboard() {
    this.emit('leave_dashboard');
  }

  onDashboardUpdate(callback) {
    this.on('dashboard_update', callback);
  }

  onDashboardStatus(callback) {
    this.on('dashboard_status', callback);
  }

  // USER REAL-TIME UPDATES
  onUserAdded(callback) {
    this.on('user_added', callback);
  }

  onUserUpdated(callback) {
    this.on('user_updated', callback);
  }

  // NOTIFICATION FUNCTIONALITY
  subscribeToNotifications(type = 'all') {
    this.emit('subscribe_notifications', { type });
  }

  onNotification(callback) {
    this.on('notification', callback);
  }

  onNotificationStatus(callback) {
    this.on('notification_status', callback);
  }

  // UTILITY METHODS
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getUsername() {
    return this.username;
  }

  setUsername(username) {
    this.username = username;
  }

  getSocket() {
    return this.socket;
  }

  // CONVENIENCE METHODS FOR COMMON PATTERNS
  setupForChat(username, room = 'general') {
    this.connect();
    this.setUsername(username);
    this.joinChat(room, username);
    this.subscribeToNotifications('all');
  }

  setupForDashboard() {
    this.connect();
    this.joinDashboard();
    this.subscribeToNotifications('user_updates');
  }

  setupForNotifications(type = 'all') {
    this.connect();
    this.subscribeToNotifications(type);
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
