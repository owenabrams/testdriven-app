# services/users/project/aurora_config.py
"""
Professional Aurora PostgreSQL Configuration Manager
Handles environment-specific database connections with proper security and monitoring
"""

import os
import yaml
import logging
from urllib.parse import quote_plus
from pathlib import Path

logger = logging.getLogger(__name__)

class AuroraConfig:
    """Professional Aurora PostgreSQL configuration manager"""
    
    def __init__(self, environment=None):
        self.environment = environment or os.getenv('FLASK_ENV', 'development')
        self.config_path = Path(__file__).parent.parent.parent.parent / 'config' / 'aurora-config.yml'
        self.config = self._load_config()
        
    def _load_config(self):
        """Load configuration from YAML file"""
        try:
            with open(self.config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.warning(f"Aurora config file not found at {self.config_path}, using defaults")
            return self._get_default_config()
        except Exception as e:
            logger.error(f"Error loading Aurora config: {e}")
            return self._get_default_config()
    
    def _get_default_config(self):
        """Fallback configuration if YAML file is not available"""
        return {
            'environments': {
                'development': {
                    'database': {
                        'type': 'local_postgres',
                        'host': 'localhost',
                        'port': 5432,
                        'name': 'testdriven_dev',
                        'username': 'postgres',
                        'password': 'postgres',
                        'ssl_mode': 'disable'
                    }
                }
            }
        }
    
    def get_database_uri(self):
        """Get the complete database URI for the current environment"""
        env_config = self.config['environments'].get(self.environment, {})
        db_config = env_config.get('database', {})
        
        # Check for environment variable override first
        if os.getenv('DATABASE_URL'):
            return os.getenv('DATABASE_URL')
        
        # Build URI from configuration
        if db_config.get('type') == 'aurora_postgresql':
            return self._build_aurora_uri(db_config)
        elif db_config.get('type') == 'sqlite':
            return self._build_sqlite_uri(db_config)
        else:
            return self._build_standard_uri(db_config)
    
    def _build_aurora_uri(self, db_config):
        """Build Aurora PostgreSQL connection URI"""
        password = os.getenv('AURORA_DB_PASSWORD', 'your-secure-password')
        username = db_config.get('username', 'webapp')
        host = db_config.get('cluster_endpoint')
        port = db_config.get('port', 5432)
        database = db_config.get('name')
        ssl_mode = db_config.get('ssl_mode', 'require')
        
        # URL encode password to handle special characters
        encoded_password = quote_plus(password)
        
        uri = f"postgresql://{username}:{encoded_password}@{host}:{port}/{database}"
        
        # Add SSL parameters for Aurora
        if ssl_mode != 'disable':
            uri += f"?sslmode={ssl_mode}"
            
        return uri

    def _build_sqlite_uri(self, db_config):
        """Build SQLite URI"""
        import os
        path = db_config.get('path', 'instance/dev.db')

        # Convert to absolute path if relative
        if not os.path.isabs(path):
            # Get the absolute path relative to the services/users directory
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            path = os.path.join(base_dir, path)

        # Ensure directory exists
        db_dir = os.path.dirname(path)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)

        return f"sqlite:///{path}"

    def _build_standard_uri(self, db_config):
        """Build standard PostgreSQL connection URI"""
        username = db_config.get('username', 'postgres')
        password = db_config.get('password', 'postgres')
        host = db_config.get('host', 'localhost')
        port = db_config.get('port', 5432)
        database = db_config.get('name', 'testdriven_dev')
        
        return f"postgresql://{username}:{password}@{host}:{port}/{database}"
    
    def get_reader_uri(self):
        """Get Aurora reader endpoint URI for read-only operations"""
        env_config = self.config['environments'].get(self.environment, {})
        db_config = env_config.get('database', {})
        
        if db_config.get('type') != 'aurora_postgresql':
            return self.get_database_uri()  # Fallback to main URI
        
        reader_endpoint = db_config.get('reader_endpoint')
        if not reader_endpoint:
            return self.get_database_uri()  # Fallback to main URI
        
        password = os.getenv('AURORA_DB_PASSWORD', 'your-secure-password')
        username = db_config.get('username', 'webapp')
        port = db_config.get('port', 5432)
        database = db_config.get('name')
        ssl_mode = db_config.get('ssl_mode', 'require')
        
        encoded_password = quote_plus(password)
        uri = f"postgresql://{username}:{encoded_password}@{reader_endpoint}:{port}/{database}"
        
        if ssl_mode != 'disable':
            uri += f"?sslmode={ssl_mode}"
            
        return uri
    
    def get_connection_params(self):
        """Get connection parameters for SQLAlchemy engine configuration"""
        env_config = self.config['environments'].get(self.environment, {})
        db_config = env_config.get('database', {})
        
        params = {
            'pool_pre_ping': True,  # Validate connections before use
            'pool_recycle': 3600,   # Recycle connections every hour
        }
        
        if db_config.get('type') == 'aurora_postgresql':
            params.update({
                'pool_size': db_config.get('pool_size', 10),
                'max_overflow': db_config.get('max_overflow', 20),
                'connect_args': {
                    'connect_timeout': db_config.get('connection_timeout', 30),
                    'sslmode': db_config.get('ssl_mode', 'require')
                }
            })
        elif db_config.get('type') == 'sqlite':
            # SQLite-specific parameters
            params.update({
                'connect_args': {
                    'check_same_thread': False
                }
            })
            # Remove pooling parameters that don't apply to SQLite
            params.pop('pool_recycle', None)

        return params
    
    def is_aurora_environment(self):
        """Check if current environment uses Aurora"""
        env_config = self.config['environments'].get(self.environment, {})
        db_config = env_config.get('database', {})
        return db_config.get('type') == 'aurora_postgresql'
    
    def get_migration_config(self):
        """Get migration-specific configuration"""
        return self.config.get('migrations', {
            'timeout': 300,
            'retry_attempts': 3,
            'backup_before_migration': True,
            'validate_after_migration': True
        })

# Global instance
aurora_config = AuroraConfig()
