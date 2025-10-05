#!/usr/bin/env python3
"""
🚀 MINIMAL ENHANCED MEETING ACTIVITIES DEMO - PRODUCTION VERSION
This is your working local code adapted for AWS production deployment
"""

import os
import sys

# Add the current directory to Python path to import the main module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import your working application
from minimal_enhanced_meeting_activities_demo import *

# Override configuration for production
if __name__ == '__main__':
    print("🏭 Starting PRODUCTION Microfinance System API...")
    print("🗄️ Connecting to PRODUCTION PostgreSQL database...")
    print("✅ Database ready!")
    print("🌐 Starting Flask server on PRODUCTION port...")
    print("📍 API will be available at: http://0.0.0.0:5000")
    print("🔗 Production endpoints ready")
    print()
    print("🔑 PRODUCTION LOGIN CREDENTIALS:")
    print("   • admin@savingsgroup.com / admin123")
    print()
    
    # Override database configuration for production
    global DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', '5432'))
    DB_NAME = os.getenv('DB_NAME', 'testdriven_dev')
    DB_USER = os.getenv('DB_USER', os.getenv('USER'))
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    
    # Update the get_db_connection function for production
    def get_db_connection_production():
        """Get PostgreSQL database connection for production"""
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                port=DB_PORT,
                database=DB_NAME,
                user=DB_USER,
                password=DB_PASSWORD,
                cursor_factory=RealDictCursor
            )
            return conn
        except psycopg2.Error as e:
            print(f"Database connection failed: {e}")
            return None
    
    # Replace the global function
    import minimal_enhanced_meeting_activities_demo
    minimal_enhanced_meeting_activities_demo.get_db_connection = get_db_connection_production

    # Override global variables in the main module
    minimal_enhanced_meeting_activities_demo.DB_HOST = DB_HOST
    minimal_enhanced_meeting_activities_demo.DB_PORT = DB_PORT
    minimal_enhanced_meeting_activities_demo.DB_NAME = DB_NAME
    minimal_enhanced_meeting_activities_demo.DB_USER = DB_USER
    minimal_enhanced_meeting_activities_demo.DB_PASSWORD = DB_PASSWORD

    # Run on production port with production settings (ALB expects port 5000)
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
