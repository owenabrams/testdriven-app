# services/users/project/api/admin.py

from flask import Blueprint, jsonify, request
from sqlalchemy import exc

from project.api.models import User, Service, ServiceAdmin, UserServicePermission, ServiceAccessRequest
from project import db
from project.api.utils import authenticate, admin_required

admin_blueprint = Blueprint('admin', __name__)


def super_admin_required(f):
    """Decorator to require super admin access - use after @authenticate"""
    from functools import wraps

    @wraps(f)
    def decorated_function(user_id, *args, **kwargs):
        user = User.query.filter_by(id=user_id).first()
        if not user or not user.is_super_admin:
            return jsonify({'status': 'fail', 'message': 'Super admin access required.'}), 403

        return f(user_id, *args, **kwargs)
    return decorated_function


def service_admin_required(service_name=None):
    """Decorator to require service admin access - use after @authenticate"""
    def decorator(f):
        from functools import wraps

        @wraps(f)
        def decorated_function(user_id, *args, **kwargs):
            user = User.query.filter_by(id=user_id).first()
            if not user:
                return jsonify({'status': 'fail', 'message': 'User not found.'}), 404

            # Super admin has access to everything
            if user.is_super_admin:
                return f(user_id, *args, **kwargs)

            # Check if user is admin of the specific service
            if service_name:
                if not user.is_service_admin(service_name):
                    return jsonify({'status': 'fail', 'message': f'Admin access required for {service_name} service.'}), 403

            return f(user_id, *args, **kwargs)
        return decorated_function
    return decorator


# Test endpoint
@admin_blueprint.route('/admin/test', methods=['GET'])
@authenticate
def test_admin_auth(user_id):
    """Test admin authentication"""
    user = User.query.filter_by(id=user_id).first()
    return jsonify({
        'status': 'success',
        'message': f'Authenticated as user {user.username}',
        'user_id': user_id,
        'is_super_admin': user.is_super_admin if user else False
    }), 200


# Super Admin Endpoints
@admin_blueprint.route('/admin/users', methods=['GET'])
@authenticate
@super_admin_required
def get_all_users(user_id):
    """Get all users (super admin only)"""
    users = User.query.all()
    return jsonify({
        'status': 'success',
        'data': {
            'users': [user.to_json() for user in users]
        }
    }), 200


@admin_blueprint.route('/admin/services', methods=['GET'])
@authenticate
@admin_required
def get_all_services(user_id):
    """Get all services"""
    services = Service.query.all()
    return jsonify({
        'status': 'success',
        'data': {
            'services': [service.to_json() for service in services]
        }
    }), 200


@admin_blueprint.route('/admin/services', methods=['POST'])
@authenticate
@super_admin_required
def create_service(user_id):
    """Create a new service (super admin only)"""
    post_data = request.get_json()
    response_object = {'status': 'fail', 'message': 'Invalid payload.'}

    if not post_data:
        return jsonify(response_object), 400

    name = post_data.get('name')
    description = post_data.get('description')
    endpoint_url = post_data.get('endpoint_url')

    if not name:
        response_object['message'] = 'Service name is required.'
        return jsonify(response_object), 400

    # Check if service already exists
    existing_service = Service.query.filter_by(name=name).first()
    if existing_service:
        response_object['message'] = 'Service already exists.'
        return jsonify(response_object), 400

    try:
        new_service = Service(
            name=name,
            description=description,
            endpoint_url=endpoint_url
        )
        db.session.add(new_service)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Service created successfully.',
            'data': {'service': new_service.to_json()}
        }), 201

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify(response_object), 400


@admin_blueprint.route('/admin/service-admins', methods=['POST'])
@authenticate
@super_admin_required
def assign_service_admin(user_id):
    """Assign a user as admin of a service (super admin only)"""
    post_data = request.get_json()
    response_object = {'status': 'fail', 'message': 'Invalid payload.'}

    if not post_data:
        return jsonify(response_object), 400

    target_user_id = post_data.get('user_id')
    service_id = post_data.get('service_id')

    if not target_user_id or not service_id:
        response_object['message'] = 'User ID and Service ID are required.'
        return jsonify(response_object), 400

    # Check if user and service exist
    user = User.query.filter_by(id=target_user_id).first()
    service = Service.query.filter_by(id=service_id).first()

    if not user or not service:
        response_object['message'] = 'User or service not found.'
        return jsonify(response_object), 404

    # Check if assignment already exists
    existing_assignment = ServiceAdmin.query.filter_by(
        user_id=target_user_id, service_id=service_id
    ).first()

    if existing_assignment:
        response_object['message'] = 'User is already admin of this service.'
        return jsonify(response_object), 400

    try:
        # Update user role
        user.role = 'service_admin'
        user.admin = True

        # Create service admin assignment
        service_admin = ServiceAdmin(
            user_id=target_user_id,
            service_id=service_id,
            granted_by=user_id
        )

        db.session.add(service_admin)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'User {user.username} assigned as admin of {service.name}.'
        }), 201

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify(response_object), 400


