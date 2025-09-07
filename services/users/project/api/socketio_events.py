# services/users/project/api/socketio_events.py

from flask_socketio import emit, join_room, leave_room, rooms
from project import socketio


@socketio.on('connect')
def handle_connect():
    """Handle client connection for real-time features"""
    print('🔌 Client connected for real-time features')
    emit('status', {'msg': 'Connected to real-time server', 'type': 'success'})


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print('🔌 Client disconnected from real-time server')


# CHAT FUNCTIONALITY
@socketio.on('join_chat')
def handle_join_chat(data):
    """Handle client joining chat room"""
    room = data.get('room', 'general')
    username = data.get('username', 'Anonymous')
    join_room(room)
    emit('chat_status', {
        'msg': f'{username} joined the chat',
        'type': 'info',
        'room': room
    }, room=room)
    print(f'💬 {username} joined chat room: {room}')


@socketio.on('leave_chat')
def handle_leave_chat(data):
    """Handle client leaving chat room"""
    room = data.get('room', 'general')
    username = data.get('username', 'Anonymous')
    leave_room(room)
    emit('chat_status', {
        'msg': f'{username} left the chat',
        'type': 'info',
        'room': room
    }, room=room)
    print(f'💬 {username} left chat room: {room}')


@socketio.on('send_message')
def handle_send_message(data):
    """Handle chat message sending"""
    room = data.get('room', 'general')
    username = data.get('username', 'Anonymous')
    message = data.get('message', '')
    timestamp = data.get('timestamp')

    if message.strip():
        emit('new_message', {
            'username': username,
            'message': message,
            'timestamp': timestamp,
            'room': room
        }, room=room)
        print(f'💬 Message in {room}: {username}: {message}')


# LIVE DASHBOARD FUNCTIONALITY
@socketio.on('join_dashboard')
def handle_join_dashboard():
    """Handle client joining live dashboard"""
    join_room('dashboard')
    emit('dashboard_status', {
        'msg': 'Connected to live dashboard',
        'type': 'success'
    })
    print('📊 Client joined live dashboard')


@socketio.on('leave_dashboard')
def handle_leave_dashboard():
    """Handle client leaving live dashboard"""
    leave_room('dashboard')
    print('📊 Client left live dashboard')


# NOTIFICATION FUNCTIONALITY
@socketio.on('subscribe_notifications')
def handle_subscribe_notifications(data):
    """Handle client subscribing to notifications"""
    notification_type = data.get('type', 'all')  # 'all', 'user_updates', 'system'
    join_room(f'notifications_{notification_type}')
    emit('notification_status', {
        'msg': f'Subscribed to {notification_type} notifications',
        'type': 'success'
    })
    print(f'🔔 Client subscribed to {notification_type} notifications')


# UTILITY FUNCTIONS FOR BROADCASTING
def broadcast_user_added(user_data):
    """Broadcast when a new user is added"""
    socketio.emit('user_added', {
        'user': user_data,
        'message': f'New user {user_data.get("username")} added!',
        'timestamp': user_data.get('created_date'),
        'type': 'user_update'
    }, room='dashboard')

    # Also send as notification
    socketio.emit('notification', {
        'message': f'🆕 New user: {user_data.get("username")}',
        'type': 'success',
        'category': 'user_updates'
    }, room='notifications_all')

    socketio.emit('notification', {
        'message': f'🆕 New user: {user_data.get("username")}',
        'type': 'success',
        'category': 'user_updates'
    }, room='notifications_user_updates')


def broadcast_user_updated(user_data):
    """Broadcast when a user is updated"""
    socketio.emit('user_updated', {
        'user': user_data,
        'message': f'User {user_data.get("username")} updated',
        'type': 'user_update'
    }, room='dashboard')


def broadcast_system_notification(message, notification_type='info'):
    """Broadcast system-wide notifications"""
    socketio.emit('notification', {
        'message': message,
        'type': notification_type,
        'category': 'system',
        'timestamp': None
    }, room='notifications_all')

    socketio.emit('notification', {
        'message': message,
        'type': notification_type,
        'category': 'system',
        'timestamp': None
    }, room='notifications_system')


def broadcast_to_dashboard(event_type, data):
    """Generic function to broadcast data to live dashboard"""
    socketio.emit('dashboard_update', {
        'event_type': event_type,
        'data': data,
        'timestamp': None
    }, room='dashboard')


# CHAT UTILITY FUNCTIONS
def broadcast_chat_message(room, username, message, timestamp=None):
    """Utility to broadcast chat messages"""
    socketio.emit('new_message', {
        'username': username,
        'message': message,
        'timestamp': timestamp,
        'room': room
    }, room=room)


def get_room_users(room):
    """Get list of users in a room (for chat functionality)"""
    # This would typically integrate with a user session store
    # For now, return the room info
    return rooms()
