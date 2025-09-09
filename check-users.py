#!/usr/bin/env python3
"""
Check what users are in the database
"""

import os
import sys
sys.path.append('services/users')

from project import create_app, db
from project.api.models import User

# Set environment
os.environ.setdefault('APP_SETTINGS', 'project.config.DevelopmentConfig')
os.environ.setdefault('DATABASE_URL', 'sqlite:///app.db')
os.environ.setdefault('SECRET_KEY', 'dev-secret-key')

# Create application context
app, _ = create_app()
with app.app_context():
    print("👥 Users in Database:")
    print("====================")
    
    users = User.query.all()
    
    if not users:
        print("❌ No users found in database")
    else:
        for user in users:
            role = "Super Admin" if user.is_super_admin else ("Admin" if user.admin else "User")
            print(f"✅ {user.username} ({user.email}) - {role}")
    
    print(f"\nTotal users: {len(users)}")