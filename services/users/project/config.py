# services/users/project/config.py

import os
from .aurora_config import aurora_config


class BaseConfig:
    """Base configuration with Aurora PostgreSQL support"""

    DEBUG = False
    TESTING = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.environ.get('SECRET_KEY')
    BCRYPT_LOG_ROUNDS = 13
    TOKEN_EXPIRATION_DAYS = 30
    TOKEN_EXPIRATION_SECONDS = 0

    # Aurora-specific SQLAlchemy configuration
    SQLALCHEMY_ENGINE_OPTIONS = aurora_config.get_connection_params()


class DevelopmentConfig(BaseConfig):
    """Development configuration"""

    SQLALCHEMY_DATABASE_URI = aurora_config.get_database_uri()
    DEBUG = False  # Disabled to prevent CSP conflicts with React PWA
    BCRYPT_LOG_ROUNDS = 4


class TestingConfig(BaseConfig):
    """Testing configuration"""

    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_TEST_URL", "sqlite:///test.db")
    BCRYPT_LOG_ROUNDS = 4
    TOKEN_EXPIRATION_DAYS = 0
    TOKEN_EXPIRATION_SECONDS = 3
    PRESERVE_CONTEXT_ON_EXCEPTION = False

    # Override Aurora config for testing
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 3600
    }


class ProductionConfig(BaseConfig):
    """Production configuration with Aurora PostgreSQL"""

    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = aurora_config.get_database_uri()
    BCRYPT_LOG_ROUNDS = 13
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")

    # Production-optimized Aurora settings
    SQLALCHEMY_ENGINE_OPTIONS = aurora_config.get_connection_params()


class StagingConfig(BaseConfig):
    """Staging configuration with Aurora PostgreSQL"""

    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = aurora_config.get_database_uri()
    BCRYPT_LOG_ROUNDS = 8  # Balanced between security and performance
    SECRET_KEY = os.environ.get("SECRET_KEY", "staging-secret-key")

    # Staging-optimized Aurora settings
    SQLALCHEMY_ENGINE_OPTIONS = aurora_config.get_connection_params()
