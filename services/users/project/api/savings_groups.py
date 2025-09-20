# services/users/project/api/savings_groups.py

from flask import Blueprint, jsonify, request
from sqlalchemy import exc, desc, func
from datetime import datetime, date, timedelta

from project.api.models import User, Service, SavingsGroup, GroupMember, GroupLoan, GroupTransaction, MemberCampaignParticipation
from project import db
from project.api.utils import authenticate
from project.api.notifications import create_system_notification

savings_groups_blueprint = Blueprint('savings_groups', __name__)


@savings_groups_blueprint.route('/user-membership/<int:user_id>', methods=['GET'])
@authenticate
def get_user_membership(requesting_user_id, user_id):
    """Get user's membership information across all groups"""
    # Allow users to view their own membership or admins to view any
    user = User.query.filter_by(id=requesting_user_id).first()
    if not user:
        return jsonify({'status': 'fail', 'message': 'User not found.'}), 404

    if requesting_user_id != user_id and not (user.is_super_admin or user.admin):
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    # Get all group memberships for the user
    memberships = GroupMember.query.filter_by(user_id=user_id, is_active=True).all()

    membership_data = []
    for membership in memberships:
        group = membership.group
        membership_info = {
            'member_id': membership.id,
            'group_id': group.id,
            'group_name': group.name,
            'role': membership.role,
            'joined_date': membership.joined_date.isoformat() if membership.joined_date else None,
            'is_officer': membership.is_officer(),
            'group_location': f"{group.district}, {group.parish}, {group.village}",
            'group_status': group.state
        }
        membership_data.append(membership_info)

    return jsonify({
        'status': 'success',
        'data': {
            'user_id': user_id,
            'memberships': membership_data,
            'total_groups': len(membership_data)
        }
    }), 200


@savings_groups_blueprint.route('/admin-dashboard', methods=['GET'])
@authenticate
def get_admin_dashboard(user_id):
    """Get admin dashboard data"""
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({'status': 'fail', 'message': 'User not found.'}), 404

    if not (user.is_super_admin or user.admin):
        return jsonify({'status': 'fail', 'message': 'Admin access required.'}), 403

    # Get summary statistics
    total_groups = SavingsGroup.query.count()
    total_members = GroupMember.query.filter_by(is_active=True).count()

    # Get total savings across all groups
    from project.api.models import MemberSaving
    total_savings = db.session.query(func.sum(MemberSaving.current_balance)).scalar() or 0

    # Get recent groups
    recent_groups = SavingsGroup.query.order_by(desc(SavingsGroup.created_date)).limit(5).all()

    # Get groups by status
    groups_by_status = db.session.query(
        SavingsGroup.state,
        func.count(SavingsGroup.id)
    ).group_by(SavingsGroup.state).all()

    return jsonify({
        'status': 'success',
        'data': {
            'summary': {
                'total_groups': total_groups,
                'total_members': total_members,
                'total_savings': float(total_savings),
                'active_groups': len([count for status, count in groups_by_status if status == 'ACTIVE'])
            },
            'recent_groups': [group.to_json() for group in recent_groups],
            'groups_by_status': dict(groups_by_status)
        }
    }), 200


@savings_groups_blueprint.route('/member-dashboard/<int:member_id>', methods=['GET'])
@authenticate
def get_member_dashboard(user_id, member_id):
    """Get member dashboard data"""
    member = GroupMember.query.filter_by(id=member_id).first()
    if not member:
        return jsonify({'status': 'fail', 'message': 'Member not found.'}), 404

    # Check permissions - user can view their own dashboard or admins can view any
    user = User.query.filter_by(id=user_id).first()
    if member.user_id != user_id and not (user.is_super_admin or user.admin):
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    # Get member savings
    from project.api.models import MemberSaving, SavingTransaction, MeetingAttendance
    savings = MemberSaving.query.filter_by(member_id=member_id, is_active=True).all()

    # Get recent transactions
    recent_transactions = SavingTransaction.query.join(MemberSaving).filter(
        MemberSaving.member_id == member_id
    ).order_by(desc(SavingTransaction.processed_date)).limit(10).all()

    # Get attendance rate (last 3 months)
    three_months_ago = date.today() - timedelta(days=90)
    total_meetings = MeetingAttendance.query.filter(
        MeetingAttendance.member_id == member_id,
        MeetingAttendance.meeting_date >= three_months_ago
    ).count()

    attended_meetings = MeetingAttendance.query.filter(
        MeetingAttendance.member_id == member_id,
        MeetingAttendance.meeting_date >= three_months_ago,
        MeetingAttendance.attended == True
    ).count()

    attendance_rate = (attended_meetings / total_meetings * 100) if total_meetings > 0 else 0

    return jsonify({
        'status': 'success',
        'data': {
            'member': member.to_json(),
            'group': member.group.to_json(),
            'savings': [saving.to_json() for saving in savings],
            'recent_transactions': [tx.to_json() for tx in recent_transactions],
            'attendance_rate': round(attendance_rate, 2),
            'total_savings': sum(float(saving.current_balance) for saving in savings)
        }
    }), 200


@savings_groups_blueprint.route('/member-transactions/<int:member_id>', methods=['GET'])
@authenticate
def get_member_transactions(user_id, member_id):
    """Get all transactions for a member"""
    member = GroupMember.query.filter_by(id=member_id).first()
    if not member:
        return jsonify({'status': 'fail', 'message': 'Member not found.'}), 404

    # Check permissions
    user = User.query.filter_by(id=user_id).first()
    if member.user_id != user_id and not (user.is_super_admin or user.admin):
        return jsonify({'status': 'fail', 'message': 'Permission denied.'}), 403

    # Get transactions with pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    from project.api.models import SavingTransaction, MemberSaving
    transactions_query = SavingTransaction.query.join(MemberSaving).filter(
        MemberSaving.member_id == member_id
    ).order_by(desc(SavingTransaction.processed_date))

    transactions = transactions_query.paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'status': 'success',
        'data': {
            'transactions': [tx.to_json() for tx in transactions.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': transactions.total,
                'pages': transactions.pages
            }
        }
    }), 200


def service_permission_required(service_name, permission_type='read'):
    """Decorator to require specific service permissions"""
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

            # Check if user has permission for this service
            if not user.has_permission(service_name, permission_type):
                return jsonify({'status': 'fail', 'message': f'Permission denied. Requires {permission_type} access to {service_name}.'}), 403

            return f(user_id, *args, **kwargs)
        return decorated_function
    return decorator


