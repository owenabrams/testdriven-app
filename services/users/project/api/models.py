# services/users/project/api/models.py

import datetime
import jwt
from sqlalchemy.sql import func
from flask import current_app

from project import db, bcrypt


class User(db.Model):

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(128), unique=True, nullable=False)
    email = db.Column(db.String(128), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean(), default=True, nullable=False)
    admin = db.Column(db.Boolean, default=False, nullable=False)

    # Enhanced RBAC fields
    role = db.Column(db.String(50), default='user', nullable=False)  # 'super_admin', 'service_admin', 'user'
    is_super_admin = db.Column(db.Boolean, default=False, nullable=False)

    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Relationships
    service_permissions = db.relationship('UserServicePermission', back_populates='user', foreign_keys='UserServicePermission.user_id', cascade='all, delete-orphan')
    managed_services = db.relationship('ServiceAdmin', back_populates='admin_user', foreign_keys='ServiceAdmin.user_id', cascade='all, delete-orphan')
    access_requests = db.relationship('ServiceAccessRequest', back_populates='user', foreign_keys='ServiceAccessRequest.user_id', cascade='all, delete-orphan')

    def __init__(self, username, email, password):
        self.username = username
        self.email = email
        self.password = bcrypt.generate_password_hash(
            password, current_app.config.get('BCRYPT_LOG_ROUNDS')
        ).decode()

    def check_password(self, password):
        """Check if provided password matches the hashed password."""
        return bcrypt.check_password_hash(self.password, password)

    def encode_auth_token(self, user_id):
        """Generates the auth token"""
        try:
            payload = {
                'exp': datetime.datetime.utcnow() + datetime.timedelta(
                    days=current_app.config.get('TOKEN_EXPIRATION_DAYS'),
                    seconds=current_app.config.get('TOKEN_EXPIRATION_SECONDS')
                ),
                'iat': datetime.datetime.utcnow(),
                'sub': user_id
            }
            return jwt.encode(
                payload,
                current_app.config.get('SECRET_KEY'),
                algorithm='HS256'
            )
        except Exception as e:
            return e

    @staticmethod
    def decode_auth_token(auth_token):
        """
        Decodes the auth token - :param auth_token: - :return: integer|string
        """
        try:
            payload = jwt.decode(
                auth_token, current_app.config.get('SECRET_KEY'), algorithms=['HS256'])
            return payload['sub']
        except jwt.ExpiredSignatureError:
            return 'Signature expired. Please log in again.'
        except jwt.InvalidTokenError:
            return 'Invalid token. Please log in again.'

    def to_json(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "active": self.active,
            "admin": self.admin,
            "role": self.role,
            "is_super_admin": self.is_super_admin,
            "managed_services": [sa.service.name for sa in self.managed_services] if self.managed_services else [],
            "service_permissions": [
                {
                    "service": perm.service.name,
                    "permissions": perm.permissions,
                    "granted_date": perm.granted_date.isoformat() if perm.granted_date else None
                } for perm in self.service_permissions
            ] if self.service_permissions else []
        }

    def has_permission(self, service_name, permission_type='read'):
        """Check if user has specific permission for a service"""
        if self.is_super_admin:
            return True

        # Check if user is admin of this service
        for managed_service in self.managed_services:
            if managed_service.service.name == service_name:
                return True

        # Check specific permissions
        for perm in self.service_permissions:
            if perm.service.name == service_name:
                permissions = perm.permissions.split(',') if perm.permissions else []
                return permission_type in permissions

        return False

    def is_service_admin(self, service_name):
        """Check if user is admin of a specific service"""
        if self.is_super_admin:
            return True

        for managed_service in self.managed_services:
            if managed_service.service.name == service_name:
                return True

        return False


class Service(db.Model):
    """Represents a microservice in the system"""

    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(128), unique=True, nullable=False)
    description = db.Column(db.Text)
    endpoint_url = db.Column(db.String(255))
    active = db.Column(db.Boolean, default=True, nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Relationships
    service_admins = db.relationship('ServiceAdmin', back_populates='service', cascade='all, delete-orphan')
    user_permissions = db.relationship('UserServicePermission', back_populates='service', cascade='all, delete-orphan')
    access_requests = db.relationship('ServiceAccessRequest', back_populates='service', cascade='all, delete-orphan')

    def __init__(self, name, description=None, endpoint_url=None):
        self.name = name
        self.description = description
        self.endpoint_url = endpoint_url

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "endpoint_url": self.endpoint_url,
            "active": self.active,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "admin_count": len(self.service_admins),
            "user_count": len(self.user_permissions)
        }


class ServiceAdmin(db.Model):
    """Maps service admins to services they manage"""

    __tablename__ = "service_admins"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    granted_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    granted_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Relationships
    admin_user = db.relationship('User', back_populates='managed_services', foreign_keys=[user_id])
    service = db.relationship('Service', back_populates='service_admins')
    granter = db.relationship('User', foreign_keys=[granted_by])

    # Unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'service_id', name='unique_service_admin'),)


class UserServicePermission(db.Model):
    """Maps users to services with specific permissions"""

    __tablename__ = "user_service_permissions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    permissions = db.Column(db.String(255), default='read')  # comma-separated: read,write,delete
    granted_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    granted_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Relationships
    user = db.relationship('User', back_populates='service_permissions', foreign_keys=[user_id])
    service = db.relationship('Service', back_populates='user_permissions')
    granter = db.relationship('User', foreign_keys=[granted_by])

    # Unique constraint
    __table_args__ = (db.UniqueConstraint('user_id', 'service_id', name='unique_user_service_permission'),)


class ServiceAccessRequest(db.Model):
    """Tracks user requests for service access"""

    __tablename__ = "service_access_requests"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=False)
    requested_permissions = db.Column(db.String(255), default='read')
    reason = db.Column(db.Text)
    status = db.Column(db.String(50), default='pending')  # pending, approved, rejected

    request_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    reviewed_date = db.Column(db.DateTime)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    review_notes = db.Column(db.Text)

    # Relationships
    user = db.relationship('User', back_populates='access_requests', foreign_keys=[user_id])
    service = db.relationship('Service', back_populates='access_requests')
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])

    def to_json(self):
        return {
            "id": self.id,
            "user": {
                "id": self.user.id,
                "username": self.user.username,
                "email": self.user.email
            },
            "service": {
                "id": self.service.id,
                "name": self.service.name
            },
            "requested_permissions": self.requested_permissions,
            "reason": self.reason,
            "status": self.status,
            "request_date": self.request_date.isoformat() if self.request_date else None,
            "reviewed_date": self.reviewed_date.isoformat() if self.reviewed_date else None,
            "reviewer": {
                "id": self.reviewer.id,
                "username": self.reviewer.username
            } if self.reviewer else None,
            "review_notes": self.review_notes
        }


class Notification(db.Model):
    """Cross-service notification system"""

    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.id'), nullable=True)  # Optional service context
    type = db.Column(db.String(50), nullable=False)  # info, warning, error, success
    title = db.Column(db.String(255), nullable=True)
    message = db.Column(db.Text, nullable=False)
    
    # Notification state
    read = db.Column(db.Boolean, default=False, nullable=False)
    read_date = db.Column(db.DateTime, nullable=True)
    
    # Metadata
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # System or user who created it
    
    # Optional action data (JSON for flexibility)
    action_url = db.Column(db.String(500), nullable=True)  # URL to navigate to
    action_data = db.Column(db.Text, nullable=True)  # JSON data for actions
    
    # Expiration (optional)
    expires_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id])
    service = db.relationship('Service', foreign_keys=[service_id])
    creator = db.relationship('User', foreign_keys=[created_by])

    def __init__(self, user_id, message, type='info', title=None, service_id=None, created_by=None, action_url=None, action_data=None, expires_at=None):
        self.user_id = user_id
        self.message = message
        self.type = type
        self.title = title
        self.service_id = service_id
        self.created_by = created_by
        self.action_url = action_url
        self.action_data = action_data
        self.expires_at = expires_at

    def mark_as_read(self):
        """Mark notification as read"""
        self.read = True
        self.read_date = func.now()

    def to_json(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "service": {
                "id": self.service.id,
                "name": self.service.name
            } if self.service else None,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "read": self.read,
            "read_date": self.read_date.isoformat() if self.read_date else None,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "creator": {
                "id": self.creator.id,
                "username": self.creator.username
            } if self.creator else None,
            "action_url": self.action_url,
            "action_data": self.action_data,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None
        }


