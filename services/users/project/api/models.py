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
