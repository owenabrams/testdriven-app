#!/usr/bin/env python3
"""
Setup script for enhanced savings group features
"""

import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Add the project directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'project'))

from project import create_app, db
from project.api.models import *  # Import all models
from project.api.seed_data import create_default_saving_types, create_sample_group_data


def setup_enhanced_savings():
    """Setup enhanced savings group features"""
    
    app, socketio = create_app()
    
    with app.app_context():
        print("Setting up enhanced savings group features...")
        
        try:
            # Create all tables
            print("Creating database tables...")
            db.create_all()
            print("✓ Database tables created successfully")
            
            # Create default saving types
            print("Creating default saving types...")
            create_default_saving_types()
            print("✓ Default saving types created")
            
            # Optionally create sample data
            create_sample = input("Create sample group data for testing? (y/N): ").lower().strip()
            if create_sample == 'y':
                print("Creating sample group data...")
                create_sample_group_data()
                print("✓ Sample group data created")
            
            print("\n🎉 Enhanced savings group features setup completed successfully!")
            print("\nNew features available:")
            print("- Enhanced Group model with District, Parish, Village fields")
            print("- Constitution and registration certificate tracking")
            print("- Multiple saving types (Personal, ECD Fund, Social Fund, Target)")
            print("- Mobile money transaction support")
            print("- Meeting attendance tracking")
            print("- Member fines management")
            print("- Comprehensive cashbook with all financial activities")
            print("- Automated loan assessment based on saving parameters")
            print("- Loan repayment schedule and tracking")
            print("- Financial analytics and reporting")
            
            print("\nAPI Endpoints added:")
            print("- GET /savings-groups/{id}/cashbook - View group cashbook")
            print("- GET /savings-groups/{id}/financial-summary - Financial summary")
            print("- POST /savings-groups/{id}/members/{id}/savings - Record member savings")
            print("- POST /savings-groups/{id}/members/{id}/loan-assessment - Create loan assessment")
            print("- POST /savings-groups/{id}/members/{id}/loan-eligibility - Check loan eligibility")
            print("- GET /savings-groups/{id}/members/{id}/loan-history - Member loan history")
            print("- POST /savings-groups/{id}/loans/{id}/disburse - Disburse loan")
            print("- POST /savings-groups/{id}/loans/{id}/repayment - Record loan repayment")
            print("- GET /savings-groups/{id}/analytics - Group analytics")
            
        except Exception as e:
            print(f"❌ Error during setup: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    return True


if __name__ == '__main__':
    success = setup_enhanced_savings()
    sys.exit(0 if success else 1)