class SavingsGroup(db.Model):
    """Savings group entity following VisionFund model"""

    __tablename__ = "savings_groups"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Enhanced location information
    country = db.Column(db.String(100), nullable=True)
    region = db.Column(db.String(100), nullable=True)
    district = db.Column(db.String(100), nullable=False)
    parish = db.Column(db.String(100), nullable=False)
    village = db.Column(db.String(100), nullable=False)
    
    # Group governance and compliance
    constitution_document_url = db.Column(db.String(500), nullable=True)  # URL to constitution document
    registration_certificate_url = db.Column(db.String(500), nullable=True)  # URL to registration certificate
    is_registered = db.Column(db.Boolean, default=False, nullable=False)
    registration_number = db.Column(db.String(100), nullable=True, unique=True)
    registration_date = db.Column(db.Date, nullable=True)
    
    # Group lifecycle
    formation_date = db.Column(db.Date, nullable=False)
    state = db.Column(db.String(50), nullable=False, default='FORMING')  # FORMING, ACTIVE, MATURE, ELIGIBLE_FOR_LOAN, LOAN_ACTIVE, CLOSED
    
    # Financial information
    savings_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    target_amount = db.Column(db.Numeric(12, 2), nullable=True)
    
    # Member management
    members_count = db.Column(db.Integer, default=0, nullable=False)
    max_members = db.Column(db.Integer, default=30, nullable=False)
    
    # Officer assignments (references to GroupMember IDs) - use_alter to break circular dependency
    chair_member_id = db.Column(db.Integer, db.ForeignKey('group_members.id', use_alter=True, name='fk_chair_member'), nullable=True)
    treasurer_member_id = db.Column(db.Integer, db.ForeignKey('group_members.id', use_alter=True, name='fk_treasurer_member'), nullable=True)
    secretary_member_id = db.Column(db.Integer, db.ForeignKey('group_members.id', use_alter=True, name='fk_secretary_member'), nullable=True)
    
    # Group settings
    meeting_frequency = db.Column(db.String(50), default='WEEKLY', nullable=False)  # WEEKLY, BIWEEKLY, MONTHLY
    minimum_contribution = db.Column(db.Numeric(10, 2), nullable=True)
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    members = db.relationship('GroupMember', back_populates='group', cascade='all, delete-orphan', foreign_keys='GroupMember.group_id')
    loans = db.relationship('GroupLoan', back_populates='group', cascade='all, delete-orphan')
    transactions = db.relationship('GroupTransaction', back_populates='group', cascade='all, delete-orphan')
    cashbook_entries = db.relationship('GroupCashbook', cascade='all, delete-orphan')
    meeting_attendance = db.relationship('MeetingAttendance', cascade='all, delete-orphan')
    
    # Officer relationships
    chair = db.relationship('GroupMember', foreign_keys=[chair_member_id], post_update=True)
    treasurer = db.relationship('GroupMember', foreign_keys=[treasurer_member_id], post_update=True)
    secretary = db.relationship('GroupMember', foreign_keys=[secretary_member_id], post_update=True)

    # Constraints
    __table_args__ = (
        db.CheckConstraint('members_count <= max_members', name='check_member_limit'),
        db.CheckConstraint('savings_balance >= 0', name='check_positive_balance'),
        db.CheckConstraint("state IN ('FORMING', 'ACTIVE', 'MATURE', 'ELIGIBLE_FOR_LOAN', 'LOAN_ACTIVE', 'CLOSED')", name='check_valid_state'),
    )

    def __init__(self, name, formation_date, created_by, description=None, country=None, region=None, district=None, parish=None, village=None, target_amount=None, max_members=30):
        self.name = name
        self.description = description
        self.country = country
        self.region = region
        self.district = district
        self.parish = parish
        self.village = village
        self.formation_date = formation_date
        self.created_by = created_by
        self.target_amount = target_amount
        self.max_members = max_members

    def can_add_member(self):
        """Check if group can accept new members"""
        return self.members_count < self.max_members and self.state in ['FORMING', 'ACTIVE']

    def is_mature(self, min_months=6, min_balance=1000.00):
        """Check if group meets maturity criteria for loan eligibility"""
        from datetime import datetime, timedelta
        
        # Check age requirement
        months_active = (datetime.now().date() - self.formation_date).days / 30.44  # Average days per month
        age_requirement = months_active >= min_months
        
        # Check balance requirement
        balance_requirement = float(self.savings_balance) >= min_balance
        
        # Check minimum members (configurable, default 5)
        member_requirement = self.members_count >= 5
        
        return age_requirement and balance_requirement and member_requirement

    def update_state(self):
        """Update group state based on current conditions"""
        if self.state == 'FORMING' and self.members_count >= 5:
            self.state = 'ACTIVE'
        elif self.state == 'ACTIVE' and self.is_mature():
            self.state = 'MATURE'
        elif self.state == 'MATURE' and not self.has_active_loan():
            self.state = 'ELIGIBLE_FOR_LOAN'

    def has_active_loan(self):
        """Check if group has any active loans"""
        active_statuses = ['APPROVED', 'DISBURSED', 'PARTIALLY_REPAID']
        return any(loan.status in active_statuses for loan in self.loans)

    def calculate_loan_limit(self, multiplier=3.0, max_percentage=0.8):
        """Calculate maximum loan amount based on savings"""
        # Method 1: Multiple of average monthly contributions (simplified as current balance * multiplier)
        balance_based = float(self.savings_balance) * multiplier
        
        # Method 2: Percentage of current savings
        percentage_based = float(self.savings_balance) * max_percentage
        
        # Return the lower of the two
        return min(balance_based, percentage_based)

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "country": self.country,
            "region": self.region,
            "formation_date": self.formation_date.isoformat() if self.formation_date else None,
            "state": self.state,
            "savings_balance": float(self.savings_balance),
            "target_amount": float(self.target_amount) if self.target_amount else None,
            "members_count": self.members_count,
            "max_members": self.max_members,
            "meeting_frequency": self.meeting_frequency,
            "minimum_contribution": float(self.minimum_contribution) if self.minimum_contribution else None,
            "officers": {
                "chair": self.chair.to_json() if self.chair else None,
                "treasurer": self.treasurer.to_json() if self.treasurer else None,
                "secretary": self.secretary.to_json() if self.secretary else None
            },
            "created_by": self.creator.username if self.creator else None,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "updated_date": self.updated_date.isoformat() if self.updated_date else None,
            "is_mature": self.is_mature(),
            "loan_limit": self.calculate_loan_limit(),
            "has_active_loan": self.has_active_loan()
        }


