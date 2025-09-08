# services/users/project/api/notifications.py

from flask import Blueprint, jsonify, request
from sqlalchemy import exc, desc
from datetime import datetime

from project.api.models import User, Service, Notification
from project import db
from project.api.utils import authenticate

notifications_blueprint = Blueprint('notifications', __name__)


@notifications_blueprint.route('/notifications', methods=['POST'])
@authenticate
def create_notification(user_id):
    """Create a new notification"""
    post_data = request.get_json()
    response_object = {'status': 'fail', 'message': 'Invalid payload.'}

    if not post_data:
        return jsonify(response_object), 400

    target_user_id = post_data.get('userId')
    message = post_data.get('message')
    notification_type = post_data.get('type', 'info')
    title = post_data.get('title')
    service_id = post_data.get('serviceId')
    action_url = post_data.get('actionUrl')
    action_data = post_data.get('actionData')

    if not target_user_id or not message:
        response_object['message'] = 'User ID and message are required.'
        return jsonify(response_object), 400

    # Validate target user exists
    target_user = User.query.filter_by(id=target_user_id).first()
    if not target_user:
        response_object['message'] = 'Target user not found.'
        return jsonify(response_object), 404

    # Validate service if provided
    if service_id:
        service = Service.query.filter_by(id=service_id).first()
        if not service:
            response_object['message'] = 'Service not found.'
            return jsonify(response_object), 404

    # Validate notification type
    valid_types = ['info', 'warning', 'error', 'success']
    if notification_type not in valid_types:
        response_object['message'] = f'Invalid notification type. Must be one of: {", ".join(valid_types)}'
        return jsonify(response_object), 400

    try:
        notification = Notification(
            user_id=target_user_id,
            message=message,
            type=notification_type,
            title=title,
            service_id=service_id,
            created_by=user_id,
            action_url=action_url,
            action_data=action_data
        )

        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Notification created successfully.',
            'data': notification.to_json()
        }), 201

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify(response_object), 400


@notifications_blueprint.route('/notifications/user/<int:target_user_id>', methods=['GET'])
@authenticate
def get_user_notifications(user_id, target_user_id):
    """Get notifications for a specific user"""
    # Users can only see their own notifications unless they're admin
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({'status': 'fail', 'message': 'User not found.'}), 404

    # Check permissions
    if user_id != target_user_id and not user.admin and not user.is_super_admin:
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    # Get query parameters
    unread_only = request.args.get('unread', 'false').lower() == 'true'
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    # Build query
    query = Notification.query.filter_by(user_id=target_user_id)
    
    if unread_only:
        query = query.filter_by(read=False)
    
    # Filter out expired notifications
    query = query.filter(
        (Notification.expires_at.is_(None)) | 
        (Notification.expires_at > datetime.utcnow())
    )
    
    # Order by creation date (newest first)
    query = query.order_by(desc(Notification.created_date))
    
    # Apply pagination
    notifications = query.offset(offset).limit(limit).all()
    total_count = query.count()

    return jsonify({
        'status': 'success',
        'data': [notification.to_json() for notification in notifications],
        'pagination': {
            'total': total_count,
            'limit': limit,
            'offset': offset,
            'has_more': (offset + limit) < total_count
        }
    }), 200


@notifications_blueprint.route('/notifications/<int:notification_id>/read', methods=['POST'])
@authenticate
def mark_notification_read(user_id, notification_id):
    """Mark a notification as read"""
    notification = Notification.query.filter_by(id=notification_id).first()
    
    if not notification:
        return jsonify({'status': 'fail', 'message': 'Notification not found.'}), 404

    # Users can only mark their own notifications as read
    if notification.user_id != user_id:
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    if notification.read:
        return jsonify({
            'status': 'success',
            'message': 'Notification already marked as read.'
        }), 200

    try:
        notification.mark_as_read()
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Notification marked as read.',
            'data': notification.to_json()
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to update notification.'}), 400


@notifications_blueprint.route('/notifications/user/<int:target_user_id>/mark-all-read', methods=['POST'])
@authenticate
def mark_all_notifications_read(user_id, target_user_id):
    """Mark all notifications as read for a user"""
    # Users can only mark their own notifications as read
    if user_id != target_user_id:
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    try:
        # Update all unread notifications for the user
        updated_count = Notification.query.filter_by(
            user_id=target_user_id, 
            read=False
        ).update({
            'read': True,
            'read_date': datetime.utcnow()
        })

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'Marked {updated_count} notifications as read.'
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to update notifications.'}), 400


@notifications_blueprint.route('/notifications/user/<int:target_user_id>/unread-count', methods=['GET'])
@authenticate
def get_unread_count(user_id, target_user_id):
    """Get count of unread notifications for a user"""
    # Users can only see their own unread count
    if user_id != target_user_id:
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    unread_count = Notification.query.filter_by(
        user_id=target_user_id, 
        read=False
    ).filter(
        (Notification.expires_at.is_(None)) | 
        (Notification.expires_at > datetime.utcnow())
    ).count()

    return jsonify({
        'status': 'success',
        'data': {
            'unread_count': unread_count
        }
    }), 200


@notifications_blueprint.route('/notifications/<int:notification_id>', methods=['DELETE'])
@authenticate
def delete_notification(user_id, notification_id):
    """Delete a notification"""
    notification = Notification.query.filter_by(id=notification_id).first()
    
    if not notification:
        return jsonify({'status': 'fail', 'message': 'Notification not found.'}), 404

    # Users can only delete their own notifications
    if notification.user_id != user_id:
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    try:
        db.session.delete(notification)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Notification deleted successfully.'
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to delete notification.'}), 400


# Helper function for other services to create notifications
def create_system_notification(user_id, message, notification_type='info', title=None, service_id=None, action_url=None, action_data=None):
    """
    Helper function for other services to create notifications programmatically
    
    Args:
        user_id: Target user ID
        message: Notification message
        notification_type: Type of notification (info, warning, error, success)
        title: Optional title
        service_id: Optional service ID for context
        action_url: Optional URL for action button
        action_data: Optional JSON data for actions
    
    Returns:
        Notification object or None if failed
    """
    try:
        notification = Notification(
            user_id=user_id,
            message=message,
            type=notification_type,
            title=title,
            service_id=service_id,
            action_url=action_url,
            action_data=action_data
        )

        db.session.add(notification)
        db.session.commit()
        
        return notification

    except Exception as e:
        db.session.rollback()
        print(f"Failed to create system notification: {e}")
        return None