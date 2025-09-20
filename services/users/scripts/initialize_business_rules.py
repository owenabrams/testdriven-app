#!/usr/bin/env python3
"""
Initialize Business Rules and System Configuration
Professional business logic setup for savings groups management
"""

import sys
import os
sys.path.append('/usr/src/app')

from project import create_app, db
from project.api.models import SavingsGroup, User
from project.api.business_rules_models import SystemConfiguration, GroupBusinessRules
from datetime import datetime, date, timedelta
import json


def create_default_system_configurations():
    """Create default system configurations"""
    print("📋 Creating default system configurations...")
    
    default_configs = [
        # Attendance System Configurations
        {
            "config_key": "ATTENDANCE_QR_CODE_ENABLED",
            "config_value": "true",
            "config_type": "BOOLEAN",
            "description": "Enable QR code check-in functionality",
            "category": "ATTENDANCE"
        },
        {
            "config_key": "ATTENDANCE_GPS_VERIFICATION_ENABLED",
            "config_value": "true",
            "config_type": "BOOLEAN",
            "description": "Enable GPS location verification for attendance",
            "category": "ATTENDANCE"
        },
        {
            "config_key": "ATTENDANCE_PHOTO_VERIFICATION_ENABLED",
            "config_value": "true",
            "config_type": "BOOLEAN",
            "description": "Enable photo verification for attendance",
            "category": "ATTENDANCE"
        },
        {
            "config_key": "ATTENDANCE_DEFAULT_GEOFENCE_RADIUS",
            "config_value": "100",
            "config_type": "INTEGER",
            "description": "Default geofence radius in meters",
            "category": "ATTENDANCE"
        },
        {
            "config_key": "ATTENDANCE_LATE_THRESHOLD_MINUTES",
            "config_value": "15",
            "config_type": "INTEGER",
            "description": "Default late threshold in minutes",
            "category": "ATTENDANCE"
        },
        {
            "config_key": "ATTENDANCE_HYBRID_MODE_ENABLED",
            "config_value": "true",
            "config_type": "BOOLEAN",
            "description": "Enable hybrid attendance mode (physical + digital)",
            "category": "ATTENDANCE"
        },
        
        # Business Rules Configurations
        {
            "config_key": "MINIMUM_CYCLES_FOR_ENHANCED_FEATURES",
            "config_value": "2",
            "config_type": "INTEGER",
            "description": "Minimum cycles required for enhanced features",
            "category": "BUSINESS_RULES"
        },
        {
            "config_key": "MINIMUM_YEARS_TOGETHER",
            "config_value": "3.0",
            "config_type": "STRING",
            "description": "Minimum years together for enhanced features",
            "category": "BUSINESS_RULES"
        },
        {
            "config_key": "REQUIRED_LOAN_AGREEMENT_PERCENTAGE",
            "config_value": "100.0",
            "config_type": "STRING",
            "description": "Required percentage of members agreeing to loans",
            "category": "BUSINESS_RULES"
        },
        {
            "config_key": "REQUIRED_INVESTMENT_PLAN_PERCENTAGE",
            "config_value": "75.0",
            "config_type": "STRING",
            "description": "Required percentage of members with investment plans",
            "category": "BUSINESS_RULES"
        },
        {
            "config_key": "ELIGIBILITY_SCORE_THRESHOLD",
            "config_value": "80.0",
            "config_type": "STRING",
            "description": "Minimum eligibility score for enhanced features",
            "category": "BUSINESS_RULES"
        },
        
        # Technology Configurations
        {
            "config_key": "MINIMUM_SMARTPHONE_PERCENTAGE",
            "config_value": "50.0",
            "config_type": "STRING",
            "description": "Minimum percentage of members with smartphones for digital features",
            "category": "TECHNOLOGY"
        },
        {
            "config_key": "OFFLINE_MODE_ENABLED",
            "config_value": "true",
            "config_type": "BOOLEAN",
            "description": "Enable offline mode for areas with poor connectivity",
            "category": "TECHNOLOGY"
        }
    ]
    
    admin_user = User.query.filter_by(admin=True).first()
    if not admin_user:
        print("⚠️  No admin user found, creating configurations without creator")
        admin_user_id = 1  # Default to user ID 1
    else:
        admin_user_id = admin_user.id
    
    created_count = 0
    for config_data in default_configs:
        existing = SystemConfiguration.query.filter_by(
            config_key=config_data["config_key"]
        ).first()
        
        if not existing:
            config = SystemConfiguration(
                config_key=config_data["config_key"],
                config_value=config_data["config_value"],
                config_type=config_data["config_type"],
                description=config_data["description"],
                category=config_data["category"],
                created_by=admin_user_id
            )
            db.session.add(config)
            created_count += 1
            print(f"   ✅ Created configuration: {config_data['config_key']}")
    
    db.session.commit()
    print(f"✅ Successfully created {created_count} system configurations")
    return created_count