class GroupMember(db.Model):
    """Member of a savings group with role and contribution tracking"""

    __tablename__ = "group_members"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Member information
    name = db.Column(db.String(255), nullable=False)  # Display name in group context
    gender = db.Column(db.String(10), nullable=False)  # M, F, OTHER
    phone = db.Column(db.String(20), nullable=True)
    
    # Membership details
    joined_date = db.Column(db.Date, default=func.current_date(), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Financial tracking
    share_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    total_contributions = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    
    # Role in group (separate from officer positions)
    role = db.Column(db.String(50), default='MEMBER', nullable=False)  # MEMBER, OFFICER, FOUNDER
    
    # Audit fields
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    group = db.relationship('SavingsGroup', back_populates='members', foreign_keys=[group_id])
    user = db.relationship('User', foreign_keys=[user_id])
    transactions = db.relationship('GroupTransaction', back_populates='member')
    savings = db.relationship('MemberSaving', cascade='all, delete-orphan')
    fines = db.relationship('MemberFine', cascade='all, delete-orphan')
    loan_assessments = db.relationship('LoanAssessment', cascade='all, delete-orphan')
    attendance_records = db.relationship('MeetingAttendance', cascade='all, delete-orphan')

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('group_id', 'user_id', name='unique_group_membership'),
        db.CheckConstraint('share_balance >= 0', name='check_positive_share_balance'),
        db.CheckConstraint('total_contributions >= 0', name='check_positive_contributions'),
        db.CheckConstraint("gender IN ('M', 'F', 'OTHER')", name='check_valid_gender'),
        db.CheckConstraint("role IN ('MEMBER', 'OFFICER', 'FOUNDER')", name='check_valid_role'),
    )

    def __init__(self, group_id, user_id, name, gender, phone=None, role='MEMBER'):
        self.group_id = group_id
        self.user_id = user_id
        self.name = name
        self.gender = gender
        self.phone = phone
        self.role = role

    def is_officer(self):
        """Check if member holds any officer position"""
        return (self.group.chair_member_id == self.id or 
                self.group.treasurer_member_id == self.id or 
                self.group.secretary_member_id == self.id)

    def get_officer_role(self):
        """Get the specific officer role if any"""
        if self.group.chair_member_id == self.id:
            return 'chair'
        elif self.group.treasurer_member_id == self.id:
            return 'treasurer'
        elif self.group.secretary_member_id == self.id:
            return 'secretary'
        return None

    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "user_id": self.user_id,
            "name": self.name,
            "gender": self.gender,
            "phone": self.phone,
            "joined_date": self.joined_date.isoformat() if self.joined_date else None,
            "is_active": self.is_active,
            "share_balance": float(self.share_balance),
            "total_contributions": float(self.total_contributions),
            "role": self.role,
            "officer_role": self.get_officer_role(),
            "is_officer": self.is_officer(),
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class GroupLoan(db.Model):
    """Group loan tracking with VisionFund business rules"""

    __tablename__ = "group_loans"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    
    # Loan details
    principal = db.Column(db.Numeric(12, 2), nullable=False)
    term_months = db.Column(db.Integer, nullable=False)
    interest_rate_annual = db.Column(db.Numeric(5, 2), nullable=False)
    purpose = db.Column(db.Text, nullable=True)
    
    # Loan status and dates
    status = db.Column(db.String(50), nullable=False, default='PENDING')  # PENDING, APPROVED, DISBURSED, PARTIALLY_REPAID, CLOSED, DEFAULTED
    request_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    approval_date = db.Column(db.DateTime, nullable=True)
    disbursal_date = db.Column(db.DateTime, nullable=True)
    due_date = db.Column(db.Date, nullable=True)
    
    # Financial tracking
    outstanding_balance = db.Column(db.Numeric(12, 2), nullable=True)
    total_repaid = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    
    # Request and approval tracking
    requested_by = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # System user who approved
    
    # Officer consent tracking (JSON field for flexibility)
    officer_approvals = db.Column(db.Text, nullable=True)  # JSON: {"chair": {"approved": true, "date": "..."}, ...}
    
    # Audit fields
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    group = db.relationship('SavingsGroup', back_populates='loans')
    requester = db.relationship('GroupMember', foreign_keys=[requested_by])
    approver = db.relationship('User', foreign_keys=[approved_by])
    transactions = db.relationship('GroupTransaction', back_populates='loan')
    repayment_schedule = db.relationship('LoanRepaymentSchedule', cascade='all, delete-orphan')

    # Constraints
    __table_args__ = (
        db.CheckConstraint('principal > 0', name='check_positive_principal'),
        db.CheckConstraint('term_months > 0 AND term_months <= 24', name='check_valid_term'),
        db.CheckConstraint('interest_rate_annual >= 0', name='check_valid_interest_rate'),
        db.CheckConstraint('outstanding_balance >= 0', name='check_positive_outstanding'),
        db.CheckConstraint('total_repaid >= 0', name='check_positive_repaid'),
        db.CheckConstraint("status IN ('PENDING', 'APPROVED', 'DISBURSED', 'PARTIALLY_REPAID', 'CLOSED', 'DEFAULTED')", name='check_valid_loan_status'),
    )

    def __init__(self, group_id, principal, term_months, interest_rate_annual, requested_by, purpose=None):
        self.group_id = group_id
        self.principal = principal
        self.term_months = term_months
        self.interest_rate_annual = interest_rate_annual
        self.requested_by = requested_by
        self.purpose = purpose
        self.outstanding_balance = principal  # Initially equals principal

    def calculate_monthly_payment(self):
        """Calculate monthly payment using simple interest"""
        if self.term_months == 0:
            return float(self.principal)
        
        # Simple interest calculation
        total_interest = float(self.principal) * (float(self.interest_rate_annual) / 100) * (self.term_months / 12)
        total_amount = float(self.principal) + total_interest
        return total_amount / self.term_months

    def is_overdue(self, grace_days=7):
        """Check if loan is overdue"""
        if not self.due_date or self.status in ['CLOSED', 'DEFAULTED']:
            return False
        
        from datetime import datetime, timedelta
        grace_period = self.due_date + timedelta(days=grace_days)
        return datetime.now().date() > grace_period

    def days_overdue(self):
        """Calculate days overdue"""
        if not self.is_overdue():
            return 0
        
        from datetime import datetime
        return (datetime.now().date() - self.due_date).days

    def approve_loan(self, approver_id, officer_approvals_json=None):
        """Approve the loan with officer consent"""
        self.status = 'APPROVED'
        self.approved_by = approver_id
        self.approval_date = func.now()
        if officer_approvals_json:
            self.officer_approvals = officer_approvals_json

    def disburse_loan(self):
        """Mark loan as disbursed and update group state"""
        from datetime import datetime, timedelta
        
        self.status = 'DISBURSED'
        self.disbursal_date = func.now()
        self.due_date = (datetime.now() + timedelta(days=30 * self.term_months)).date()
        
        # Update group state
        self.group.state = 'LOAN_ACTIVE'

    def record_repayment(self, amount):
        """Record a repayment and update balances"""
        self.total_repaid += amount
        self.outstanding_balance -= amount
        
        if self.outstanding_balance <= 0:
            self.status = 'CLOSED'
            self.outstanding_balance = 0
            # Check if group can return to eligible state
            if not self.group.has_active_loan():
                self.group.state = 'ELIGIBLE_FOR_LOAN'
        elif self.total_repaid > 0:
            self.status = 'PARTIALLY_REPAID'

    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "principal": float(self.principal),
            "term_months": self.term_months,
            "interest_rate_annual": float(self.interest_rate_annual),
            "purpose": self.purpose,
            "status": self.status,
            "request_date": self.request_date.isoformat() if self.request_date else None,
            "approval_date": self.approval_date.isoformat() if self.approval_date else None,
            "disbursal_date": self.disbursal_date.isoformat() if self.disbursal_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "outstanding_balance": float(self.outstanding_balance) if self.outstanding_balance else 0,
            "total_repaid": float(self.total_repaid),
            "monthly_payment": self.calculate_monthly_payment(),
            "is_overdue": self.is_overdue(),
            "days_overdue": self.days_overdue(),
            "requester": self.requester.name if self.requester else None,
            "approver": self.approver.username if self.approver else None,
            "officer_approvals": self.officer_approvals,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class GroupTransaction(db.Model):
    """Financial transactions for savings groups with idempotency"""

    __tablename__ = "group_transactions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=True)  # Null for system transactions
    loan_id = db.Column(db.Integer, db.ForeignKey('group_loans.id'), nullable=True)  # For loan-related transactions
    
    # Transaction details
    type = db.Column(db.String(50), nullable=False)  # SAVING_CONTRIBUTION, WITHDRAWAL, LOAN_DISBURSEMENT, LOAN_REPAYMENT, PENALTY, INTEREST
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    description = db.Column(db.Text, nullable=True)
    
    # Balance tracking
    member_balance_before = db.Column(db.Numeric(12, 2), nullable=True)
    member_balance_after = db.Column(db.Numeric(12, 2), nullable=True)
    group_balance_before = db.Column(db.Numeric(12, 2), nullable=False)
    group_balance_after = db.Column(db.Numeric(12, 2), nullable=False)
    
    # Idempotency and audit
    idempotency_key = db.Column(db.String(255), unique=True, nullable=True)
    processed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    processed_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    
    # Optional metadata (JSON for flexibility)
    transaction_metadata = db.Column(db.Text, nullable=True)  # JSON field for additional data

    # Relationships
    group = db.relationship('SavingsGroup', back_populates='transactions')
    member = db.relationship('GroupMember', back_populates='transactions')
    loan = db.relationship('GroupLoan', back_populates='transactions')
    processor = db.relationship('User', foreign_keys=[processed_by])

    # Constraints
    __table_args__ = (
        db.CheckConstraint('amount != 0', name='check_non_zero_amount'),
        db.CheckConstraint('group_balance_after >= 0', name='check_positive_group_balance'),
        db.CheckConstraint("type IN ('SAVING_CONTRIBUTION', 'WITHDRAWAL', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'PENALTY', 'INTEREST')", name='check_valid_transaction_type'),
    )

    def __init__(self, group_id, type, amount, processed_by, member_id=None, loan_id=None, description=None, idempotency_key=None, transaction_metadata=None):
        self.group_id = group_id
        self.member_id = member_id
        self.loan_id = loan_id
        self.type = type
        self.amount = amount
        self.description = description
        self.processed_by = processed_by
        self.idempotency_key = idempotency_key
        self.transaction_metadata = transaction_metadata

    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "member": self.member.name if self.member else None,
            "loan_id": self.loan_id,
            "type": self.type,
            "amount": float(self.amount),
            "description": self.description,
            "member_balance_before": float(self.member_balance_before) if self.member_balance_before else None,
            "member_balance_after": float(self.member_balance_after) if self.member_balance_after else None,
            "group_balance_before": float(self.group_balance_before),
            "group_balance_after": float(self.group_balance_after),
            "processed_by": self.processor.username if self.processor else None,
            "processed_date": self.processed_date.isoformat() if self.processed_date else None,
            "idempotency_key": self.idempotency_key,
            "metadata": self.transaction_metadata
        }

