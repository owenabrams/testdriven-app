#!/usr/bin/env python3
"""
🌍 PROFESSIONAL ENVIRONMENT MANAGEMENT SYSTEM
Handles configuration differences between local development and production
"""

import os
from dataclasses import dataclass
from typing import Dict, Any

@dataclass
class EnvironmentConfig:
    """Environment-specific configuration"""
    name: str
    debug: bool
    port: int
    host: str
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    secret_key: str
    cors_origins: str
    log_level: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for easy access"""
        return {
            'name': self.name,
            'debug': self.debug,
            'port': self.port,
            'host': self.host,
            'db_host': self.db_host,
            'db_port': self.db_port,
            'db_name': self.db_name,
            'db_user': self.db_user,
            'db_password': self.db_password,
            'secret_key': self.secret_key,
            'cors_origins': self.cors_origins,
            'log_level': self.log_level
        }

class EnvironmentManager:
    """Manages environment-specific configurations"""
    
    ENVIRONMENTS = {
        'local': EnvironmentConfig(
            name='local',
            debug=True,
            port=5001,
            host='localhost',
            db_host='localhost',
            db_port=5432,
            db_name='testdriven_dev',
            db_user=os.getenv('USER', 'postgres'),
            db_password='',
            secret_key='dev-secret-key-change-in-production',
            cors_origins='*',
            log_level='DEBUG'
        ),
        'production': EnvironmentConfig(
            name='production',
            debug=False,
            port=5000,
            host='0.0.0.0',
            db_host=os.getenv('DB_HOST', 'localhost'),
            db_port=int(os.getenv('DB_PORT', '5432')),
            db_name=os.getenv('DB_NAME', 'testdriven_prod'),
            db_user=os.getenv('DB_USER', 'postgres'),
            db_password=os.getenv('DB_PASSWORD', ''),
            secret_key=os.getenv('SECRET_KEY', 'change-this-in-production'),
            cors_origins=os.getenv('CORS_ORIGINS', '*'),
            log_level='INFO'
        ),
        'staging': EnvironmentConfig(
            name='staging',
            debug=False,
            port=5000,
            host='0.0.0.0',
            db_host=os.getenv('DB_HOST', 'localhost'),
            db_port=int(os.getenv('DB_PORT', '5432')),
            db_name=os.getenv('DB_NAME', 'testdriven_staging'),
            db_user=os.getenv('DB_USER', 'postgres'),
            db_password=os.getenv('DB_PASSWORD', ''),
            secret_key=os.getenv('SECRET_KEY', 'staging-secret-key'),
            cors_origins=os.getenv('CORS_ORIGINS', '*'),
            log_level='DEBUG'
        )
    }
    
    @classmethod
    def get_config(cls, environment: str = None) -> EnvironmentConfig:
        """Get configuration for specified environment"""
        if environment is None:
            environment = os.getenv('FLASK_ENV', 'local')
        
        if environment not in cls.ENVIRONMENTS:
            print(f"⚠️  Unknown environment '{environment}', defaulting to 'local'")
            environment = 'local'
        
        config = cls.ENVIRONMENTS[environment]
        print(f"🌍 Loading {config.name.upper()} environment configuration")
        print(f"   • Port: {config.port}")
        print(f"   • Debug: {config.debug}")
        print(f"   • Database: {config.db_host}:{config.db_port}/{config.db_name}")
        
        return config
    
    @classmethod
    def get_credentials(cls, environment: str = None) -> Dict[str, str]:
        """Get login credentials for specified environment"""
        if environment is None:
            environment = os.getenv('FLASK_ENV', 'local')
        
        credentials = {
            'local': {
                'email': 'admin@savingsgroup.com',
                'password': 'admin123',
                'alt_email': 'superadmin@testdriven.io',
                'alt_password': 'superpassword123'
            },
            'production': {
                'email': 'admin@savingsgroup.com',
                'password': 'admin123'
            },
            'staging': {
                'email': 'admin@savingsgroup.com',
                'password': 'admin123'
            }
        }
        
        return credentials.get(environment, credentials['local'])

def load_environment_config(environment: str = None) -> EnvironmentConfig:
    """Convenience function to load environment configuration"""
    return EnvironmentManager.get_config(environment)

def get_environment_credentials(environment: str = None) -> Dict[str, str]:
    """Convenience function to get environment credentials"""
    return EnvironmentManager.get_credentials(environment)