def create_group_business_rules():
    """Create business rules for existing groups"""
    print("🏢 Creating business rules for existing groups...")
    
    groups = SavingsGroup.query.all()
    if not groups:
        print("⚠️  No groups found")
        return 0
    
    admin_user = User.query.filter_by(admin=True).first()
    admin_user_id = admin_user.id if admin_user else 1
    
    created_count = 0
    for group in groups:
        existing_rules = GroupBusinessRules.query.filter_by(group_id=group.id).first()
        
        if not existing_rules:
            # Calculate years together based on group creation date
            if group.created_date:
                years_together = (datetime.now() - group.created_date).days / 365.25
            else:
                years_together = 1.0  # Default assumption
            
            # Determine technology readiness based on group characteristics
            member_count = len(group.members)
            smartphone_percentage = min(70.0, member_count * 10)  # Estimate based on group size
            
            # Set realistic defaults based on group maturity
            if years_together >= 3.0:
                current_cycle = 3
                has_passbooks = True
                has_group_ledger = True
                record_keeping_score = 8.5
                financial_literacy_completed = True
                technology_comfort = 'MEDIUM'
                attendance_mode = 'HYBRID'
            elif years_together >= 2.0:
                current_cycle = 2
                has_passbooks = True
                has_group_ledger = True
                record_keeping_score = 7.0
                financial_literacy_completed = True
                technology_comfort = 'LOW'
                attendance_mode = 'MANUAL'
            else:
                current_cycle = 1
                has_passbooks = False
                has_group_ledger = False
                record_keeping_score = 5.0
                financial_literacy_completed = False
                technology_comfort = 'LOW'
                attendance_mode = 'MANUAL'
            
            business_rules = GroupBusinessRules(
                group_id=group.id,
                current_cycle=current_cycle,
                years_together=years_together,
                formation_date=group.created_date.date() if group.created_date else date.today(),
                has_passbooks=has_passbooks,
                has_group_ledger=has_group_ledger,
                record_keeping_score=record_keeping_score,
                loan_agreement_percentage=85.0,  # Realistic default
                investment_plan_percentage=70.0,  # Realistic default
                financial_literacy_completed=financial_literacy_completed,
                internet_connectivity_available=True,  # Assume available in most areas
                members_have_smartphones=smartphone_percentage,
                technology_comfort_level=technology_comfort,
                attendance_mode=attendance_mode,
                requires_physical_presence=True,
                allows_remote_attendance=(attendance_mode == 'HYBRID'),
                last_assessment_date=date.today(),
                assessed_by=admin_user_id
            )
            
            # Calculate and set eligibility
            business_rules.update_eligibility_status()
            
            db.session.add(business_rules)
            created_count += 1
            
            print(f"   ✅ Created business rules for: {group.name}")
            print(f"      - Cycle: {current_cycle}, Years: {years_together:.1f}")
            print(f"      - Attendance Mode: {attendance_mode}")
            print(f"      - Eligible for Enhanced Features: {business_rules.eligible_for_enhanced_features}")
    
    db.session.commit()
    print(f"✅ Successfully created business rules for {created_count} groups")
    return created_count


def main():
    """Main initialization function"""
    print("🚀 Initializing Business Rules and System Configuration")
    print("============================================================")

    # Create Flask app and context
    app, _ = create_app()

    with app.app_context():
        try:
            # Create system configurations
            config_count = create_default_system_configurations()

            # Create group business rules
            rules_count = create_group_business_rules()
        
            print("")
            print("============================================================")
            print("🎉 BUSINESS RULES INITIALIZATION COMPLETE!")
            print(f"✅ System configurations created: {config_count}")
            print(f"✅ Group business rules created: {rules_count}")
            print("")
            print("📋 BUSINESS RULES FEATURES NOW AVAILABLE:")
            print("   • Flexible attendance configuration")
            print("   • Group maturity assessment")
            print("   • Technology readiness evaluation")
            print("   • Hybrid attendance mode support")
            print("   • Enhanced features eligibility")
            print("   • Professional business logic")

        except Exception as e:
            print(f"❌ INITIALIZATION FAILED: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