class SavingType(db.Model):
    """Configurable saving types for different purposes"""

    __tablename__ = "saving_types"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    code = db.Column(db.String(20), nullable=False, unique=True)  # ECD, PERSONAL, TARGET, SOCIAL
    
    # Configuration
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    requires_target = db.Column(db.Boolean, default=False, nullable=False)  # For target savings
    allows_withdrawal = db.Column(db.Boolean, default=True, nullable=False)
    minimum_amount = db.Column(db.Numeric(10, 2), nullable=True)
    maximum_amount = db.Column(db.Numeric(10, 2), nullable=True)
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    member_savings = db.relationship('MemberSaving', back_populates='saving_type')

    def __init__(self, name, code, created_by, description=None, requires_target=False, allows_withdrawal=True, minimum_amount=None, maximum_amount=None):
        self.name = name
        self.code = code
        self.created_by = created_by
        self.description = description
        self.requires_target = requires_target
        self.allows_withdrawal = allows_withdrawal
        self.minimum_amount = minimum_amount
        self.maximum_amount = maximum_amount

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "code": self.code,
            "is_active": self.is_active,
            "requires_target": self.requires_target,
            "allows_withdrawal": self.allows_withdrawal,
            "minimum_amount": float(self.minimum_amount) if self.minimum_amount else None,
            "maximum_amount": float(self.maximum_amount) if self.maximum_amount else None,
            "created_by": self.creator.username if self.creator else None,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class MemberSaving(db.Model):
    """Individual member savings by type with target tracking"""

    __tablename__ = "member_savings"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    saving_type_id = db.Column(db.Integer, db.ForeignKey('saving_types.id'), nullable=False)
    
    # Saving details
    current_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    target_amount = db.Column(db.Numeric(12, 2), nullable=True)  # For target savings
    target_date = db.Column(db.Date, nullable=True)
    target_description = db.Column(db.Text, nullable=True)
    
    # Status tracking
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_target_achieved = db.Column(db.Boolean, default=False, nullable=False)
    target_achieved_date = db.Column(db.Date, nullable=True)
    
    # Audit fields
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    member = db.relationship('GroupMember', foreign_keys=[member_id])
    saving_type = db.relationship('SavingType', back_populates='member_savings')
    transactions = db.relationship('SavingTransaction', back_populates='member_saving')

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('member_id', 'saving_type_id', name='unique_member_saving_type'),
        db.CheckConstraint('current_balance >= 0', name='check_positive_saving_balance'),
        db.CheckConstraint('target_amount > 0', name='check_positive_target_amount'),
    )

    def __init__(self, member_id, saving_type_id, target_amount=None, target_date=None, target_description=None):
        self.member_id = member_id
        self.saving_type_id = saving_type_id
        self.target_amount = target_amount
        self.target_date = target_date
        self.target_description = target_description

    def calculate_progress_percentage(self):
        """Calculate progress towards target"""
        if not self.target_amount or self.target_amount == 0:
            return 0
        return min(100, (float(self.current_balance) / float(self.target_amount)) * 100)

    def check_target_achievement(self):
        """Check and update target achievement status"""
        if self.target_amount and self.current_balance >= self.target_amount and not self.is_target_achieved:
            self.is_target_achieved = True
            self.target_achieved_date = func.current_date()
            return True
        return False

    def to_json(self):
        return {
            "id": self.id,
            "member_id": self.member_id,
            "saving_type": self.saving_type.to_json() if self.saving_type else None,
            "current_balance": float(self.current_balance),
            "target_amount": float(self.target_amount) if self.target_amount else None,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "target_description": self.target_description,
            "progress_percentage": self.calculate_progress_percentage(),
            "is_active": self.is_active,
            "is_target_achieved": self.is_target_achieved,
            "target_achieved_date": self.target_achieved_date.isoformat() if self.target_achieved_date else None,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class SavingTransaction(db.Model):
    """Individual saving transactions with mobile money integration"""

    __tablename__ = "saving_transactions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    member_saving_id = db.Column(db.Integer, db.ForeignKey('member_savings.id'), nullable=False)
    
    # Transaction details
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    transaction_type = db.Column(db.String(50), nullable=False)  # DEPOSIT, WITHDRAWAL
    description = db.Column(db.Text, nullable=True)
    
    # Mobile money integration
    mobile_money_transaction_id = db.Column(db.String(100), nullable=True, unique=True)
    mobile_money_provider = db.Column(db.String(50), nullable=True)  # MTN, AIRTEL, etc.
    mobile_money_phone = db.Column(db.String(20), nullable=True)
    
    # Balance tracking
    balance_before = db.Column(db.Numeric(12, 2), nullable=False)
    balance_after = db.Column(db.Numeric(12, 2), nullable=False)
    
    # Status and verification
    status = db.Column(db.String(50), default='PENDING', nullable=False)  # PENDING, VERIFIED, REJECTED
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    verified_date = db.Column(db.DateTime, nullable=True)
    
    # Audit fields
    processed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    processed_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    idempotency_key = db.Column(db.String(255), unique=True, nullable=True)

    # Relationships
    member_saving = db.relationship('MemberSaving', back_populates='transactions')
    processor = db.relationship('User', foreign_keys=[processed_by])
    verifier = db.relationship('User', foreign_keys=[verified_by])

    # Constraints
    __table_args__ = (
        db.CheckConstraint('amount > 0', name='check_positive_saving_amount'),
        db.CheckConstraint('balance_after >= 0', name='check_positive_balance_after'),
        db.CheckConstraint("transaction_type IN ('DEPOSIT', 'WITHDRAWAL')", name='check_valid_saving_transaction_type'),
        db.CheckConstraint("status IN ('PENDING', 'VERIFIED', 'REJECTED')", name='check_valid_saving_status'),
    )

    def __init__(self, member_saving_id, amount, transaction_type, processed_by, description=None, mobile_money_transaction_id=None, mobile_money_provider=None, mobile_money_phone=None, idempotency_key=None):
        self.member_saving_id = member_saving_id
        self.amount = amount
        self.transaction_type = transaction_type
        self.processed_by = processed_by
        self.description = description
        self.mobile_money_transaction_id = mobile_money_transaction_id
        self.mobile_money_provider = mobile_money_provider
        self.mobile_money_phone = mobile_money_phone
        self.idempotency_key = idempotency_key

    def to_json(self):
        return {
            "id": self.id,
            "member_saving_id": self.member_saving_id,
            "amount": float(self.amount),
            "transaction_type": self.transaction_type,
            "description": self.description,
            "mobile_money_transaction_id": self.mobile_money_transaction_id,
            "mobile_money_provider": self.mobile_money_provider,
            "mobile_money_phone": self.mobile_money_phone,
            "balance_before": float(self.balance_before),
            "balance_after": float(self.balance_after),
            "status": self.status,
            "verified_by": self.verifier.username if self.verifier else None,
            "verified_date": self.verified_date.isoformat() if self.verified_date else None,
            "processed_by": self.processor.username if self.processor else None,
            "processed_date": self.processed_date.isoformat() if self.processed_date else None,
            "idempotency_key": self.idempotency_key
        }


class MeetingAttendance(db.Model):
    """Track member attendance at savings meetings"""

    __tablename__ = "meeting_attendance"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    
    # Meeting details
    meeting_date = db.Column(db.Date, nullable=False)
    meeting_type = db.Column(db.String(50), default='REGULAR', nullable=False)  # REGULAR, SPECIAL, ANNUAL
    
    # Attendance tracking
    attended = db.Column(db.Boolean, default=False, nullable=False)
    attendance_time = db.Column(db.DateTime, nullable=True)
    excuse_reason = db.Column(db.Text, nullable=True)  # If absent with excuse
    
    # Meeting participation
    contributed_to_meeting = db.Column(db.Boolean, default=False, nullable=False)
    meeting_notes = db.Column(db.Text, nullable=True)
    
    # Audit fields
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recorded_date = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Relationships
    group = db.relationship('SavingsGroup', foreign_keys=[group_id])
    member = db.relationship('GroupMember', foreign_keys=[member_id])
    recorder = db.relationship('User', foreign_keys=[recorded_by])

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('group_id', 'member_id', 'meeting_date', name='unique_meeting_attendance'),
        db.CheckConstraint("meeting_type IN ('REGULAR', 'SPECIAL', 'ANNUAL')", name='check_valid_meeting_type'),
    )

    def __init__(self, group_id, member_id, meeting_date, recorded_by, attended=False, meeting_type='REGULAR', excuse_reason=None):
        self.group_id = group_id
        self.member_id = member_id
        self.meeting_date = meeting_date
        self.recorded_by = recorded_by
        self.attended = attended
        self.meeting_type = meeting_type
        self.excuse_reason = excuse_reason

    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "member": self.member.name if self.member else None,
            "meeting_date": self.meeting_date.isoformat() if self.meeting_date else None,
            "meeting_type": self.meeting_type,
            "attended": self.attended,
            "attendance_time": self.attendance_time.isoformat() if self.attendance_time else None,
            "excuse_reason": self.excuse_reason,
            "contributed_to_meeting": self.contributed_to_meeting,
            "meeting_notes": self.meeting_notes,
            "recorded_by": self.recorder.username if self.recorder else None,
            "recorded_date": self.recorded_date.isoformat() if self.recorded_date else None
        }