def group_officer_required(officer_roles=None):
    """Decorator to require group officer permissions (Secretary, Chair, Treasurer)"""
    def decorator(f):
        from functools import wraps

        @wraps(f)
        def decorated_function(user_id, *args, **kwargs):
            user = User.query.filter_by(id=user_id).first()
            if not user:
                return jsonify({'status': 'fail', 'message': 'User not found.'}), 404

            # Super admin and service admin have access to everything
            if user.is_super_admin or user.is_service_admin('Savings Groups'):
                return f(user_id, *args, **kwargs)

            # Check if user is an officer in any group
            member_records = GroupMember.query.filter_by(user_id=user_id, is_active=True).all()

            is_officer = False
            for member in member_records:
                if member.is_officer():
                    officer_role = member.get_officer_role()
                    if officer_roles is None or officer_role in officer_roles:
                        is_officer = True
                        break

            if not is_officer:
                roles_str = ', '.join(officer_roles) if officer_roles else 'Secretary, Chair, or Treasurer'
                return jsonify({
                    'status': 'fail',
                    'message': f'Group officer access required. Must be a {roles_str}.'
                }), 403

            return f(user_id, *args, **kwargs)
        return decorated_function
    return decorator


def group_member_or_officer_required(group_id_param='group_id'):
    """Decorator to require membership or officer role in the specific group"""
    def decorator(f):
        from functools import wraps

        @wraps(f)
        def decorated_function(user_id, *args, **kwargs):
            user = User.query.filter_by(id=user_id).first()
            if not user:
                return jsonify({'status': 'fail', 'message': 'User not found.'}), 404

            # Super admin and service admin have access to everything
            if user.is_super_admin or user.is_service_admin('Savings Groups'):
                return f(user_id, *args, **kwargs)

            # Get group_id from kwargs or args
            group_id = kwargs.get(group_id_param)
            if group_id is None and args:
                # Try to get from positional args (assumes group_id is first after user_id)
                group_id = args[0] if len(args) > 0 else None

            if not group_id:
                return jsonify({'status': 'fail', 'message': 'Group ID required.'}), 400

            # Check if user is a member of this group
            member = GroupMember.query.filter_by(
                user_id=user_id,
                group_id=group_id,
                is_active=True
            ).first()

            if not member:
                return jsonify({
                    'status': 'fail',
                    'message': 'Access denied. Must be a member of this group.'
                }), 403

            return f(user_id, *args, **kwargs)
        return decorated_function
    return decorator


# Group Management Endpoints

@savings_groups_blueprint.route('/savings-groups', methods=['POST'])
@authenticate
def create_savings_group(user_id):
    """Create a new savings group - Available to Secretaries, Officers, and Admins"""
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({'status': 'fail', 'message': 'User not found.'}), 404

    # Check permissions: Super admin, Service admin, or existing group officer can create groups
    can_create = (
        user.is_super_admin or
        user.is_service_admin('Savings Groups') or
        _is_existing_group_officer(user_id)
    )

    if not can_create:
        return jsonify({
            'status': 'fail',
            'message': 'Permission denied. Only group officers (Secretary, Chair, Treasurer) or admins can create new groups.'
        }), 403

    post_data = request.get_json()
    response_object = {'status': 'fail', 'message': 'Invalid payload.'}

    if not post_data:
        return jsonify(response_object), 400

    # Required fields
    name = post_data.get('name')
    district = post_data.get('district')
    parish = post_data.get('parish')
    village = post_data.get('village')

    # Optional fields
    description = post_data.get('description')
    country = post_data.get('country', 'Uganda')
    region = post_data.get('region')
    target_amount = post_data.get('target_amount')
    formation_date_str = post_data.get('formation_date')
    creator_role = post_data.get('creator_role', 'secretary')  # Default to secretary

    # Validation
    if not name:
        response_object['message'] = 'Group name is required.'
        return jsonify(response_object), 400

    if not district or not parish or not village:
        response_object['message'] = 'District, Parish, and Village are required.'
        return jsonify(response_object), 400

    if creator_role not in ['secretary', 'chair', 'treasurer']:
        response_object['message'] = 'Creator role must be secretary, chair, or treasurer.'
        return jsonify(response_object), 400

    # Parse formation date
    try:
        if formation_date_str:
            formation_date = datetime.strptime(formation_date_str, '%Y-%m-%d').date()
        else:
            formation_date = date.today()
    except ValueError:
        response_object['message'] = 'Invalid formation date format. Use YYYY-MM-DD.'
        return jsonify(response_object), 400

    try:
        # Create the savings group
        group = SavingsGroup(
            name=name,
            formation_date=formation_date,
            created_by=user_id,
            description=description,
            country=country,
            region=region,
            district=district,
            parish=parish,
            village=village,
            target_amount=target_amount
        )

        db.session.add(group)
        db.session.flush()  # Get the group ID

        # Add creator as the first member with FOUNDER role
        creator_member = GroupMember(
            group_id=group.id,
            user_id=user_id,
            name=f"{user.username}",  # Use username as display name
            gender='OTHER',  # Default, can be updated later
            phone=None,  # Can be updated later
            role='FOUNDER'
        )

        db.session.add(creator_member)
        db.session.flush()  # Get the member ID

        # Assign creator as the specified officer role
        if creator_role == 'secretary':
            group.secretary_member_id = creator_member.id
        elif creator_role == 'chair':
            group.chair_member_id = creator_member.id
        elif creator_role == 'treasurer':
            group.treasurer_member_id = creator_member.id

        # Update group member count
        group.members_count = 1
        group.update_state()  # Update group state based on members

        db.session.commit()

        # Create notification for group creation
        service = Service.query.filter_by(name='Savings Groups').first()
        if service:
            create_system_notification(
                user_id=user_id,
                message=f'Savings group "{name}" created successfully. You are now the {creator_role.title()}.',
                notification_type='success',
                title='Group Created',
                service_id=service.id
            )

        return jsonify({
            'status': 'success',
            'message': f'Savings group created successfully. You have been assigned as the {creator_role.title()}.',
            'data': {
                'group': group.to_json(),
                'creator_member': creator_member.to_json()
            }
        }), 201

    except exc.IntegrityError as e:
        db.session.rollback()
        if 'unique constraint' in str(e).lower():
            response_object['message'] = 'A group with this name already exists.'
        else:
            response_object['message'] = 'Failed to create group due to data conflict.'
        return jsonify(response_object), 400
    except Exception as e:
        db.session.rollback()
        response_object['message'] = 'Failed to create savings group.'
        return jsonify(response_object), 500


def _is_existing_group_officer(user_id):
    """Helper function to check if user is an officer in any existing group"""
    member_records = GroupMember.query.filter_by(user_id=user_id, is_active=True).all()

    for member in member_records:
        if member.is_officer():
            return True
    return False


@savings_groups_blueprint.route('/savings-groups/<int:group_id>', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_savings_group(user_id, group_id):
    """Get savings group details"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    return jsonify({
        'status': 'success',
        'data': {'group': group.to_json()}
    }), 200


@savings_groups_blueprint.route('/savings-groups', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_all_savings_groups(user_id):
    """Get all savings groups with pagination"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    state_filter = request.args.get('state')

    query = SavingsGroup.query

    if state_filter:
        query = query.filter_by(state=state_filter)

    # Order by creation date (newest first)
    query = query.order_by(desc(SavingsGroup.created_date))

    # Paginate
    groups = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'status': 'success',
        'data': {
            'groups': [group.to_json() for group in groups.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': groups.total,
                'pages': groups.pages,
                'has_next': groups.has_next,
                'has_prev': groups.has_prev
            }
        }
    }), 200


