#!/usr/bin/env python3
"""
🌍 SMART ENVIRONMENT LOADER
Automatically loads the correct environment configuration
"""

import os
from pathlib import Path

def load_environment():
    """Load environment variables from the appropriate .env file"""
    
    # Determine environment
    env = os.getenv('FLASK_ENV', 'development')
    
    # Try to load python-dotenv if available
    try:
        from dotenv import load_dotenv
        
        if env == 'production':
            # Try production file first, fall back to template
            if Path('.env.production').exists():
                load_dotenv('.env.production')
                print("🏭 Loaded production environment from .env.production")
            else:
                print("⚠️  .env.production not found, using environment variables")
        else:
            # Load local development environment
            if Path('.env.local').exists():
                load_dotenv('.env.local')
                print("🏠 Loaded local development environment from .env.local")
            else:
                print("⚠️  .env.local not found, using defaults")
                
    except ImportError:
        print("💡 python-dotenv not installed, using environment variables only")
    
    # Set defaults if not provided
    if not os.getenv('PORT'):
        os.environ['PORT'] = '5001' if env == 'development' else '5000'
    
    if not os.getenv('DEBUG'):
        os.environ['DEBUG'] = 'true' if env == 'development' else 'false'
    
    return {
        'environment': env,
        'port': int(os.getenv('PORT', '5001')),
        'debug': os.getenv('DEBUG', 'true').lower() == 'true',
        'db_host': os.getenv('DB_HOST', 'localhost'),
        'db_port': int(os.getenv('DB_PORT', '5432')),
        'db_name': os.getenv('DB_NAME', 'testdriven_dev'),
        'db_user': os.getenv('DB_USER', os.getenv('USER', 'postgres')),
        'db_password': os.getenv('DB_PASSWORD', ''),
        'secret_key': os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    }

if __name__ == '__main__':
    config = load_environment()
    print("\n🌍 Environment Configuration:")
    for key, value in config.items():
        if 'password' in key.lower() or 'secret' in key.lower():
            print(f"   {key}: {'*' * len(str(value))}")
        else:
            print(f"   {key}: {value}")