class MemberFine(db.Model):
    """Track fines imposed on group members"""

    __tablename__ = "member_fines"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    
    # Fine details
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    fine_type = db.Column(db.String(50), nullable=False)  # LATE_ATTENDANCE, MISSED_MEETING, LATE_PAYMENT, OTHER
    
    # Status tracking
    status = db.Column(db.String(50), default='PENDING', nullable=False)  # PENDING, PAID, WAIVED
    due_date = db.Column(db.Date, nullable=True)
    paid_date = db.Column(db.Date, nullable=True)
    waived_date = db.Column(db.Date, nullable=True)
    waived_reason = db.Column(db.Text, nullable=True)
    
    # Audit fields
    imposed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    imposed_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    member = db.relationship('GroupMember', foreign_keys=[member_id])
    imposer = db.relationship('User', foreign_keys=[imposed_by])
    updater = db.relationship('User', foreign_keys=[updated_by])

    # Constraints
    __table_args__ = (
        db.CheckConstraint('amount > 0', name='check_positive_fine_amount'),
        db.CheckConstraint("fine_type IN ('LATE_ATTENDANCE', 'MISSED_MEETING', 'LATE_PAYMENT', 'OTHER')", name='check_valid_fine_type'),
        db.CheckConstraint("status IN ('PENDING', 'PAID', 'WAIVED')", name='check_valid_fine_status'),
    )

    def __init__(self, member_id, amount, reason, fine_type, imposed_by, due_date=None):
        self.member_id = member_id
        self.amount = amount
        self.reason = reason
        self.fine_type = fine_type
        self.imposed_by = imposed_by
        self.due_date = due_date

    def is_overdue(self):
        """Check if fine is overdue"""
        if not self.due_date or self.status != 'PENDING':
            return False
        from datetime import date
        return date.today() > self.due_date

    def to_json(self):
        return {
            "id": self.id,
            "member": self.member.name if self.member else None,
            "amount": float(self.amount),
            "reason": self.reason,
            "fine_type": self.fine_type,
            "status": self.status,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "paid_date": self.paid_date.isoformat() if self.paid_date else None,
            "waived_date": self.waived_date.isoformat() if self.waived_date else None,
            "waived_reason": self.waived_reason,
            "is_overdue": self.is_overdue(),
            "imposed_by": self.imposer.username if self.imposer else None,
            "imposed_date": self.imposed_date.isoformat() if self.imposed_date else None
        }


class GroupCashbook(db.Model):
    """Comprehensive cashbook for tracking all group financial activities"""

    __tablename__ = "group_cashbook"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=True)  # Null for group-level entries
    
    # Transaction date and reference
    transaction_date = db.Column(db.Date, nullable=False)
    reference_number = db.Column(db.String(100), nullable=True)
    description = db.Column(db.Text, nullable=False)
    
    # Financial columns - all amounts in group currency
    individual_saving = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    ecd_fund = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    social_fund = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    target_saving = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    fines = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    loan_taken = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    loan_repayment = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    interest_earned = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    
    # Running balances
    individual_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    ecd_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    social_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    target_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    total_balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    
    # Entry type and status
    entry_type = db.Column(db.String(50), nullable=False)  # DEPOSIT, WITHDRAWAL, LOAN, FINE, INTEREST, TRANSFER
    status = db.Column(db.String(50), default='ACTIVE', nullable=False)  # ACTIVE, REVERSED, CORRECTED
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_date = db.Column(db.DateTime, nullable=True)

    # Relationships
    group = db.relationship('SavingsGroup', foreign_keys=[group_id])
    member = db.relationship('GroupMember', foreign_keys=[member_id])
    creator = db.relationship('User', foreign_keys=[created_by])
    approver = db.relationship('User', foreign_keys=[approved_by])

    # Constraints
    __table_args__ = (
        db.CheckConstraint('total_balance >= 0', name='check_positive_total_balance'),
        db.CheckConstraint("entry_type IN ('DEPOSIT', 'WITHDRAWAL', 'LOAN', 'FINE', 'INTEREST', 'TRANSFER')", name='check_valid_entry_type'),
        db.CheckConstraint("status IN ('ACTIVE', 'REVERSED', 'CORRECTED')", name='check_valid_cashbook_status'),
    )

    def __init__(self, group_id, transaction_date, description, entry_type, created_by, member_id=None, reference_number=None):
        self.group_id = group_id
        self.member_id = member_id
        self.transaction_date = transaction_date
        self.reference_number = reference_number
        self.description = description
        self.entry_type = entry_type
        self.created_by = created_by

    def calculate_total_balance(self):
        """Calculate and update total balance"""
        self.total_balance = (self.individual_balance + self.ecd_balance + 
                            self.social_balance + self.target_balance)
        return self.total_balance

    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "member": self.member.name if self.member else None,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
            "reference_number": self.reference_number,
            "description": self.description,
            "individual_saving": float(self.individual_saving),
            "ecd_fund": float(self.ecd_fund),
            "social_fund": float(self.social_fund),
            "target_saving": float(self.target_saving),
            "fines": float(self.fines),
            "loan_taken": float(self.loan_taken),
            "loan_repayment": float(self.loan_repayment),
            "interest_earned": float(self.interest_earned),
            "individual_balance": float(self.individual_balance),
            "ecd_balance": float(self.ecd_balance),
            "social_balance": float(self.social_balance),
            "target_balance": float(self.target_balance),
            "total_balance": float(self.total_balance),
            "entry_type": self.entry_type,
            "status": self.status,
            "created_by": self.creator.username if self.creator else None,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "approved_by": self.approver.username if self.approver else None,
            "approved_date": self.approved_date.isoformat() if self.approved_date else None
        }