@savings_groups_blueprint.route('/savings-groups/<int:group_id>', methods=['PATCH'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def update_savings_group(user_id, group_id):
    """Update savings group details"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    post_data = request.get_json()
    if not post_data:
        return jsonify({'status': 'fail', 'message': 'Invalid payload.'}), 400

    try:
        # Update allowed fields
        if 'description' in post_data:
            group.description = post_data['description']
        if 'target_amount' in post_data:
            group.target_amount = post_data['target_amount']
        if 'meeting_frequency' in post_data:
            group.meeting_frequency = post_data['meeting_frequency']
        if 'minimum_contribution' in post_data:
            group.minimum_contribution = post_data['minimum_contribution']

        # Update officer assignments if provided
        if 'officers' in post_data:
            officers = post_data['officers']
            if 'chair_member_id' in officers:
                group.chair_member_id = officers['chair_member_id']
            if 'treasurer_member_id' in officers:
                group.treasurer_member_id = officers['treasurer_member_id']
            if 'secretary_member_id' in officers:
                group.secretary_member_id = officers['secretary_member_id']

        # Update group state if needed
        group.update_state()

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Savings group updated successfully.',
            'data': {'group': group.to_json()}
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to update savings group.'}), 400


# Member Management Endpoints

@savings_groups_blueprint.route('/savings-groups/<int:group_id>/members', methods=['POST'])
@authenticate
@group_member_or_officer_required()
def add_group_member(user_id, group_id):
    """Add a member to a savings group - Only group officers can add members"""
    group = SavingsGroup.query.filter_by(id=group_id).first()

    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    # Check if requesting user is an officer in this group (unless admin)
    requesting_user = User.query.filter_by(id=user_id).first()
    if not (requesting_user.is_super_admin or requesting_user.is_service_admin('Savings Groups')):
        requesting_member = GroupMember.query.filter_by(
            user_id=user_id,
            group_id=group_id,
            is_active=True
        ).first()

        if not requesting_member or not requesting_member.is_officer():
            return jsonify({
                'status': 'fail',
                'message': 'Only group officers can add new members.'
            }), 403

    if not group.can_add_member():
        return jsonify({'status': 'fail', 'message': 'Cannot add member. Group is full or not accepting members.'}), 400

    post_data = request.get_json()
    response_object = {'status': 'fail', 'message': 'Invalid payload.'}

    if not post_data:
        return jsonify(response_object), 400

    # Support two modes: adding existing user or creating new user
    target_user_id = post_data.get('user_id')
    email = post_data.get('email')
    username = post_data.get('username')
    password = post_data.get('password')

    name = post_data.get('name')
    gender = post_data.get('gender')
    phone = post_data.get('phone')
    role = post_data.get('role', 'MEMBER')

    if not name or not gender:
        response_object['message'] = 'Name and gender are required.'
        return jsonify(response_object), 400

    if role not in ['MEMBER', 'OFFICER', 'FOUNDER']:
        response_object['message'] = 'Invalid role. Must be MEMBER, OFFICER, or FOUNDER.'
        return jsonify(response_object), 400

    try:
        target_user = None

        # If user_id provided, use existing user
        if target_user_id:
            target_user = User.query.filter_by(id=target_user_id).first()
            if not target_user:
                response_object['message'] = 'Target user not found.'
                return jsonify(response_object), 404

        # If email/username provided, create new user or find existing
        elif email and username:
            # Check if user already exists
            target_user = User.query.filter(
                (User.email == email) | (User.username == username)
            ).first()

            if target_user:
                # User exists, use existing user
                target_user_id = target_user.id
            else:
                # Create new user
                if not password:
                    response_object['message'] = 'Password required for new user.'
                    return jsonify(response_object), 400

                target_user = User(
                    username=username,
                    email=email,
                    password=password
                )
                db.session.add(target_user)
                db.session.flush()  # Get user ID
                target_user_id = target_user.id
        else:
            response_object['message'] = 'Either user_id or email/username must be provided.'
            return jsonify(response_object), 400

        # Check if user is already a member
        existing_member = GroupMember.query.filter_by(
            group_id=group_id,
            user_id=target_user_id
        ).first()

        if existing_member:
            if existing_member.is_active:
                response_object['message'] = 'User is already an active member of this group.'
                return jsonify(response_object), 400
            else:
                # Reactivate existing member
                existing_member.is_active = True
                existing_member.name = name
                existing_member.gender = gender
                existing_member.phone = phone
                existing_member.role = role
                member = existing_member
        else:
            # Create new group member
            member = GroupMember(
                group_id=group_id,
                user_id=target_user_id,
                name=name,
                gender=gender,
                phone=phone,
                role=role
            )
            db.session.add(member)

        # Update group member count
        group.members_count = GroupMember.query.filter_by(
            group_id=group_id,
            is_active=True
        ).count() + (1 if not existing_member or not existing_member.is_active else 0)

        group.update_state()  # Check if state should change

        db.session.commit()

        # Create notification for new member
        service = Service.query.filter_by(name='Savings Groups').first()
        if service:
            create_system_notification(
                user_id=target_user_id,
                message=f'You have been added to savings group "{group.name}" as a {role.lower()}.',
                notification_type='info',
                title='Added to Savings Group',
                service_id=service.id
            )

        return jsonify({
            'status': 'success',
            'message': 'Member added successfully.',
            'data': {
                'member': member.to_json(),
                'group': group.to_json()
            }
        }), 201

    except exc.IntegrityError as e:
        db.session.rollback()
        if 'unique constraint' in str(e).lower():
            response_object['message'] = 'User already exists or is already a member.'
        else:
            response_object['message'] = 'Failed to add member due to data conflict.'
        return jsonify(response_object), 400
    except Exception as e:
        db.session.rollback()
        response_object['message'] = 'Failed to add member to group.'
        return jsonify(response_object), 500


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/members', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_group_members(user_id, group_id):
    """Get all members of a savings group"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    members = GroupMember.query.filter_by(group_id=group_id, is_active=True).all()

    return jsonify({
        'status': 'success',
        'data': {
            'members': [member.to_json() for member in members],
            'total_members': len(members)
        }
    }), 200


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/members/<int:member_id>', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_group_member(user_id, group_id, member_id):
    """Get specific member details"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    member = GroupMember.query.filter_by(id=member_id, group_id=group_id).first()
    
    if not member:
        return jsonify({'status': 'fail', 'message': 'Member not found in this group.'}), 404

    return jsonify({
        'status': 'success',
        'data': {'member': member.to_json()}
    }), 200


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/members/<int:member_id>', methods=['PATCH'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def update_group_member(user_id, group_id, member_id):
    """Update member details"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    member = GroupMember.query.filter_by(id=member_id, group_id=group_id).first()
    
    if not member:
        return jsonify({'status': 'fail', 'message': 'Member not found in this group.'}), 404

    post_data = request.get_json()
    if not post_data:
        return jsonify({'status': 'fail', 'message': 'Invalid payload.'}), 400

    try:
        # Update allowed fields
        if 'name' in post_data:
            member.name = post_data['name']
        if 'phone' in post_data:
            member.phone = post_data['phone']
        if 'role' in post_data and post_data['role'] in ['MEMBER', 'OFFICER', 'FOUNDER']:
            member.role = post_data['role']

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Member updated successfully.',
            'data': {'member': member.to_json()}
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to update member.'}), 400


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/members/<int:member_id>', methods=['DELETE'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def remove_group_member(user_id, group_id, member_id):
    """Remove a member from a savings group"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    member = GroupMember.query.filter_by(id=member_id, group_id=group_id).first()
    
    if not member:
        return jsonify({'status': 'fail', 'message': 'Member not found in this group.'}), 404

    # Check if member has outstanding balance
    if member.share_balance > 0:
        return jsonify({
            'status': 'fail', 
            'message': f'Cannot remove member with outstanding balance of ${float(member.share_balance):.2f}. Please process withdrawal first.'
        }), 400

    # Check if member is an officer
    if member.is_officer():
        return jsonify({
            'status': 'fail', 
            'message': 'Cannot remove member who is currently an officer. Please reassign officer role first.'
        }), 400

    try:
        # Mark member as inactive instead of deleting (for audit trail)
        member.is_active = False
        
        # Update group member count
        group.members_count -= 1
        group.update_state()  # Check if state should change

        db.session.commit()

        # Create notification for removed member
        create_system_notification(
            user_id=member.user_id,
            message=f'You have been removed from savings group "{group.name}"',
            notification_type='warning',
            title='Removed from Savings Group',
            service_id=Service.query.filter_by(name='Savings Groups').first().id
        )

        return jsonify({
            'status': 'success',
            'message': 'Member removed successfully.'
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to remove member.'}), 400


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/officers', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def assign_officer(user_id, group_id):
    """Assign officer roles to group members"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    post_data = request.get_json()
    response_object = {'status': 'fail', 'message': 'Invalid payload.'}

    if not post_data:
        return jsonify(response_object), 400

    member_id = post_data.get('member_id')
    officer_role = post_data.get('role')  # 'chair', 'treasurer', 'secretary'

    if not member_id or not officer_role:
        response_object['message'] = 'Member ID and officer role are required.'
        return jsonify(response_object), 400

    if officer_role not in ['chair', 'treasurer', 'secretary']:
        response_object['message'] = 'Invalid officer role. Must be chair, treasurer, or secretary.'
        return jsonify(response_object), 400

    # Validate member exists in group
    member = GroupMember.query.filter_by(id=member_id, group_id=group_id, is_active=True).first()
    if not member:
        response_object['message'] = 'Member not found in this group.'
        return jsonify(response_object), 404

    try:
        # Assign officer role
        if officer_role == 'chair':
            group.chair_member_id = member_id
        elif officer_role == 'treasurer':
            group.treasurer_member_id = member_id
        elif officer_role == 'secretary':
            group.secretary_member_id = member_id

        # Update member role
        member.role = 'OFFICER'

        db.session.commit()

        # Create notification for new officer
        create_system_notification(
            user_id=member.user_id,
            message=f'You have been assigned as {officer_role} of savings group "{group.name}"',
            notification_type='success',
            title='Officer Role Assigned',
            service_id=Service.query.filter_by(name='Savings Groups').first().id
        )

        return jsonify({
            'status': 'success',
            'message': f'Member assigned as {officer_role} successfully.',
            'data': {
                'member': member.to_json(),
                'group': group.to_json()
            }
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify(response_object), 400


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/officers/<officer_role>', methods=['DELETE'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def remove_officer(user_id, group_id, officer_role):
    """Remove officer role from a member"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    if officer_role not in ['chair', 'treasurer', 'secretary']:
        return jsonify({'status': 'fail', 'message': 'Invalid officer role.'}), 400

    try:
        # Get current officer
        current_officer_id = None
        if officer_role == 'chair':
            current_officer_id = group.chair_member_id
            group.chair_member_id = None
        elif officer_role == 'treasurer':
            current_officer_id = group.treasurer_member_id
            group.treasurer_member_id = None
        elif officer_role == 'secretary':
            current_officer_id = group.secretary_member_id
            group.secretary_member_id = None

        if current_officer_id:
            # Update member role back to MEMBER if they don't hold other officer positions
            member = GroupMember.query.filter_by(id=current_officer_id).first()
            if member and not member.is_officer():
                member.role = 'MEMBER'

            # Create notification
            create_system_notification(
                user_id=member.user_id,
                message=f'You have been removed as {officer_role} of savings group "{group.name}"',
                notification_type='info',
                title='Officer Role Removed',
                service_id=Service.query.filter_by(name='Savings Groups').first().id
            )

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': f'{officer_role.title()} role removed successfully.'
        }), 200

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to remove officer role.'}), 400


# Transaction Endpoints

@savings_groups_blueprint.route('/savings-groups/<int:group_id>/transactions', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def record_group_transaction(user_id, group_id):
    """Record a transaction for a savings group"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    post_data = request.get_json()
    response_object = {'status': 'fail', 'message': 'Invalid payload.'}

    if not post_data:
        return jsonify(response_object), 400

    transaction_type = post_data.get('type')
    amount = post_data.get('amount')
    member_id = post_data.get('member_id')
    description = post_data.get('description')
    idempotency_key = post_data.get('idempotency_key')

    if not transaction_type or not amount:
        response_object['message'] = 'Transaction type and amount are required.'
        return jsonify(response_object), 400

    # Validate amount
    try:
        amount = float(amount)
        if amount <= 0:
            response_object['message'] = 'Amount must be positive.'
            return jsonify(response_object), 400
    except (ValueError, TypeError):
        response_object['message'] = 'Invalid amount format.'
        return jsonify(response_object), 400

    # Check for duplicate transaction if idempotency key provided
    if idempotency_key:
        existing_transaction = GroupTransaction.query.filter_by(idempotency_key=idempotency_key).first()
        if existing_transaction:
            return jsonify({
                'status': 'success',
                'message': 'Transaction already processed.',
                'data': {'transaction': existing_transaction.to_json()}
            }), 200

    # Validate member if provided
    member = None
    if member_id:
        member = GroupMember.query.filter_by(id=member_id, group_id=group_id).first()
        if not member:
            response_object['message'] = 'Member not found in this group.'
            return jsonify(response_object), 404

    try:
        # Record balances before transaction
        group_balance_before = group.savings_balance
        member_balance_before = member.share_balance if member else None

        # Create transaction
        transaction = GroupTransaction(
            group_id=group_id,
            member_id=member_id,
            type=transaction_type,
            amount=amount,
            description=description,
            processed_by=user_id,
            idempotency_key=idempotency_key
        )
        
        # Set balance tracking fields
        transaction.group_balance_before = group_balance_before
        transaction.member_balance_before = member_balance_before

        # Update balances based on transaction type
        from decimal import Decimal
        amount_decimal = Decimal(str(amount))
        
        if transaction_type == 'SAVING_CONTRIBUTION':
            group.savings_balance += amount_decimal
            if member:
                member.share_balance += amount_decimal
                member.total_contributions += amount_decimal
        elif transaction_type == 'WITHDRAWAL':
            if group.savings_balance < amount_decimal:
                response_object['message'] = 'Insufficient group balance.'
                return jsonify(response_object), 400
            group.savings_balance -= amount_decimal
            if member:
                if member.share_balance < amount_decimal:
                    response_object['message'] = 'Insufficient member balance.'
                    return jsonify(response_object), 400
                member.share_balance -= amount_decimal

        # Record balances after transaction
        transaction.group_balance_after = group.savings_balance
        transaction.member_balance_after = member.share_balance if member else None

        db.session.add(transaction)
        
        # Update group state if needed
        group.update_state()
        
        db.session.commit()

        # Create notification for transaction
        if member:
            create_system_notification(
                user_id=member.user_id,
                message=f'{transaction_type.replace("_", " ").title()} of ${amount:.2f} processed for group "{group.name}"',
                notification_type='info',
                title='Transaction Processed',
                service_id=Service.query.filter_by(name='Savings Groups').first().id
            )

        return jsonify({
            'status': 'success',
            'message': 'Transaction recorded successfully.',
            'data': {'transaction': transaction.to_json()}
        }), 201

    except exc.IntegrityError:
        db.session.rollback()
        return jsonify(response_object), 400


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/transactions', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_group_transactions(user_id, group_id):
    """Get transaction history for a savings group"""
    group = SavingsGroup.query.filter_by(id=group_id).first()
    
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    transaction_type = request.args.get('type')

    query = GroupTransaction.query.filter_by(group_id=group_id)

    if transaction_type:
        query = query.filter_by(type=transaction_type)

    # Order by date (newest first)
    query = query.order_by(desc(GroupTransaction.processed_date))

    # Paginate
    transactions = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'status': 'success',
        'data': {
            'transactions': [transaction.to_json() for transaction in transactions.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': transactions.total,
                'pages': transactions.pages,
                'has_next': transactions.has_next,
                'has_prev': transactions.has_prev
            }
        }
    }), 200


# Cashbook Endpoints

@savings_groups_blueprint.route('/savings-groups/<int:group_id>/cashbook', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_group_cashbook(user_id, group_id):
    """Get cashbook entries for a savings group"""
    from project.api.cashbook_service import CashbookService
    
    group = SavingsGroup.query.filter_by(id=group_id).first()
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    # Get query parameters
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)

    # Parse dates if provided
    start_date = end_date = None
    try:
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'status': 'fail', 'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    cashbook_data = CashbookService.get_group_cashbook(
        group_id, start_date, end_date, limit, offset
    )

    return jsonify({
        'status': 'success',
        'data': cashbook_data
    }), 200


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/financial-summary', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_financial_summary(user_id, group_id):
    """Get financial summary for a savings group"""
    from project.api.cashbook_service import CashbookService
    
    group = SavingsGroup.query.filter_by(id=group_id).first()
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    # Get as_of_date parameter
    as_of_date_str = request.args.get('as_of_date')
    as_of_date = None
    
    if as_of_date_str:
        try:
            as_of_date = datetime.strptime(as_of_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'status': 'fail', 'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    summary = CashbookService.get_group_financial_summary(group_id, as_of_date)

    return jsonify({
        'status': 'success',
        'data': {'financial_summary': summary}
    }), 200


# Member Savings Endpoints

@savings_groups_blueprint.route('/savings-groups/<int:group_id>/members/<int:member_id>/savings', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def record_member_saving(user_id, group_id, member_id):
    """Record a member saving transaction"""
    from project.api.cashbook_service import CashbookService
    
    group = SavingsGroup.query.filter_by(id=group_id).first()
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    member = GroupMember.query.filter_by(id=member_id, group_id=group_id).first()
    if not member:
        return jsonify({'status': 'fail', 'message': 'Member not found in this group.'}), 404

    post_data = request.get_json()
    if not post_data:
        return jsonify({'status': 'fail', 'message': 'Invalid payload.'}), 400

    saving_type_code = post_data.get('saving_type_code')
    amount = post_data.get('amount')
    transaction_type = post_data.get('transaction_type', 'DEPOSIT')
    mobile_money_transaction_id = post_data.get('mobile_money_transaction_id')
    mobile_money_provider = post_data.get('mobile_money_provider')
    mobile_money_phone = post_data.get('mobile_money_phone')

    if not saving_type_code or not amount:
        return jsonify({'status': 'fail', 'message': 'Saving type and amount are required.'}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'status': 'fail', 'message': 'Amount must be positive.'}), 400
    except (ValueError, TypeError):
        return jsonify({'status': 'fail', 'message': 'Invalid amount format.'}), 400

    try:
        saving_transaction, cashbook_entry = CashbookService.record_member_saving(
            member_id=member_id,
            saving_type_code=saving_type_code,
            amount=amount,
            transaction_type=transaction_type,
            mobile_money_transaction_id=mobile_money_transaction_id,
            mobile_money_provider=mobile_money_provider,
            mobile_money_phone=mobile_money_phone,
            processed_by=user_id
        )

        return jsonify({
            'status': 'success',
            'message': 'Saving transaction recorded successfully.',
            'data': {
                'saving_transaction': saving_transaction.to_json(),
                'cashbook_entry': cashbook_entry.to_json()
            }
        }), 201

    except ValueError as e:
        return jsonify({'status': 'fail', 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to record saving transaction.'}), 500


# Loan Assessment Endpoints

@savings_groups_blueprint.route('/savings-groups/<int:group_id>/members/<int:member_id>/loan-assessment', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def create_loan_assessment(user_id, group_id, member_id):
    """Create a loan assessment for a member"""
    from project.api.loan_assessment_service import LoanAssessmentService
    
    group = SavingsGroup.query.filter_by(id=group_id).first()
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    member = GroupMember.query.filter_by(id=member_id, group_id=group_id).first()
    if not member:
        return jsonify({'status': 'fail', 'message': 'Member not found in this group.'}), 404

    try:
        assessment = LoanAssessmentService.create_assessment(member_id, user_id)

        return jsonify({
            'status': 'success',
            'message': 'Loan assessment created successfully.',
            'data': {'assessment': assessment.to_json()}
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to create loan assessment.'}), 500


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/members/<int:member_id>/loan-eligibility', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def check_loan_eligibility(user_id, group_id, member_id):
    """Check loan eligibility for a specific amount"""
    from project.api.loan_assessment_service import LoanAssessmentService
    
    group = SavingsGroup.query.filter_by(id=group_id).first()
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    member = GroupMember.query.filter_by(id=member_id, group_id=group_id).first()
    if not member:
        return jsonify({'status': 'fail', 'message': 'Member not found in this group.'}), 404

    post_data = request.get_json()
    if not post_data:
        return jsonify({'status': 'fail', 'message': 'Invalid payload.'}), 400

    loan_amount = post_data.get('loan_amount')
    if not loan_amount:
        return jsonify({'status': 'fail', 'message': 'Loan amount is required.'}), 400

    try:
        loan_amount = float(loan_amount)
        if loan_amount <= 0:
            return jsonify({'status': 'fail', 'message': 'Loan amount must be positive.'}), 400
    except (ValueError, TypeError):
        return jsonify({'status': 'fail', 'message': 'Invalid loan amount format.'}), 400

    try:
        eligibility_result = LoanAssessmentService.assess_loan_eligibility(
            member_id, loan_amount, user_id
        )

        return jsonify({
            'status': 'success',
            'data': {'eligibility': eligibility_result}
        }), 200

    except Exception as e:
        return jsonify({'status': 'fail', 'message': 'Failed to assess loan eligibility.'}), 500


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/members/<int:member_id>/loan-history', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_member_loan_history(user_id, group_id, member_id):
    """Get loan history for a member"""
    from project.api.loan_assessment_service import LoanAssessmentService
    
    group = SavingsGroup.query.filter_by(id=group_id).first()
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    member = GroupMember.query.filter_by(id=member_id, group_id=group_id).first()
    if not member:
        return jsonify({'status': 'fail', 'message': 'Member not found in this group.'}), 404

    try:
        loan_history = LoanAssessmentService.get_member_loan_history(member_id)

        return jsonify({
            'status': 'success',
            'data': {'loan_history': loan_history}
        }), 200

    except Exception as e:
        return jsonify({'status': 'fail', 'message': 'Failed to get loan history.'}), 500


# Loan Management Endpoints

@savings_groups_blueprint.route('/savings-groups/<int:group_id>/loans/<int:loan_id>/disburse', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def disburse_loan(user_id, group_id, loan_id):
    """Disburse an approved loan"""
    from project.api.cashbook_service import CashbookService
    from project.api.loan_assessment_service import LoanAssessmentService
    
    group = SavingsGroup.query.filter_by(id=group_id).first()
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    loan = GroupLoan.query.filter_by(id=loan_id, group_id=group_id).first()
    if not loan:
        return jsonify({'status': 'fail', 'message': 'Loan not found in this group.'}), 404

    try:
        # Record disbursement in cashbook
        cashbook_entry = CashbookService.record_loan_disbursement(loan_id, user_id)
        
        # Create repayment schedule
        schedule = LoanAssessmentService.create_loan_repayment_schedule(loan_id)

        return jsonify({
            'status': 'success',
            'message': 'Loan disbursed successfully.',
            'data': {
                'loan': loan.to_json(),
                'cashbook_entry': cashbook_entry.to_json(),
                'repayment_schedule': schedule
            }
        }), 200

    except ValueError as e:
        return jsonify({'status': 'fail', 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to disburse loan.'}), 500


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/loans/<int:loan_id>/repayment', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def record_loan_repayment(user_id, group_id, loan_id):
    """Record a loan repayment"""
    from project.api.cashbook_service import CashbookService
    
    group = SavingsGroup.query.filter_by(id=group_id).first()
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    loan = GroupLoan.query.filter_by(id=loan_id, group_id=group_id).first()
    if not loan:
        return jsonify({'status': 'fail', 'message': 'Loan not found in this group.'}), 404

    post_data = request.get_json()
    if not post_data:
        return jsonify({'status': 'fail', 'message': 'Invalid payload.'}), 400

    amount = post_data.get('amount')
    installment_number = post_data.get('installment_number')

    if not amount:
        return jsonify({'status': 'fail', 'message': 'Repayment amount is required.'}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'status': 'fail', 'message': 'Amount must be positive.'}), 400
    except (ValueError, TypeError):
        return jsonify({'status': 'fail', 'message': 'Invalid amount format.'}), 400

    try:
        cashbook_entry = CashbookService.record_loan_repayment(
            loan_id, amount, user_id, installment_number
        )

        return jsonify({
            'status': 'success',
            'message': 'Loan repayment recorded successfully.',
            'data': {
                'loan': loan.to_json(),
                'cashbook_entry': cashbook_entry.to_json()
            }
        }), 200

    except ValueError as e:
        return jsonify({'status': 'fail', 'message': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to record loan repayment.'}), 500


# Analytics Endpoints

@savings_groups_blueprint.route('/savings-groups/<int:group_id>/analytics', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_group_analytics(user_id, group_id):
    """Get comprehensive analytics for a savings group"""
    from project.api.loan_assessment_service import LoanAssessmentService
    
    group = SavingsGroup.query.filter_by(id=group_id).first()
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    try:
        # Get loan analytics
        loan_analytics = LoanAssessmentService.get_group_loan_analytics(group_id)
        
        # Get member statistics
        from project.api.models import MemberSaving, MeetingAttendance, MemberFine
        
        total_members = GroupMember.query.filter_by(group_id=group_id, is_active=True).count()
        
        # Savings statistics
        total_individual_savings = db.session.query(func.sum(MemberSaving.current_balance)).join(
            GroupMember
        ).filter(
            GroupMember.group_id == group_id,
            GroupMember.is_active.is_(True)
        ).scalar() or 0
        
        # Meeting attendance statistics (last 3 months)
        three_months_ago = date.today() - timedelta(days=90)
        recent_meetings = MeetingAttendance.query.filter(
            MeetingAttendance.group_id == group_id,
            MeetingAttendance.meeting_date >= three_months_ago
        ).count()
        
        attended_meetings = MeetingAttendance.query.filter(
            MeetingAttendance.group_id == group_id,
            MeetingAttendance.meeting_date >= three_months_ago,
            MeetingAttendance.attended.is_(True)
        ).count()
        
        attendance_rate = (attended_meetings / recent_meetings * 100) if recent_meetings > 0 else 0
        
        # Fines statistics
        total_fines = db.session.query(func.sum(MemberFine.amount)).join(GroupMember).filter(
            GroupMember.group_id == group_id,
            MemberFine.status == 'PENDING'
        ).scalar() or 0

        analytics = {
            'group_overview': {
                'total_members': total_members,
                'group_state': group.state,
                'formation_date': group.formation_date.isoformat(),
                'months_active': (date.today() - group.formation_date).days / 30.44
            },
            'financial_summary': {
                'total_group_savings': float(group.savings_balance),
                'total_individual_savings': float(total_individual_savings),
                'target_amount': float(group.target_amount) if group.target_amount else None,
                'progress_to_target': (float(group.savings_balance) / float(group.target_amount) * 100) if group.target_amount else None
            },
            'loan_analytics': loan_analytics,
            'member_engagement': {
                'attendance_rate': round(attendance_rate, 2),
                'recent_meetings': recent_meetings,
                'total_outstanding_fines': float(total_fines)
            }
        }

        return jsonify({
            'status': 'success',
            'data': {'analytics': analytics}
        }), 200

    except Exception as e:
        return jsonify({'status': 'fail', 'message': 'Failed to generate analytics.'}), 500


# Target Savings Campaign Endpoints

@savings_groups_blueprint.route('/target-campaigns', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def create_target_campaign(user_id):
    """Create a new target savings campaign (Admin only)"""
    from project.api.models import TargetSavingsCampaign
    
    # Check if user is admin
    user = User.query.get(user_id)
    if not user.is_super_admin and not user.is_service_admin('Savings Groups'):
        return jsonify({'status': 'fail', 'message': 'Only admins can create target campaigns.'}), 403

    post_data = request.get_json()
    if not post_data:
        return jsonify({'status': 'fail', 'message': 'Invalid payload.'}), 400

    name = post_data.get('name')
    description = post_data.get('description')
    target_amount = post_data.get('target_amount')
    target_date_str = post_data.get('target_date')
    is_mandatory = post_data.get('is_mandatory', False)
    requires_group_vote = post_data.get('requires_group_vote', True)

    if not name or not description or not target_amount or not target_date_str:
        return jsonify({'status': 'fail', 'message': 'Name, description, target amount, and target date are required.'}), 400

    try:
        target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        target_amount = float(target_amount)
        
        if target_amount <= 0:
            return jsonify({'status': 'fail', 'message': 'Target amount must be positive.'}), 400
        
        if target_date <= date.today():
            return jsonify({'status': 'fail', 'message': 'Target date must be in the future.'}), 400

    except ValueError:
        return jsonify({'status': 'fail', 'message': 'Invalid target date format or amount.'}), 400

    try:
        campaign = TargetSavingsCampaign(
            name=name,
            description=description,
            target_amount=target_amount,
            target_date=target_date,
            created_by=user_id,
            is_mandatory=is_mandatory,
            requires_group_vote=requires_group_vote
        )

        # Set optional fields
        if 'minimum_contribution' in post_data:
            campaign.minimum_contribution = post_data['minimum_contribution']
        if 'maximum_contribution' in post_data:
            campaign.maximum_contribution = post_data['maximum_contribution']
        if 'minimum_participation_rate' in post_data:
            campaign.minimum_participation_rate = post_data['minimum_participation_rate']
        if 'completion_bonus_rate' in post_data:
            campaign.completion_bonus_rate = post_data['completion_bonus_rate']
        if 'is_global' in post_data:
            campaign.is_global = post_data['is_global']
        if 'eligible_group_states' in post_data:
            campaign.eligible_group_states = post_data['eligible_group_states']

        db.session.add(campaign)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Target savings campaign created successfully.',
            'data': {'campaign': campaign.to_json()}
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to create target campaign.'}), 500


@savings_groups_blueprint.route('/target-campaigns', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_target_campaigns(user_id):
    """Get all target savings campaigns"""
    from project.api.models import TargetSavingsCampaign
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status_filter = request.args.get('status')

    query = TargetSavingsCampaign.query

    if status_filter:
        query = query.filter_by(status=status_filter)

    # Order by creation date (newest first)
    query = query.order_by(desc(TargetSavingsCampaign.created_date))

    # Paginate
    campaigns = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'status': 'success',
        'data': {
            'campaigns': [campaign.to_json() for campaign in campaigns.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': campaigns.total,
                'pages': campaigns.pages,
                'has_next': campaigns.has_next,
                'has_prev': campaigns.has_prev
            }
        }
    }), 200


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/target-campaigns/<int:campaign_id>/assign', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def assign_campaign_to_group(user_id, group_id, campaign_id):
    """Assign a target savings campaign to a group"""
    from project.api.models import TargetSavingsCampaign, GroupTargetCampaign
    
    group = SavingsGroup.query.get(group_id)
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    campaign = TargetSavingsCampaign.query.get(campaign_id)
    if not campaign:
        return jsonify({'status': 'fail', 'message': 'Target campaign not found.'}), 404

    # Check if campaign is eligible for this group
    if not campaign.is_eligible_for_group(group):
        return jsonify({'status': 'fail', 'message': 'Campaign is not eligible for this group.'}), 400

    # Check if already assigned
    existing_assignment = GroupTargetCampaign.query.filter_by(
        campaign_id=campaign_id,
        group_id=group_id
    ).first()
    
    if existing_assignment:
        return jsonify({'status': 'fail', 'message': 'Campaign already assigned to this group.'}), 400

    try:
        # Create group campaign assignment
        group_campaign = GroupTargetCampaign(
            campaign_id=campaign_id,
            group_id=group_id,
            assigned_by=user_id
        )

        # Set initial status based on campaign settings
        if campaign.is_mandatory and not campaign.requires_group_vote:
            group_campaign.status = 'ACTIVE'
            group_campaign.decision_date = func.now()
        elif campaign.requires_group_vote:
            group_campaign.status = 'VOTING'
            # Set voting deadline (e.g., 7 days from now)
            group_campaign.voting_deadline = datetime.now() + timedelta(days=7)

        db.session.add(group_campaign)
        db.session.flush()

        # Create member participation records
        from project.api.models import MemberCampaignParticipation
        
        active_members = GroupMember.query.filter_by(group_id=group_id, is_active=True).all()
        
        for member in active_members:
            participation = MemberCampaignParticipation(
                group_campaign_id=group_campaign.id,
                member_id=member.id,
                is_participating=campaign.is_mandatory  # Auto-participate if mandatory
            )
            db.session.add(participation)

        db.session.commit()

        # Create notifications for group members
        for member in active_members:
            message = f'New target savings campaign "{campaign.name}" has been assigned to your group'
            if campaign.requires_group_vote:
                message += '. Please vote on whether to participate.'
            
            create_system_notification(
                user_id=member.user_id,
                message=message,
                notification_type='info',
                title='New Target Savings Campaign',
                service_id=Service.query.filter_by(name='Savings Groups').first().id
            )

        return jsonify({
            'status': 'success',
            'message': 'Target campaign assigned to group successfully.',
            'data': {'group_campaign': group_campaign.to_json()}
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to assign campaign to group.'}), 500


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/target-campaigns/<int:group_campaign_id>/vote', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def vote_on_campaign(user_id, group_id, group_campaign_id):
    """Vote on a target savings campaign"""
    from project.api.models import GroupTargetCampaign, CampaignVote
    
    group = SavingsGroup.query.get(group_id)
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    group_campaign = GroupTargetCampaign.query.get(group_campaign_id)
    if not group_campaign or group_campaign.group_id != group_id:
        return jsonify({'status': 'fail', 'message': 'Group campaign not found.'}), 404

    if group_campaign.status != 'VOTING':
        return jsonify({'status': 'fail', 'message': 'Voting is not currently open for this campaign.'}), 400

    # Check if user is a member of this group
    member = GroupMember.query.filter_by(group_id=group_id, user_id=user_id, is_active=True).first()
    if not member:
        return jsonify({'status': 'fail', 'message': 'You are not a member of this group.'}), 403

    post_data = request.get_json()
    if not post_data:
        return jsonify({'status': 'fail', 'message': 'Invalid payload.'}), 400

    vote = post_data.get('vote')
    vote_reason = post_data.get('vote_reason')

    if vote not in ['FOR', 'AGAINST', 'ABSTAIN']:
        return jsonify({'status': 'fail', 'message': 'Invalid vote. Must be FOR, AGAINST, or ABSTAIN.'}), 400

    # Check if member already voted
    existing_vote = CampaignVote.query.filter_by(
        group_campaign_id=group_campaign_id,
        member_id=member.id
    ).first()

    try:
        if existing_vote:
            # Update existing vote
            existing_vote.vote = vote
            existing_vote.vote_reason = vote_reason
            existing_vote.vote_date = func.now()
        else:
            # Create new vote
            campaign_vote = CampaignVote(
                group_campaign_id=group_campaign_id,
                member_id=member.id,
                vote=vote,
                vote_reason=vote_reason
            )
            
            # Check if member is an officer (higher vote weight)
            if member.is_officer():
                campaign_vote.is_officer_vote = True
                campaign_vote.vote_weight = 1.5  # Officers get 1.5x weight
            
            db.session.add(campaign_vote)

        # Update vote counts
        votes = CampaignVote.query.filter_by(group_campaign_id=group_campaign_id).all()
        group_campaign.votes_for = sum(1 for v in votes if v.vote == 'FOR')
        group_campaign.votes_against = sum(1 for v in votes if v.vote == 'AGAINST')
        group_campaign.votes_abstain = sum(1 for v in votes if v.vote == 'ABSTAIN')
        
        total_members = GroupMember.query.filter_by(group_id=group_id, is_active=True).count()
        group_campaign.voting_participation_rate = (len(votes) / total_members) * 100

        # Check if voting should close (e.g., all members voted or deadline passed)
        if len(votes) >= total_members or (group_campaign.voting_deadline and datetime.now() > group_campaign.voting_deadline):
            # Determine outcome
            total_weighted_votes = sum(v.vote_weight for v in votes if v.vote in ['FOR', 'AGAINST'])
            weighted_votes_for = sum(v.vote_weight for v in votes if v.vote == 'FOR')
            
            if total_weighted_votes > 0:
                approval_rate = (weighted_votes_for / total_weighted_votes) * 100
                required_rate = float(group_campaign.campaign.minimum_participation_rate)
                
                if approval_rate >= required_rate:
                    group_campaign.status = 'ACCEPTED'
                    # Activate member participations for those who voted FOR
                    for vote_record in votes:
                        if vote_record.vote == 'FOR':
                            participation = MemberCampaignParticipation.query.filter_by(
                                group_campaign_id=group_campaign_id,
                                member_id=vote_record.member_id
                            ).first()
                            if participation:
                                participation.is_participating = True
                                participation.participation_date = func.now()
                else:
                    group_campaign.status = 'REJECTED'
            
            group_campaign.decision_date = func.now()

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Vote recorded successfully.',
            'data': {
                'group_campaign': group_campaign.to_json(),
                'vote_summary': {
                    'votes_for': group_campaign.votes_for,
                    'votes_against': group_campaign.votes_against,
                    'votes_abstain': group_campaign.votes_abstain,
                    'participation_rate': float(group_campaign.voting_participation_rate)
                }
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to record vote.'}), 500


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/target-campaigns', methods=['GET'])
@authenticate
@service_permission_required('Savings Groups', 'read')
def get_group_target_campaigns(user_id, group_id):
    """Get target campaigns for a specific group"""
    from project.api.models import GroupTargetCampaign
    
    group = SavingsGroup.query.get(group_id)
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    campaigns = GroupTargetCampaign.query.filter_by(group_id=group_id).order_by(
        desc(GroupTargetCampaign.created_date)
    ).all()

    return jsonify({
        'status': 'success',
        'data': {
            'group_campaigns': [campaign.to_json() for campaign in campaigns],
            'total_campaigns': len(campaigns)
        }
    }), 200


@savings_groups_blueprint.route('/savings-groups/<int:group_id>/target-campaigns/<int:group_campaign_id>/contribute', methods=['POST'])
@authenticate
@service_permission_required('Savings Groups', 'write')
def contribute_to_target_campaign(user_id, group_id, group_campaign_id):
    """Contribute to a target savings campaign"""
    from project.api.models import GroupTargetCampaign, MemberCampaignParticipation
    from project.api.cashbook_service import CashbookService
    
    group = SavingsGroup.query.get(group_id)
    if not group:
        return jsonify({'status': 'fail', 'message': 'Savings group not found.'}), 404

    group_campaign = GroupTargetCampaign.query.get(group_campaign_id)
    if not group_campaign or group_campaign.group_id != group_id:
        return jsonify({'status': 'fail', 'message': 'Group campaign not found.'}), 404

    if group_campaign.status not in ['ACTIVE', 'ACCEPTED']:
        return jsonify({'status': 'fail', 'message': 'Campaign is not active for contributions.'}), 400

    # Check if user is a member of this group
    member = GroupMember.query.filter_by(group_id=group_id, user_id=user_id, is_active=True).first()
    if not member:
        return jsonify({'status': 'fail', 'message': 'You are not a member of this group.'}), 403

    post_data = request.get_json()
    if not post_data:
        return jsonify({'status': 'fail', 'message': 'Invalid payload.'}), 400

    amount = post_data.get('amount')
    mobile_money_transaction_id = post_data.get('mobile_money_transaction_id')
    mobile_money_provider = post_data.get('mobile_money_provider')

    if not amount:
        return jsonify({'status': 'fail', 'message': 'Contribution amount is required.'}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            return jsonify({'status': 'fail', 'message': 'Amount must be positive.'}), 400
    except (ValueError, TypeError):
        return jsonify({'status': 'fail', 'message': 'Invalid amount format.'}), 400

    try:
        # Get or create member participation
        participation = MemberCampaignParticipation.query.filter_by(
            group_campaign_id=group_campaign_id,
            member_id=member.id
        ).first()

        if not participation:
            participation = MemberCampaignParticipation(
                group_campaign_id=group_campaign_id,
                member_id=member.id,
                is_participating=True
            )
            db.session.add(participation)
            db.session.flush()

        if not participation.is_participating:
            return jsonify({'status': 'fail', 'message': 'You are not participating in this campaign.'}), 400

        # Record the contribution
        participation.record_contribution(amount)

        # Update group campaign progress
        group_campaign.update_progress()

        # Record in cashbook as target savings
        cashbook_entry = CashbookService.create_cashbook_entry(
            group_id=group_id,
            transaction_date=date.today(),
            description=f'Target Campaign Contribution - {group_campaign.campaign.name} - {member.name}',
            entry_type='DEPOSIT',
            created_by=user_id,
            member_id=member.id,
            reference_number=mobile_money_transaction_id,
            target_saving=amount
        )

        db.session.commit()

        # Check if campaign is completed
        completion_message = ""
        if group_campaign.is_completed:
            completion_message = f" Campaign target achieved! 🎉"

        return jsonify({
            'status': 'success',
            'message': f'Contribution of ${amount:.2f} recorded successfully.{completion_message}',
            'data': {
                'participation': participation.to_json(),
                'group_campaign': group_campaign.to_json(),
                'cashbook_entry': cashbook_entry.to_json()
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'fail', 'message': 'Failed to record contribution.'}), 500


# Health check endpoint
@savings_groups_blueprint.route('/savings-groups/health', methods=['GET'])
def health_check():
    """Health check endpoint for savings groups service"""
    return jsonify({
        'status': 'success',
        'message': 'Savings Groups service is healthy',
        'service': 'savings-groups',
        'version': '2.0.0'
    }), 200