@admin_blueprint.route('/admin/access-requests', methods=['GET'])
@authenticate
@admin_required
def get_access_requests(user_id):
    """Get service access requests"""
    user = User.query.filter_by(id=user_id).first()

    if user.is_super_admin:
        # Super admin sees all requests
        requests = ServiceAccessRequest.query.filter_by(status='pending').all()
    else:
        # Service admin sees requests for their services only
        managed_service_ids = [sa.service_id for sa in user.managed_services]
        requests = ServiceAccessRequest.query.filter(
            ServiceAccessRequest.service_id.in_(managed_service_ids),
            ServiceAccessRequest.status == 'pending'
        ).all()

    return jsonify({
        'status': 'success',
        'data': {
            'requests': [req.to_json() for req in requests]
        }
    }), 200


@admin_blueprint.route('/admin/access-requests/<int:request_id>/approve', methods=['POST'])
@authenticate
@admin_required
def approve_access_request(user_id, request_id):
    """Approve a service access request"""
    access_request = ServiceAccessRequest.query.filter_by(id=request_id).first()

    if not access_request:
        return jsonify({'status': 'fail', 'message': 'Request not found.'}), 404

    user = User.query.filter_by(id=user_id).first()

    # Check if user has permission to approve this request
    if not user.is_super_admin and not user.is_service_admin(access_request.service.name):
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    if access_request.status != 'pending':
        return jsonify({'status': 'fail', 'message': 'Request already processed.'}), 400

    try:
        # Create or update user service permission
        existing_permission = UserServicePermission.query.filter_by(
            user_id=access_request.user_id,
            service_id=access_request.service_id
        ).first()

        if existing_permission:
            existing_permission.permissions = access_request.requested_permissions
            existing_permission.granted_by = user_id
        else:
            new_permission = UserServicePermission(
                user_id=access_request.user_id,
                service_id=access_request.service_id,
                permissions=access_request.requested_permissions,
                granted_by=user_id
            )
            db.session.add(new_permission)

        # Update request status
        access_request.status = 'approved'
        access_request.reviewed_by = user_id
        access_request.reviewed_date = db.func.now()

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Access request approved successfully.'
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to approve request.'}), 400


@admin_blueprint.route('/admin/access-requests/<int:request_id>/reject', methods=['POST'])
@authenticate
@admin_required
def reject_access_request(user_id, request_id):
    """Reject a service access request"""
    post_data = request.get_json()
    review_notes = post_data.get('review_notes', '') if post_data else ''

    access_request = ServiceAccessRequest.query.filter_by(id=request_id).first()

    if not access_request:
        return jsonify({'status': 'fail', 'message': 'Request not found.'}), 404

    user = User.query.filter_by(id=user_id).first()

    # Check if user has permission to reject this request
    if not user.is_super_admin and not user.is_service_admin(access_request.service.name):
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    if access_request.status != 'pending':
        return jsonify({'status': 'fail', 'message': 'Request already processed.'}), 400

    try:
        access_request.status = 'rejected'
        access_request.reviewed_by = user_id
        access_request.reviewed_date = db.func.now()
        access_request.review_notes = review_notes

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Access request rejected.'
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to reject request.'}), 400


# User endpoints for requesting access
@admin_blueprint.route('/services/request-access', methods=['POST'])
@authenticate
def request_service_access(user_id):
    """Request access to a service"""
    post_data = request.get_json()
    response_object = {'status': 'fail', 'message': 'Invalid payload.'}

    if not post_data:
        return jsonify(response_object), 400

    service_id = post_data.get('service_id')
    requested_permissions = post_data.get('permissions', 'read')
    reason = post_data.get('reason', '')

    if not service_id:
        response_object['message'] = 'Service ID is required.'
        return jsonify(response_object), 400

    # Check if service exists
    service = Service.query.filter_by(id=service_id).first()
    if not service:
        response_object['message'] = 'Service not found.'
        return jsonify(response_object), 404

    # Check if user already has access
    existing_permission = UserServicePermission.query.filter_by(
        user_id=user_id, service_id=service_id
    ).first()

    if existing_permission:
        response_object['message'] = 'You already have access to this service.'
        return jsonify(response_object), 400

    # Check if there's already a pending request
    existing_request = ServiceAccessRequest.query.filter_by(
        user_id=user_id, service_id=service_id, status='pending'
    ).first()

    if existing_request:
        response_object['message'] = 'You already have a pending request for this service.'
        return jsonify(response_object), 400

    try:
        access_request = ServiceAccessRequest(
            user_id=user_id,
            service_id=service_id,
            requested_permissions=requested_permissions,
            reason=reason
        )

        db.session.add(access_request)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Access request submitted successfully.'
        }), 201

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify(response_object), 400


@admin_blueprint.route('/services/my-requests', methods=['GET'])
@authenticate
def get_my_requests(user_id):
    """Get current user's service access requests"""
    requests = ServiceAccessRequest.query.filter_by(user_id=user_id).all()

    return jsonify({
        'status': 'success',
        'data': {
            'requests': [req.to_json() for req in requests]
        }
    }), 200
