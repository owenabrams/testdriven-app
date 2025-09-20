#!/usr/bin/env python3
"""
Database Schema Validation and Repair Script
Ensures database schema is consistent with models and fixes common issues
"""

import os
import sys
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

# Add the project directory to the path
sys.path.insert(0, '/usr/src/app')

from project import create_app, db
from project.api.models import *  # Import all models


def check_database_connection():
    """Check if database connection is working"""
    print("🔍 Checking database connection...")
    try:
        db.session.execute(text('SELECT 1'))
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def check_tables_exist():
    """Check if all required tables exist"""
    print("📋 Checking database tables...")
    
    inspector = inspect(db.engine)
    existing_tables = inspector.get_table_names()
    
    # Expected tables based on our models
    expected_tables = [
        'users', 'savings_groups', 'group_members', 'saving_types',
        'member_savings', 'group_transactions', 'group_cashbook',
        'meeting_attendance', 'member_fines', 'loan_assessments',
        'group_loans', 'loan_repayment_schedule', 'target_savings_campaigns',
        'group_target_campaigns', 'member_campaign_participation',
        'calendar_events', 'notifications'
    ]
    
    missing_tables = []
    for table in expected_tables:
        if table not in existing_tables:
            missing_tables.append(table)
    
    if missing_tables:
        print(f"⚠️  Missing tables: {', '.join(missing_tables)}")
        return False
    else:
        print(f"✅ All {len(expected_tables)} required tables exist")
        return True


def create_missing_tables():
    """Create missing tables using SQLAlchemy"""
    print("🔧 Creating missing database tables...")
    try:
        db.create_all()
        print("✅ Database tables created successfully")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False


def check_critical_columns():
    """Check for critical columns that might be missing"""
    print("🔍 Checking critical database columns...")
    
    inspector = inspect(db.engine)
    issues_found = []
    
    # Check calendar_events table for drill-down fields
    try:
        calendar_columns = [col['name'] for col in inspector.get_columns('calendar_events')]
        required_calendar_fields = [
            'member_gender', 'member_role', 'verification_status',
            'related_transaction_id', 'related_loan_id', 'related_fine_id',
            'related_campaign_id', 'location', 'meeting_type',
            'attendees_count', 'total_members'
        ]
        
        missing_calendar_fields = [field for field in required_calendar_fields 
                                 if field not in calendar_columns]
        
        if missing_calendar_fields:
            issues_found.append(f"calendar_events missing: {', '.join(missing_calendar_fields)}")
    except Exception as e:
        issues_found.append(f"Could not check calendar_events: {e}")
    
    # Check savings_groups table for location fields
    try:
        group_columns = [col['name'] for col in inspector.get_columns('savings_groups')]
        required_group_fields = ['country', 'region', 'district', 'parish', 'village']
        
        missing_group_fields = [field for field in required_group_fields 
                              if field not in group_columns]
        
        if missing_group_fields:
            issues_found.append(f"savings_groups missing: {', '.join(missing_group_fields)}")
    except Exception as e:
        issues_found.append(f"Could not check savings_groups: {e}")
    
    if issues_found:
        print("⚠️  Column issues found:")
        for issue in issues_found:
            print(f"   • {issue}")
        return False
    else:
        print("✅ All critical columns are present")
        return True


def fix_database_schema():
    """Fix database schema issues by recreating tables"""
    print("🔧 Fixing database schema...")
    
    try:
        # Drop all tables and recreate them
        print("⚠️  Dropping all tables to fix schema...")
        db.drop_all()
        
        print("🔨 Recreating all tables with correct schema...")
        db.create_all()
        
        print("✅ Database schema fixed successfully")
        return True
    except Exception as e:
        print(f"❌ Error fixing database schema: {e}")
        return False


def verify_model_relationships():
    """Verify that model relationships are working"""
    print("🔗 Verifying model relationships...")
    
    try:
        # Test basic queries to ensure relationships work
        user_count = User.query.count()
        group_count = SavingsGroup.query.count()
        member_count = GroupMember.query.count()
        
        print(f"✅ Model queries working: {user_count} users, {group_count} groups, {member_count} members")
        return True
    except Exception as e:
        print(f"❌ Model relationship error: {e}")
        return False


def ensure_default_data():
    """Ensure default data exists (saving types, etc.)"""
    print("📊 Checking default data...")
    
    try:
        # Check for saving types
        saving_type_count = SavingType.query.count()
        if saving_type_count == 0:
            print("🔧 Creating default saving types...")
            from project.api.seed_data import create_default_saving_types
            create_default_saving_types()
            print("✅ Default saving types created")
        else:
            print(f"✅ Found {saving_type_count} saving types")
        
        return True
    except Exception as e:
        print(f"❌ Error ensuring default data: {e}")
        return False


def main():
    """Main function to ensure database schema is correct"""
    print("🗄️  Database Schema Validation and Repair")
    print("=========================================")
    
    app, _ = create_app()
    with app.app_context():
        try:
            # Step 1: Check database connection
            if not check_database_connection():
                print("❌ Cannot proceed without database connection")
                sys.exit(1)
            
            # Step 2: Check if tables exist
            tables_ok = check_tables_exist()
            
            # Step 3: Create missing tables if needed
            if not tables_ok:
                if not create_missing_tables():
                    print("❌ Failed to create missing tables")
                    sys.exit(1)
            
            # Step 4: Check critical columns
            columns_ok = check_critical_columns()
            
            # Step 5: Fix schema if needed
            if not columns_ok:
                print("⚠️  Schema issues detected, attempting to fix...")
                if not fix_database_schema():
                    print("❌ Failed to fix database schema")
                    sys.exit(1)
            
            # Step 6: Verify model relationships
            if not verify_model_relationships():
                print("❌ Model relationships are broken")
                sys.exit(1)
            
            # Step 7: Ensure default data
            if not ensure_default_data():
                print("❌ Failed to ensure default data")
                sys.exit(1)
            
            print("\n✅ Database schema validation completed successfully!")
            print("🎉 Database is ready for calendar functionality!")
            
        except Exception as e:
            print(f"❌ Unexpected error during schema validation: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == '__main__':
    main()
