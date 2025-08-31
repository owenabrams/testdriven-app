#!/usr/bin/env python3
"""
Migration Validation Script

This script validates that database migrations are properly applied
and that the database schema matches the expected model definitions.

Modern improvement over the tutorial to ensure database integrity.
"""

import sys
import os
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

# Add the project directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from project import create_app, db
from project.api.models import User


def validate_table_exists(inspector, table_name):
    """Validate that a table exists in the database."""
    tables = inspector.get_table_names()
    if table_name not in tables:
        print(f"❌ ERROR: Table '{table_name}' does not exist")
        return False
    print(f"✅ Table '{table_name}' exists")
    return True


def validate_columns(inspector, table_name, expected_columns):
    """Validate that all expected columns exist with correct properties."""
    columns = inspector.get_columns(table_name)
    column_dict = {col['name']: col for col in columns}
    
    all_valid = True
    for col_name, expected_props in expected_columns.items():
        if col_name not in column_dict:
            print(f"❌ ERROR: Column '{col_name}' missing from table '{table_name}'")
            all_valid = False
            continue
            
        col = column_dict[col_name]
        
        # Check nullable
        if 'nullable' in expected_props:
            if col['nullable'] != expected_props['nullable']:
                print(f"❌ ERROR: Column '{col_name}' nullable mismatch. Expected: {expected_props['nullable']}, Got: {col['nullable']}")
                all_valid = False
            else:
                print(f"✅ Column '{col_name}' nullable constraint correct")
        
        # Check type (basic check)
        if 'type' in expected_props:
            col_type_str = str(col['type']).upper()
            expected_type_str = expected_props['type'].upper()
            if expected_type_str not in col_type_str:
                print(f"❌ ERROR: Column '{col_name}' type mismatch. Expected: {expected_type_str}, Got: {col_type_str}")
                all_valid = False
            else:
                print(f"✅ Column '{col_name}' type correct")
    
    return all_valid


def validate_constraints(inspector, table_name, expected_constraints):
    """Validate that all expected constraints exist."""
    unique_constraints = inspector.get_unique_constraints(table_name)
    pk_constraint = inspector.get_pk_constraint(table_name)
    
    all_valid = True
    
    # Check primary key
    if 'primary_key' in expected_constraints:
        expected_pk = expected_constraints['primary_key']
        if pk_constraint['constrained_columns'] != expected_pk:
            print(f"❌ ERROR: Primary key mismatch. Expected: {expected_pk}, Got: {pk_constraint['constrained_columns']}")
            all_valid = False
        else:
            print(f"✅ Primary key constraint correct: {expected_pk}")
    
    # Check unique constraints
    if 'unique' in expected_constraints:
        expected_unique = expected_constraints['unique']
        existing_unique = [constraint['column_names'] for constraint in unique_constraints]
        
        for expected_cols in expected_unique:
            if expected_cols not in existing_unique:
                print(f"❌ ERROR: Unique constraint missing: {expected_cols}")
                all_valid = False
            else:
                print(f"✅ Unique constraint exists: {expected_cols}")
    
    return all_valid


def validate_users_table(inspector):
    """Validate the users table schema."""
    print("\n🔍 Validating users table...")
    
    # Check table exists
    if not validate_table_exists(inspector, 'users'):
        return False
    
    # Expected columns
    expected_columns = {
        'id': {'nullable': False, 'type': 'INTEGER'},
        'username': {'nullable': False, 'type': 'VARCHAR'},
        'email': {'nullable': False, 'type': 'VARCHAR'},
        'active': {'nullable': False, 'type': 'BOOLEAN'},
        'created_date': {'nullable': False, 'type': 'TIMESTAMP'}
    }
    
    # Expected constraints
    expected_constraints = {
        'primary_key': ['id'],
        'unique': [['username'], ['email']]
    }
    
    columns_valid = validate_columns(inspector, 'users', expected_columns)
    constraints_valid = validate_constraints(inspector, 'users', expected_constraints)
    
    return columns_valid and constraints_valid


def validate_migration_history():
    """Validate that migration history is consistent."""
    print("\n🔍 Validating migration history...")
    
    try:
        # Check alembic version table
        result = db.session.execute(text("SELECT version_num FROM alembic_version"))
        current_version = result.scalar()
        
        if not current_version:
            print("❌ ERROR: No migration version found in alembic_version table")
            return False
        
        print(f"✅ Current migration version: {current_version}")
        
        # Validate that we can create a user (tests model integrity)
        test_user = User(username='validation_test', email='validation@test.com')
        db.session.add(test_user)
        db.session.commit()
        
        # Clean up test user
        db.session.delete(test_user)
        db.session.commit()
        
        print("✅ User model validation successful")
        return True
        
    except SQLAlchemyError as e:
        print(f"❌ ERROR: Migration validation failed: {str(e)}")
        db.session.rollback()
        return False


def main():
    """Main validation function."""
    print("🚀 Starting database migration validation...")
    
    # Create app and get database inspector
    app = create_app()
    
    with app.app_context():
        try:
            inspector = inspect(db.engine)
            
            # Run validations
            users_valid = validate_users_table(inspector)
            migration_valid = validate_migration_history()
            
            # Summary
            print("\n" + "="*50)
            if users_valid and migration_valid:
                print("🎉 ALL VALIDATIONS PASSED!")
                print("✅ Database schema is correct")
                print("✅ Migrations are properly applied")
                print("✅ Models are working correctly")
                return 0
            else:
                print("❌ VALIDATION FAILED!")
                print("Please check the errors above and fix the database schema.")
                return 1
                
        except Exception as e:
            print(f"❌ CRITICAL ERROR: {str(e)}")
            return 1


if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
