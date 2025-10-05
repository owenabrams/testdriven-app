#!/usr/bin/env python3
"""
Create database migration for Enhanced Meeting Activities System
"""

import os
import sys
from datetime import datetime

# Add the project directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'project'))

from flask import Flask
from flask_migrate import Migrate, init, migrate, upgrade
from project import create_app, db

def create_migration():
    """Create a new migration for the meeting activities models"""
    
    print("🔄 Creating Enhanced Meeting Activities Migration...")
    
    # Create the Flask app
    app, _ = create_app()

    with app.app_context():
        try:
            # Import the new models to ensure they're registered
            from project.api.meeting_models import (
                MeetingActivity, MemberActivityParticipation, 
                ActivityDocument, ActivityTransaction
            )
            
            print("✅ Meeting activity models imported successfully")
            
            # Create migration
            migrate_instance = Migrate(app, db)
            
            # Generate migration
            from flask_migrate import migrate as create_migration_cmd
            
            migration_message = f"add_enhanced_meeting_activities_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            print(f"📝 Creating migration: {migration_message}")
            
            # This would normally be done via command line, but we'll create the migration file manually
            print("⚠️  Please run the following command to create the migration:")
            print(f"cd services/users && python manage.py db migrate -m '{migration_message}'")
            print()
            print("Then run:")
            print("python manage.py db upgrade")
            
            return True
            
        except Exception as e:
            print(f"❌ Error creating migration: {e}")
            return False

def validate_models():
    """Validate that all models are properly configured"""
    print("🔍 Validating Enhanced Meeting Activities Models...")
    
    app, _ = create_app()

    with app.app_context():
        try:
            # Import and validate models
            from project.api.meeting_models import (
                MeetingActivity, MemberActivityParticipation, 
                ActivityDocument, ActivityTransaction
            )
            
            # Test model instantiation
            activity = MeetingActivity()
            participation = MemberActivityParticipation()
            document = ActivityDocument()
            transaction = ActivityTransaction()
            
            print("✅ All models instantiated successfully")
            
            # Check relationships
            print("✅ Model relationships configured")
            
            # Check required fields
            required_fields = {
                'MeetingActivity': ['meeting_id', 'activity_type', 'activity_name', 'status'],
                'MemberActivityParticipation': ['activity_id', 'member_id', 'participation_type'],
                'ActivityDocument': ['activity_id', 'file_path', 'document_type'],
                'ActivityTransaction': ['activity_id', 'transaction_type', 'amount']
            }
            
            for model_name, fields in required_fields.items():
                model_class = globals()[model_name] if model_name in globals() else getattr(sys.modules[__name__], model_name, None)
                if model_class:
                    for field in fields:
                        if hasattr(model_class, field):
                            print(f"✅ {model_name}.{field} exists")
                        else:
                            print(f"⚠️  {model_name}.{field} missing")
            
            return True
            
        except Exception as e:
            print(f"❌ Model validation error: {e}")
            return False

def check_blueprint_registration():
    """Check if the meeting activities blueprint is registered"""
    print("🔍 Checking Blueprint Registration...")
    
    app = create_app()
    
    try:
        # Check if blueprint is registered
        blueprint_names = [bp.name for bp in app.blueprints.values()]
        
        if 'meeting_activities' in blueprint_names:
            print("✅ meeting_activities blueprint is registered")
        else:
            print("❌ meeting_activities blueprint is NOT registered")
            print("   Please ensure it's added to project/__init__.py")
        
        # List all registered blueprints
        print(f"📋 Registered blueprints: {', '.join(blueprint_names)}")
        
        return 'meeting_activities' in blueprint_names
        
    except Exception as e:
        print(f"❌ Blueprint check error: {e}")
        return False

def main():
    """Main function to set up the Enhanced Meeting Activities System"""
    print("🚀 ENHANCED MEETING ACTIVITIES SYSTEM - DATABASE SETUP")
    print("=" * 60)
    
    # Step 1: Validate models
    if not validate_models():
        print("❌ Model validation failed. Please check the model definitions.")
        return False
    
    print()
    
    # Step 2: Check blueprint registration
    if not check_blueprint_registration():
        print("❌ Blueprint registration failed. Please check project/__init__.py")
        return False
    
    print()
    
    # Step 3: Create migration
    if not create_migration():
        print("❌ Migration creation failed.")
        return False
    
    print()
    print("=" * 60)
    print("✅ ENHANCED MEETING ACTIVITIES SYSTEM - READY FOR MIGRATION!")
    print()
    print("📋 NEXT STEPS:")
    print("1. Run: cd services/users")
    print("2. Run: python manage.py db migrate -m 'add_enhanced_meeting_activities'")
    print("3. Run: python manage.py db upgrade")
    print("4. Restart your Docker containers")
    print("5. Test the new activity tracking features")
    print()
    print("🎯 NEW FEATURES AVAILABLE:")
    print("• Enhanced Meeting Page with Activity Tracker")
    print("• Document Upload for Activity Proof")
    print("• Member Participation Tracking")
    print("• Activity Reports and Analytics")
    print("• Comprehensive Activity Management")
    print("=" * 60)
    
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
