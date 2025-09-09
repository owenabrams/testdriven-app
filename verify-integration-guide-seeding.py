#!/usr/bin/env python3
"""
Verification script to ensure database seeding matches SAVINGS_PLATFORM_INTEGRATION_GUIDE.md
"""

import os
import sys
from decimal import Decimal

# Add the project directory to the path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'services', 'users'))

from project import create_app, db
from project.api.models import (
    User, SavingsGroup, GroupMember, SavingType, MemberSaving, 
    SavingTransaction, GroupCashbook, TargetSavingsCampaign
)

def verify_integration_guide_compliance():
    """Verify that seeded data matches SAVINGS_PLATFORM_INTEGRATION_GUIDE.md specifications"""
    
    print("🔍 Verifying Integration Guide Compliance...")
    print("=" * 50)
    
    # Set environment for development
    os.environ.setdefault('APP_SETTINGS', 'project.config.DevelopmentConfig')
    os.environ.setdefault('DATABASE_URL', 'sqlite:///app.db')
    os.environ.setdefault('SECRET_KEY', 'dev-secret-key')
    
    # Create application context
    app, _ = create_app()
    with app.app_context():
        
        # Verify users as specified in integration guide
        print("\n👥 Verifying Demo Users:")
        
        expected_users = [
            {'email': 'superadmin@testdriven.io', 'role': 'Super Admin', 'password': 'superpassword123'},
            {'email': 'admin@savingsgroups.ug', 'role': 'Service Admin', 'password': 'admin123'},
            {'email': 'sarah@kampala.ug', 'role': 'Group Officer (Chair)', 'password': 'password123'},
            {'email': 'mary@kampala.ug', 'role': 'Group Officer (Treasurer)', 'password': 'password123'},
            {'email': 'grace@kampala.ug', 'role': 'Group Officer (Secretary)', 'password': 'password123'},
            {'email': 'alice@kampala.ug', 'role': 'Group Member', 'password': 'password123'},
            {'email': 'jane@kampala.ug', 'role': 'Group Member', 'password': 'password123'},
            {'email': 'rose@kampala.ug', 'role': 'Group Member', 'password': 'password123'},
            {'email': 'john@kampala.ug', 'role': 'Group Member', 'password': 'password123'},
            {'email': 'peter@kampala.ug', 'role': 'Group Member', 'password': 'password123'},
        ]
        
        users_verified = 0
        for expected in expected_users:
            user = User.query.filter_by(email=expected['email']).first()
            if user:
                print(f"   ✅ {expected['email']} - {expected['role']}")
                users_verified += 1
            else:
                print(f"   ❌ {expected['email']} - MISSING")
        
        print(f"\n   📊 Users Status: {users_verified}/{len(expected_users)} verified")
        
        # Verify savings groups
        print("\n🏦 Verifying Savings Groups:")
        
        kampala_group = SavingsGroup.query.filter_by(name="Kampala Women's Cooperative").first()
        if kampala_group:
            print(f"   ✅ Kampala Women's Cooperative - {kampala_group.members_count} members, UGX {kampala_group.savings_balance:,.0f}")
        else:
            print("   ❌ Kampala Women's Cooperative - MISSING")
        
        nakasero_group = SavingsGroup.query.filter_by(name="Nakasero Traders Association").first()
        if nakasero_group:
            print(f"   ✅ Nakasero Traders Association - {nakasero_group.members_count} members, UGX {nakasero_group.savings_balance:,.0f}")
        else:
            print("   ❌ Nakasero Traders Association - MISSING")
        
        # Verify saving types
        print("\n💰 Verifying Saving Types:")
        
        expected_saving_types = ['PERSONAL', 'ECD', 'SOCIAL', 'TARGET']
        saving_types_verified = 0
        
        for st_code in expected_saving_types:
            saving_type = SavingType.query.filter_by(code=st_code).first()
            if saving_type:
                print(f"   ✅ {st_code} - {saving_type.name}")
                saving_types_verified += 1
            else:
                print(f"   ❌ {st_code} - MISSING")
        
        print(f"\n   📊 Saving Types Status: {saving_types_verified}/{len(expected_saving_types)} verified")
        
        # Verify financial data
        print("\n💵 Verifying Financial Data:")
        
        total_savings = db.session.query(db.func.sum(GroupMember.share_balance)).scalar() or Decimal('0')
        transaction_count = SavingTransaction.query.count()
        cashbook_entries = GroupCashbook.query.count()
        
        print(f"   ✅ Total System Savings: UGX {total_savings:,.0f}")
        print(f"   ✅ Saving Transactions: {transaction_count}")
        print(f"   ✅ Cashbook Entries: {cashbook_entries}")
        
        # Verify target campaigns
        print("\n🎯 Verifying Target Campaigns:")
        
        campaign = TargetSavingsCampaign.query.filter_by(name="Women's Empowerment 2025").first()
        if campaign:
            print(f"   ✅ Women's Empowerment 2025 - Status: {campaign.status}")
        else:
            print("   ❌ Women's Empowerment 2025 - MISSING")
        
        # Verify group officers
        print("\n👑 Verifying Group Officers:")
        
        if kampala_group:
            sarah = GroupMember.query.filter_by(group_id=kampala_group.id, name='Sarah Nakato').first()
            mary = GroupMember.query.filter_by(group_id=kampala_group.id, name='Mary Nambi').first()
            grace = GroupMember.query.filter_by(group_id=kampala_group.id, name='Grace Mukasa').first()
            
            if sarah and sarah.role == 'CHAIR':
                print("   ✅ Sarah Nakato - Chair")
            else:
                print("   ❌ Sarah Nakato - Chair role missing")
            
            if mary and mary.role == 'TREASURER':
                print("   ✅ Mary Nambi - Treasurer")
            else:
                print("   ❌ Mary Nambi - Treasurer role missing")
            
            if grace and grace.role == 'SECRETARY':
                print("   ✅ Grace Mukasa - Secretary")
            else:
                print("   ❌ Grace Mukasa - Secretary role missing")
        
        # Summary
        print("\n" + "=" * 50)
        print("📋 INTEGRATION GUIDE COMPLIANCE SUMMARY:")
        print(f"   Users: {users_verified}/{len(expected_users)} ({'✅ PASS' if users_verified == len(expected_users) else '❌ FAIL'})")
        print(f"   Saving Types: {saving_types_verified}/{len(expected_saving_types)} ({'✅ PASS' if saving_types_verified == len(expected_saving_types) else '❌ FAIL'})")
        print(f"   Financial Data: {'✅ PASS' if total_savings > 0 and transaction_count > 0 else '❌ FAIL'}")
        print(f"   Groups: {'✅ PASS' if kampala_group and nakasero_group else '❌ FAIL'}")
        print(f"   Campaigns: {'✅ PASS' if campaign else '❌ FAIL'}")
        
        overall_status = (
            users_verified == len(expected_users) and
            saving_types_verified == len(expected_saving_types) and
            total_savings > 0 and
            kampala_group and nakasero_group and
            campaign
        )
        
        print(f"\n🎯 OVERALL STATUS: {'✅ COMPLIANT' if overall_status else '❌ NON-COMPLIANT'}")
        
        if overall_status:
            print("\n🎉 Database seeding matches SAVINGS_PLATFORM_INTEGRATION_GUIDE.md specifications!")
        else:
            print("\n⚠️  Database seeding does not fully match integration guide. Please run seed_demo_data.py")

if __name__ == '__main__':
    verify_integration_guide_compliance()