class LoanAssessment(db.Model):
    """Assess member eligibility for loans based on saving parameters"""

    __tablename__ = "loan_assessments"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    
    # Assessment parameters
    assessment_date = db.Column(db.Date, default=func.current_date(), nullable=False)
    total_savings = db.Column(db.Numeric(12, 2), nullable=False)
    months_active = db.Column(db.Integer, nullable=False)
    attendance_rate = db.Column(db.Numeric(5, 2), nullable=False)  # Percentage
    payment_consistency = db.Column(db.Numeric(5, 2), nullable=False)  # Percentage
    outstanding_fines = db.Column(db.Numeric(10, 2), default=0.00, nullable=False)
    
    # Assessment results
    eligibility_score = db.Column(db.Numeric(5, 2), nullable=False)  # 0-100
    is_eligible = db.Column(db.Boolean, default=False, nullable=False)
    max_loan_amount = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    recommended_term_months = db.Column(db.Integer, nullable=True)
    
    # Risk assessment
    risk_level = db.Column(db.String(20), nullable=False)  # LOW, MEDIUM, HIGH
    risk_factors = db.Column(db.Text, nullable=True)  # JSON array of risk factors
    
    # Assessment notes and recommendations
    assessment_notes = db.Column(db.Text, nullable=True)
    recommendations = db.Column(db.Text, nullable=True)
    
    # Validity
    valid_until = db.Column(db.Date, nullable=False)  # Assessment expires after 3 months
    is_current = db.Column(db.Boolean, default=True, nullable=False)
    
    # Audit fields
    assessed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Relationships
    member = db.relationship('GroupMember', foreign_keys=[member_id])
    assessor = db.relationship('User', foreign_keys=[assessed_by])

    # Constraints
    __table_args__ = (
        db.CheckConstraint('eligibility_score >= 0 AND eligibility_score <= 100', name='check_valid_score'),
        db.CheckConstraint('attendance_rate >= 0 AND attendance_rate <= 100', name='check_valid_attendance'),
        db.CheckConstraint('payment_consistency >= 0 AND payment_consistency <= 100', name='check_valid_consistency'),
        db.CheckConstraint('max_loan_amount >= 0', name='check_positive_loan_amount'),
        db.CheckConstraint("risk_level IN ('LOW', 'MEDIUM', 'HIGH')", name='check_valid_risk_level'),
    )

    def __init__(self, member_id, total_savings, months_active, attendance_rate, payment_consistency, assessed_by, outstanding_fines=0.00):
        self.member_id = member_id
        self.total_savings = total_savings
        self.months_active = months_active
        self.attendance_rate = attendance_rate
        self.payment_consistency = payment_consistency
        self.outstanding_fines = outstanding_fines
        self.assessed_by = assessed_by
        
        # Set validity period (3 months from assessment)
        from datetime import date, timedelta
        self.valid_until = date.today() + timedelta(days=90)
        
        # Calculate assessment automatically
        self._calculate_assessment()

    def _calculate_assessment(self):
        """Calculate eligibility score and loan parameters"""
        # Scoring algorithm (industry standard approach)
        score = 0
        
        # Savings history (30 points max)
        if self.months_active >= 12:
            score += 30
        elif self.months_active >= 6:
            score += 20
        elif self.months_active >= 3:
            score += 10
        
        # Attendance rate (25 points max)
        score += (float(self.attendance_rate) / 100) * 25
        
        # Payment consistency (25 points max)
        score += (float(self.payment_consistency) / 100) * 25
        
        # Outstanding fines penalty (up to -10 points)
        if self.outstanding_fines > 0:
            fine_penalty = min(10, float(self.outstanding_fines) / 100)  # 1 point per 100 currency units
            score -= fine_penalty
        
        # Savings amount bonus (20 points max)
        if float(self.total_savings) >= 1000:
            score += 20
        elif float(self.total_savings) >= 500:
            score += 15
        elif float(self.total_savings) >= 200:
            score += 10
        elif float(self.total_savings) >= 100:
            score += 5
        
        self.eligibility_score = max(0, min(100, score))
        
        # Determine eligibility and loan parameters
        if self.eligibility_score >= 70:
            self.is_eligible = True
            self.risk_level = 'LOW'
            self.max_loan_amount = float(self.total_savings) * 3.0
            self.recommended_term_months = 12
        elif self.eligibility_score >= 50:
            self.is_eligible = True
            self.risk_level = 'MEDIUM'
            self.max_loan_amount = float(self.total_savings) * 2.0
            self.recommended_term_months = 6
        elif self.eligibility_score >= 30:
            self.is_eligible = True
            self.risk_level = 'HIGH'
            self.max_loan_amount = float(self.total_savings) * 1.0
            self.recommended_term_months = 3
        else:
            self.is_eligible = False
            self.risk_level = 'HIGH'
            self.max_loan_amount = 0
            self.recommended_term_months = None

    def is_valid(self):
        """Check if assessment is still valid"""
        from datetime import date
        return self.is_current and date.today() <= self.valid_until

    def to_json(self):
        return {
            "id": self.id,
            "member": self.member.name if self.member else None,
            "assessment_date": self.assessment_date.isoformat() if self.assessment_date else None,
            "total_savings": float(self.total_savings),
            "months_active": self.months_active,
            "attendance_rate": float(self.attendance_rate),
            "payment_consistency": float(self.payment_consistency),
            "outstanding_fines": float(self.outstanding_fines),
            "eligibility_score": float(self.eligibility_score),
            "is_eligible": self.is_eligible,
            "max_loan_amount": float(self.max_loan_amount),
            "recommended_term_months": self.recommended_term_months,
            "risk_level": self.risk_level,
            "risk_factors": self.risk_factors,
            "assessment_notes": self.assessment_notes,
            "recommendations": self.recommendations,
            "valid_until": self.valid_until.isoformat() if self.valid_until else None,
            "is_current": self.is_current,
            "is_valid": self.is_valid(),
            "assessed_by": self.assessor.username if self.assessor else None,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class LoanRepaymentSchedule(db.Model):
    """Track loan repayment schedule and progress"""

    __tablename__ = "loan_repayment_schedule"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('group_loans.id'), nullable=False)
    
    # Schedule details
    installment_number = db.Column(db.Integer, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    principal_amount = db.Column(db.Numeric(12, 2), nullable=False)
    interest_amount = db.Column(db.Numeric(12, 2), nullable=False)
    total_amount = db.Column(db.Numeric(12, 2), nullable=False)
    
    # Payment tracking
    amount_paid = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    payment_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(50), default='PENDING', nullable=False)  # PENDING, PAID, OVERDUE, PARTIAL
    
    # Late payment tracking
    days_overdue = db.Column(db.Integer, default=0, nullable=False)
    late_fee = db.Column(db.Numeric(10, 2), default=0.00, nullable=False)
    
    # Audit fields
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    loan = db.relationship('GroupLoan', foreign_keys=[loan_id])

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('loan_id', 'installment_number', name='unique_loan_installment'),
        db.CheckConstraint('principal_amount > 0', name='check_positive_principal'),
        db.CheckConstraint('interest_amount >= 0', name='check_non_negative_interest'),
        db.CheckConstraint('amount_paid >= 0', name='check_non_negative_payment'),
        db.CheckConstraint('days_overdue >= 0', name='check_non_negative_overdue'),
        db.CheckConstraint("status IN ('PENDING', 'PAID', 'OVERDUE', 'PARTIAL')", name='check_valid_repayment_status'),
    )

    def __init__(self, loan_id, installment_number, due_date, principal_amount, interest_amount):
        self.loan_id = loan_id
        self.installment_number = installment_number
        self.due_date = due_date
        self.principal_amount = principal_amount
        self.interest_amount = interest_amount
        self.total_amount = principal_amount + interest_amount

    def update_status(self):
        """Update payment status based on current state"""
        from datetime import date
        
        if self.amount_paid >= self.total_amount:
            self.status = 'PAID'
            self.days_overdue = 0
        elif self.amount_paid > 0:
            self.status = 'PARTIAL'
        elif date.today() > self.due_date:
            self.status = 'OVERDUE'
            self.days_overdue = (date.today() - self.due_date).days
        else:
            self.status = 'PENDING'
            self.days_overdue = 0

    def calculate_late_fee(self, daily_rate=0.01):
        """Calculate late fee based on days overdue"""
        if self.days_overdue > 0:
            self.late_fee = float(self.total_amount) * daily_rate * self.days_overdue / 100
        return self.late_fee

    def to_json(self):
        return {
            "id": self.id,
            "loan_id": self.loan_id,
            "installment_number": self.installment_number,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "principal_amount": float(self.principal_amount),
            "interest_amount": float(self.interest_amount),
            "total_amount": float(self.total_amount),
            "amount_paid": float(self.amount_paid),
            "payment_date": self.payment_date.isoformat() if self.payment_date else None,
            "status": self.status,
            "days_overdue": self.days_overdue,
            "late_fee": float(self.late_fee),
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class TargetSavingsCampaign(db.Model):
    """Admin-created target savings campaigns that can be applied to groups"""

    __tablename__ = "target_savings_campaigns"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    
    # Campaign parameters
    target_amount = db.Column(db.Numeric(12, 2), nullable=False)
    target_date = db.Column(db.Date, nullable=False)
    minimum_contribution = db.Column(db.Numeric(10, 2), nullable=True)
    maximum_contribution = db.Column(db.Numeric(10, 2), nullable=True)
    
    # Campaign settings
    is_mandatory = db.Column(db.Boolean, default=False, nullable=False)  # Admin can force participation
    requires_group_vote = db.Column(db.Boolean, default=True, nullable=False)  # Requires group decision
    minimum_participation_rate = db.Column(db.Numeric(5, 2), default=50.00, nullable=False)  # % of members needed
    
    # Campaign lifecycle
    status = db.Column(db.String(50), default='DRAFT', nullable=False)  # DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    
    # Campaign scope
    is_global = db.Column(db.Boolean, default=False, nullable=False)  # Available to all groups
    eligible_group_states = db.Column(db.String(255), nullable=True)  # Comma-separated states
    
    # Incentives and penalties
    completion_bonus_rate = db.Column(db.Numeric(5, 2), default=0.00, nullable=False)  # % bonus for completion
    early_completion_bonus = db.Column(db.Numeric(5, 2), default=0.00, nullable=False)  # Extra bonus for early completion
    penalty_for_non_participation = db.Column(db.Numeric(10, 2), default=0.00, nullable=False)  # Fine for not participating
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = db.relationship('User', foreign_keys=[created_by])
    group_campaigns = db.relationship('GroupTargetCampaign', back_populates='campaign', cascade='all, delete-orphan')

    # Constraints
    __table_args__ = (
        db.CheckConstraint('target_amount > 0', name='check_positive_campaign_target_amount'),
        db.CheckConstraint('minimum_participation_rate >= 0 AND minimum_participation_rate <= 100', name='check_valid_participation_rate'),
        db.CheckConstraint('completion_bonus_rate >= 0 AND completion_bonus_rate <= 100', name='check_valid_bonus_rate'),
        db.CheckConstraint("status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')", name='check_valid_campaign_status'),
    )

    def __init__(self, name, description, target_amount, target_date, created_by, is_mandatory=False, requires_group_vote=True):
        self.name = name
        self.description = description
        self.target_amount = target_amount
        self.target_date = target_date
        self.created_by = created_by
        self.is_mandatory = is_mandatory
        self.requires_group_vote = requires_group_vote

    def is_eligible_for_group(self, group):
        """Check if campaign is eligible for a specific group"""
        if not self.is_global and self.status != 'ACTIVE':
            return False
        
        if self.eligible_group_states:
            eligible_states = [state.strip() for state in self.eligible_group_states.split(',')]
            if group.state not in eligible_states:
                return False
        
        return True

    def calculate_progress_for_group(self, group_id):
        """Calculate campaign progress for a specific group"""
        group_campaign = GroupTargetCampaign.query.filter_by(
            campaign_id=self.id,
            group_id=group_id
        ).first()
        
        if not group_campaign:
            return 0
        
        total_saved = sum(float(ms.current_contribution) for ms in group_campaign.member_participations 
                         if ms.is_participating)
        
        return min(100, (total_saved / float(self.target_amount)) * 100)

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "target_amount": float(self.target_amount),
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "minimum_contribution": float(self.minimum_contribution) if self.minimum_contribution else None,
            "maximum_contribution": float(self.maximum_contribution) if self.maximum_contribution else None,
            "is_mandatory": self.is_mandatory,
            "requires_group_vote": self.requires_group_vote,
            "minimum_participation_rate": float(self.minimum_participation_rate),
            "status": self.status,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "is_global": self.is_global,
            "eligible_group_states": self.eligible_group_states,
            "completion_bonus_rate": float(self.completion_bonus_rate),
            "early_completion_bonus": float(self.early_completion_bonus),
            "penalty_for_non_participation": float(self.penalty_for_non_participation),
            "created_by": self.creator.username if self.creator else None,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class GroupTargetCampaign(db.Model):
    """Links target savings campaigns to specific groups with voting and participation tracking"""

    __tablename__ = "group_target_campaigns"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('target_savings_campaigns.id'), nullable=False)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    
    # Group decision process
    status = db.Column(db.String(50), default='PROPOSED', nullable=False)  # PROPOSED, VOTING, ACCEPTED, REJECTED, ACTIVE, COMPLETED
    proposed_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    voting_deadline = db.Column(db.DateTime, nullable=True)
    decision_date = db.Column(db.DateTime, nullable=True)
    
    # Voting results
    votes_for = db.Column(db.Integer, default=0, nullable=False)
    votes_against = db.Column(db.Integer, default=0, nullable=False)
    votes_abstain = db.Column(db.Integer, default=0, nullable=False)
    voting_participation_rate = db.Column(db.Numeric(5, 2), default=0.00, nullable=False)
    
    # Group-specific customizations
    group_target_amount = db.Column(db.Numeric(12, 2), nullable=True)  # Can override campaign default
    group_target_date = db.Column(db.Date, nullable=True)  # Can override campaign default
    group_minimum_contribution = db.Column(db.Numeric(10, 2), nullable=True)
    
    # Progress tracking
    total_saved = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    participating_members_count = db.Column(db.Integer, default=0, nullable=False)
    completion_percentage = db.Column(db.Numeric(5, 2), default=0.00, nullable=False)
    
    # Completion tracking
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    completion_date = db.Column(db.Date, nullable=True)
    bonus_awarded = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    
    # Audit fields
    assigned_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    campaign = db.relationship('TargetSavingsCampaign', back_populates='group_campaigns')
    group = db.relationship('SavingsGroup', foreign_keys=[group_id])
    assigner = db.relationship('User', foreign_keys=[assigned_by])
    member_participations = db.relationship('MemberCampaignParticipation', back_populates='group_campaign', cascade='all, delete-orphan')
    votes = db.relationship('CampaignVote', back_populates='group_campaign', cascade='all, delete-orphan')

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('campaign_id', 'group_id', name='unique_campaign_group'),
        db.CheckConstraint('total_saved >= 0', name='check_positive_total_saved'),
        db.CheckConstraint('completion_percentage >= 0 AND completion_percentage <= 100', name='check_valid_completion_percentage'),
        db.CheckConstraint("status IN ('PROPOSED', 'VOTING', 'ACCEPTED', 'REJECTED', 'ACTIVE', 'COMPLETED')", name='check_valid_group_campaign_status'),
    )

    def __init__(self, campaign_id, group_id, assigned_by):
        self.campaign_id = campaign_id
        self.group_id = group_id
        self.assigned_by = assigned_by

    def get_effective_target_amount(self):
        """Get the target amount (group-specific or campaign default)"""
        return self.group_target_amount or self.campaign.target_amount

    def get_effective_target_date(self):
        """Get the target date (group-specific or campaign default)"""
        return self.group_target_date or self.campaign.target_date

    def update_progress(self):
        """Update progress based on member participations"""
        participating_members = [mp for mp in self.member_participations if mp.is_participating]
        self.participating_members_count = len(participating_members)
        self.total_saved = sum(float(mp.current_contribution) for mp in participating_members)
        
        effective_target = float(self.get_effective_target_amount())
        self.completion_percentage = min(100, (self.total_saved / effective_target) * 100)
        
        # Check for completion
        if not self.is_completed and self.completion_percentage >= 100:
            self.is_completed = True
            self.completion_date = func.current_date()
            self.status = 'COMPLETED'

    def to_json(self):
        return {
            "id": self.id,
            "campaign": self.campaign.to_json() if self.campaign else None,
            "group_id": self.group_id,
            "status": self.status,
            "proposed_date": self.proposed_date.isoformat() if self.proposed_date else None,
            "voting_deadline": self.voting_deadline.isoformat() if self.voting_deadline else None,
            "decision_date": self.decision_date.isoformat() if self.decision_date else None,
            "votes_for": self.votes_for,
            "votes_against": self.votes_against,
            "votes_abstain": self.votes_abstain,
            "voting_participation_rate": float(self.voting_participation_rate),
            "group_target_amount": float(self.group_target_amount) if self.group_target_amount else None,
            "group_target_date": self.group_target_date.isoformat() if self.group_target_date else None,
            "group_minimum_contribution": float(self.group_minimum_contribution) if self.group_minimum_contribution else None,
            "total_saved": float(self.total_saved),
            "participating_members_count": self.participating_members_count,
            "completion_percentage": float(self.completion_percentage),
            "is_completed": self.is_completed,
            "completion_date": self.completion_date.isoformat() if self.completion_date else None,
            "bonus_awarded": float(self.bonus_awarded),
            "assigned_by": self.assigner.username if self.assigner else None,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class MemberCampaignParticipation(db.Model):
    """Track individual member participation in target savings campaigns"""

    __tablename__ = "member_campaign_participations"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_campaign_id = db.Column(db.Integer, db.ForeignKey('group_target_campaigns.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    
    # Participation status
    is_participating = db.Column(db.Boolean, default=False, nullable=False)
    participation_date = db.Column(db.DateTime, nullable=True)
    opt_out_date = db.Column(db.DateTime, nullable=True)
    opt_out_reason = db.Column(db.Text, nullable=True)
    
    # Individual targets (can be different from group target)
    personal_target_amount = db.Column(db.Numeric(12, 2), nullable=True)
    personal_target_date = db.Column(db.Date, nullable=True)
    
    # Progress tracking
    current_contribution = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    total_contributions = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    contribution_count = db.Column(db.Integer, default=0, nullable=False)
    
    # Achievement tracking
    target_achieved = db.Column(db.Boolean, default=False, nullable=False)
    achievement_date = db.Column(db.Date, nullable=True)
    bonus_earned = db.Column(db.Numeric(10, 2), default=0.00, nullable=False)
    
    # Audit fields
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    group_campaign = db.relationship('GroupTargetCampaign', back_populates='member_participations')
    member = db.relationship('GroupMember', foreign_keys=[member_id])

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('group_campaign_id', 'member_id', name='unique_member_campaign_participation'),
        db.CheckConstraint('current_contribution >= 0', name='check_positive_current_contribution'),
        db.CheckConstraint('total_contributions >= 0', name='check_positive_total_contributions'),
    )

    def __init__(self, group_campaign_id, member_id, is_participating=False):
        self.group_campaign_id = group_campaign_id
        self.member_id = member_id
        self.is_participating = is_participating
        if is_participating:
            self.participation_date = func.now()

    def get_effective_target_amount(self):
        """Get effective target amount (personal or group campaign default)"""
        return self.personal_target_amount or self.group_campaign.get_effective_target_amount()

    def calculate_progress_percentage(self):
        """Calculate progress towards target"""
        target = float(self.get_effective_target_amount())
        if target == 0:
            return 0
        return min(100, (float(self.current_contribution) / target) * 100)

    def record_contribution(self, amount):
        """Record a contribution towards the campaign"""
        from decimal import Decimal
        amount_decimal = Decimal(str(amount))
        
        self.current_contribution += amount_decimal
        self.total_contributions += amount_decimal
        self.contribution_count += 1
        
        # Check for target achievement
        if not self.target_achieved and self.current_contribution >= self.get_effective_target_amount():
            self.target_achieved = True
            self.achievement_date = func.current_date()

    def to_json(self):
        return {
            "id": self.id,
            "group_campaign_id": self.group_campaign_id,
            "member": self.member.name if self.member else None,
            "is_participating": self.is_participating,
            "participation_date": self.participation_date.isoformat() if self.participation_date else None,
            "opt_out_date": self.opt_out_date.isoformat() if self.opt_out_date else None,
            "opt_out_reason": self.opt_out_reason,
            "personal_target_amount": float(self.personal_target_amount) if self.personal_target_amount else None,
            "personal_target_date": self.personal_target_date.isoformat() if self.personal_target_date else None,
            "current_contribution": float(self.current_contribution),
            "total_contributions": float(self.total_contributions),
            "contribution_count": self.contribution_count,
            "progress_percentage": self.calculate_progress_percentage(),
            "target_achieved": self.target_achieved,
            "achievement_date": self.achievement_date.isoformat() if self.achievement_date else None,
            "bonus_earned": float(self.bonus_earned),
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class CampaignVote(db.Model):
    """Track member votes on target savings campaigns"""

    __tablename__ = "campaign_votes"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_campaign_id = db.Column(db.Integer, db.ForeignKey('group_target_campaigns.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    
    # Vote details
    vote = db.Column(db.String(20), nullable=False)  # FOR, AGAINST, ABSTAIN
    vote_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    vote_reason = db.Column(db.Text, nullable=True)
    
    # Vote metadata
    is_officer_vote = db.Column(db.Boolean, default=False, nullable=False)
    vote_weight = db.Column(db.Numeric(3, 2), default=1.00, nullable=False)  # Officers might have higher weight

    # Relationships
    group_campaign = db.relationship('GroupTargetCampaign', back_populates='votes')
    member = db.relationship('GroupMember', foreign_keys=[member_id])

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('group_campaign_id', 'member_id', name='unique_campaign_vote'),
        db.CheckConstraint("vote IN ('FOR', 'AGAINST', 'ABSTAIN')", name='check_valid_vote'),
        db.CheckConstraint('vote_weight > 0', name='check_positive_vote_weight'),
    )

    def __init__(self, group_campaign_id, member_id, vote, vote_reason=None):
        self.group_campaign_id = group_campaign_id
        self.member_id = member_id
        self.vote = vote
        self.vote_reason = vote_reason

    def to_json(self):
        return {
            "id": self.id,
            "group_campaign_id": self.group_campaign_id,
            "member": self.member.name if self.member else None,
            "vote": self.vote,
            "vote_date": self.vote_date.isoformat() if self.vote_date else None,
            "vote_reason": self.vote_reason,
            "is_officer_vote": self.is_officer_vote,
            "vote_weight": float(self.vote_weight)
        }


class CalendarEvent(db.Model):
    """Calendar events for filtering and visualization of savings group activities"""
    
    __tablename__ = 'calendar_events'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    event_type = db.Column(db.String(50), nullable=False)  # TRANSACTION, MEETING, LOAN, CAMPAIGN, FINE
    event_date = db.Column(db.Date, nullable=False)
    event_time = db.Column(db.Time)
    
    # Relationships
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Financial details for filtering
    amount = db.Column(db.Numeric(15, 2))
    fund_type = db.Column(db.String(20))  # PERSONAL, ECD, SOCIAL, TARGET
    verification_status = db.Column(db.String(20))  # PENDING, VERIFIED, REJECTED
    
    # Member details for demographic filtering
    member_gender = db.Column(db.String(10))  # F, M, OTHER
    member_role = db.Column(db.String(20))  # CHAIR, TREASURER, SECRETARY, MEMBER
    
    # Additional metadata
    mobile_money_provider = db.Column(db.String(50))
    reference_id = db.Column(db.String(100))  # Reference to original transaction/loan/etc
    reference_type = db.Column(db.String(50))  # transaction, loan, meeting, etc
    
    # Timestamps
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    group = db.relationship('SavingsGroup', backref='calendar_events')
    user = db.relationship('User', backref='calendar_events')
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint('amount >= 0', name='check_non_negative_amount'),
        db.Index('idx_calendar_event_date', 'event_date'),
        db.Index('idx_calendar_group_date', 'group_id', 'event_date'),
        db.Index('idx_calendar_type_date', 'event_type', 'event_date'),
        db.Index('idx_calendar_fund_type', 'fund_type'),
        db.Index('idx_calendar_gender', 'member_gender'),
        db.Index('idx_calendar_role', 'member_role'),
    )
    
    def __init__(self, title, event_type, event_date, group_id, **kwargs):
        self.title = title
        self.event_type = event_type
        self.event_date = event_date
        self.group_id = group_id
        
        # Set optional fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_json(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "event_type": self.event_type,
            "event_date": self.event_date.isoformat() if self.event_date else None,
            "event_time": self.event_time.isoformat() if self.event_time else None,
            "group_id": self.group_id,
            "group_name": self.group.name if self.group else None,
            "user_id": self.user_id,
            "amount": float(self.amount) if self.amount else None,
            "fund_type": self.fund_type,
            "verification_status": self.verification_status,
            "member_gender": self.member_gender,
            "member_role": self.member_role,
            "mobile_money_provider": self.mobile_money_provider,
            "reference_id": self.reference_id,
            "reference_type": self.reference_type,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "group_district": self.group.district if self.group else None,
            "group_parish": self.group.parish if self.group else None,
            "group_village": self.group.village if self.group else None,
            "group_region": self.group.region if self.group else None,
        }