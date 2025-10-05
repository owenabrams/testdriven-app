#!/usr/bin/env python3
"""
🚀 SMART APPLICATION STARTER
Automatically detects environment and starts the appropriate version
"""

import os
import sys
import subprocess
from pathlib import Path

def detect_environment():
    """Detect which environment we're running in"""
    
    # Check for explicit environment variable
    env = os.getenv('FLASK_ENV')
    if env:
        return env
    
    # Check for Docker environment
    if os.path.exists('/.dockerenv'):
        return 'production'
    
    # Check for AWS environment variables
    if os.getenv('AWS_REGION') or os.getenv('ECS_CONTAINER_METADATA_URI'):
        return 'production'
    
    # Check for production database
    if os.getenv('DB_HOST') and os.getenv('DB_PASSWORD'):
        return 'production'
    
    # Default to local development
    return 'local'

def start_local_development():
    """Start local development server"""
    print("🏠 Starting LOCAL DEVELOPMENT environment...")
    print("📍 Server will run on: http://localhost:5001")
    print("🔑 Login with: admin@savingsgroup.com / admin123")
    print("🔑 Or with: superadmin@testdriven.io / superpassword123")
    print()
    
    # Set environment variables for local development
    os.environ['FLASK_ENV'] = 'local'
    os.environ['FLASK_DEBUG'] = '1'
    
    # Import and run the local version
    try:
        from minimal_enhanced_meeting_activities_demo_local import app, socketio
        socketio.run(app, host='localhost', port=5001, debug=True)
    except ImportError:
        print("❌ Local development file not found!")
        print("   Run the original: python minimal_enhanced_meeting_activities_demo.py")
        sys.exit(1)

def start_production():
    """Start production server"""
    print("🏭 Starting PRODUCTION environment...")
    print("📍 Server will run on: http://0.0.0.0:5000")
    print("🔑 Login with: admin@savingsgroup.com / admin123")
    print()
    
    # Set environment variables for production
    os.environ['FLASK_ENV'] = 'production'
    os.environ['FLASK_DEBUG'] = '0'
    
    # Import and run the production version
    try:
        from minimal_enhanced_meeting_activities_demo import app, socketio
        socketio.run(app, host='0.0.0.0', port=5000, debug=False)
    except ImportError:
        print("❌ Production file not found!")
        sys.exit(1)

def show_environment_info():
    """Show current environment information"""
    env = detect_environment()
    
    print("=" * 60)
    print("🌍 ENVIRONMENT DETECTION RESULTS")
    print("=" * 60)
    print(f"Detected Environment: {env.upper()}")
    print()
    
    if env == 'local':
        print("📋 LOCAL DEVELOPMENT CONFIGURATION:")
        print("   • Port: 5001")
        print("   • Debug: Enabled")
        print("   • Database: localhost:5432/testdriven_dev")
        print("   • CORS: Permissive")
        print("   • Credentials: Both admin sets work")
        print()
        print("🔧 TO FORCE PRODUCTION MODE:")
        print("   export FLASK_ENV=production")
        print("   python start_app.py")
        
    elif env == 'production':
        print("📋 PRODUCTION CONFIGURATION:")
        print("   • Port: 5000")
        print("   • Debug: Disabled")
        print("   • Database: From environment variables")
        print("   • CORS: Configured")
        print("   • Credentials: admin@savingsgroup.com only")
        print()
        print("🔧 TO FORCE LOCAL MODE:")
        print("   export FLASK_ENV=local")
        print("   python start_app.py")
    
    print("=" * 60)

def main():
    """Main application starter"""
    
    # Check for help flag
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help', 'help']:
        print("🚀 Smart Application Starter")
        print()
        print("Usage:")
        print("  python start_app.py           # Auto-detect environment")
        print("  python start_app.py --info    # Show environment info")
        print("  python start_app.py local     # Force local development")
        print("  python start_app.py production # Force production")
        print()
        print("Environment Variables:")
        print("  FLASK_ENV=local|production    # Override environment detection")
        return
    
    # Check for info flag
    if len(sys.argv) > 1 and sys.argv[1] in ['--info', 'info']:
        show_environment_info()
        return
    
    # Check for explicit environment argument
    if len(sys.argv) > 1:
        env = sys.argv[1].lower()
        if env in ['local', 'production']:
            os.environ['FLASK_ENV'] = env
        else:
            print(f"❌ Unknown environment: {env}")
            print("   Valid options: local, production")
            sys.exit(1)
    
    # Detect environment
    env = detect_environment()
    
    # Start appropriate server
    if env == 'local':
        start_local_development()
    elif env == 'production':
        start_production()
    else:
        print(f"❌ Unsupported environment: {env}")
        sys.exit(1)

if __name__ == '__main__':
    main()
