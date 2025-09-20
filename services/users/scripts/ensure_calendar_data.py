#!/usr/bin/env python3
"""
Calendar Data Initialization Script
Ensures calendar events are generated from real data during deployment
This script addresses the manual fixes performed for calendar functionality
"""

import os
import sys
from datetime import datetime, date, timedelta
from decimal import Decimal

# Add the project directory to the path
sys.path.insert(0, '/usr/src/app')

from project import create_app, db
from project.api.models import (
    SavingsGroup, GroupMember, GroupTransaction, CalendarEvent,
    MeetingAttendance, GroupLoan, MemberFine, User, SavingType
)
from project.api.calendar import generate_calendar_events_from_real_data


def ensure_basic_demo_data():
    """Ensure basic demo data exists for calendar functionality"""
    print("🔍 Checking for basic demo data...")
    
    # Check if we have savings groups
    group_count = SavingsGroup.query.count()
    if group_count == 0:
        print("📊 Creating basic savings groups...")
        create_basic_savings_groups()
    else:
        print(f"✅ Found {group_count} savings groups")
    
    # Check if we have members
    member_count = GroupMember.query.count()
    if member_count == 0:
        print("👥 Creating basic group members...")
        create_basic_members()
    else:
        print(f"✅ Found {member_count} group members")
    
    # Check if we have transactions
    transaction_count = GroupTransaction.query.count()
    if transaction_count == 0:
        print("💰 Creating basic transactions...")
        create_basic_transactions()
    else:
        print(f"✅ Found {transaction_count} transactions")


def create_basic_savings_groups():
    """Create basic savings groups if none exist"""
    # Get or create admin user
    admin_user = User.query.filter_by(is_super_admin=True).first()
    if not admin_user:
        admin_user = User.query.first()
    
    if not admin_user:
        print("❌ No users found - cannot create savings groups")
        return
    
    groups_data = [
        {
            'name': 'Kampala Women Savers',
            'description': 'Women empowerment through savings',
            'country': 'Uganda',
            'region': 'Central Region',
            'district': 'Kampala',
            'parish': 'Central',
            'village': 'Nakasero',
            'formation_date': date.today() - timedelta(days=365),
            'created_by': admin_user.id,
            'target_amount': Decimal('5000000')
        },
        {
            'name': 'Jinja Unity Group',
            'description': 'Unity through collective savings',
            'country': 'Uganda',
            'region': 'Eastern Region',
            'district': 'Jinja',
            'parish': 'Central',
            'village': 'Main Street',
            'formation_date': date.today() - timedelta(days=180),
            'created_by': admin_user.id,
            'target_amount': Decimal('3000000')
        },
        {
            'name': 'Mbarara Progress Circle',
            'description': 'Progress through financial discipline',
            'country': 'Uganda',
            'region': 'Western Region',
            'district': 'Mbarara',
            'parish': 'Central',
            'village': 'High Street',
            'formation_date': date.today() - timedelta(days=90),
            'created_by': admin_user.id,
            'target_amount': Decimal('2000000')
        }
    ]
    
    for group_data in groups_data:
        group = SavingsGroup(**group_data)
        db.session.add(group)
    
    db.session.commit()
    print("✅ Created 3 basic savings groups")


def create_basic_members():
    """Create basic group members if none exist"""
    groups = SavingsGroup.query.all()
    if not groups:
        print("❌ No savings groups found - cannot create members")
        return
    
    # Get existing users or create basic ones
    users = User.query.limit(12).all()
    if len(users) < 12:
        print("⚠️  Not enough users for all members, creating with available users")
    
    member_names = [
        'Sarah Nakato', 'Grace Nambi', 'Mary Akello', 'Alice Namutebi',
        'John Mukasa', 'Peter Ssali', 'David Kato', 'James Wamala',
        'Rose Nalwoga', 'Jane Nakimuli', 'Susan Nakirya', 'Betty Namukasa'
    ]
    
    genders = ['F', 'F', 'F', 'F', 'M', 'M', 'M', 'M', 'F', 'F', 'F', 'F']
    roles = ['MEMBER', 'TREASURER', 'SECRETARY', 'CHAIR'] * 3
    
    member_idx = 0
    for group in groups:
        for i in range(4):  # 4 members per group
            if member_idx < len(member_names) and member_idx < len(users):
                member = GroupMember(
                    group_id=group.id,
                    user_id=users[member_idx].id,
                    name=member_names[member_idx],
                    gender=genders[member_idx],
                    role=roles[member_idx],
                    phone=f'+256{700000000 + member_idx:09d}'
                )
                db.session.add(member)
                member_idx += 1
    
    db.session.commit()
    print(f"✅ Created {member_idx} basic group members")


def create_basic_transactions():
    """Create basic transactions if none exist"""
    members = GroupMember.query.all()
    if not members:
        print("❌ No group members found - cannot create transactions")
        return
    
    # Get admin user for processing
    admin_user = User.query.filter_by(is_super_admin=True).first()
    if not admin_user:
        admin_user = User.query.first()
    
    transaction_count = 0
    for member in members[:5]:  # Create transactions for first 5 members
        amount = Decimal(str(10000 + (transaction_count * 5000)))  # Varying amounts
        transaction = GroupTransaction(
            group_id=member.group_id,
            type='SAVING_CONTRIBUTION',
            amount=amount,
            processed_by=admin_user.id,
            member_id=member.id,
            description=f'Monthly savings contribution by {member.name}',
            processed_date=datetime.now() - timedelta(days=transaction_count)
        )
        db.session.add(transaction)
        transaction_count += 1
    
    db.session.commit()
    print(f"✅ Created {transaction_count} basic transactions")


def ensure_calendar_events():
    """Ensure calendar events are generated from real data"""
    print("📅 Checking calendar events...")
    
    event_count = CalendarEvent.query.count()
    print(f"Found {event_count} existing calendar events")
    
    # Always regenerate calendar events to ensure they're up to date
    print("🔄 Generating calendar events from real data...")
    try:
        events_created = generate_calendar_events_from_real_data()
        print(f"✅ Generated {events_created} calendar events")
        return events_created
    except Exception as e:
        print(f"❌ Error generating calendar events: {e}")
        import traceback
        traceback.print_exc()
        return 0


def main():
    """Main function to ensure calendar data is ready"""
    print("🚀 Calendar Data Initialization Script")
    print("=====================================")
    
    app, _ = create_app()
    with app.app_context():
        try:
            # Ensure basic demo data exists
            ensure_basic_demo_data()
            
            # Ensure calendar events are generated
            events_created = ensure_calendar_events()
            
            print("\n✅ Calendar data initialization completed!")
            print(f"📊 Summary:")
            print(f"   - Savings Groups: {SavingsGroup.query.count()}")
            print(f"   - Group Members: {GroupMember.query.count()}")
            print(f"   - Transactions: {GroupTransaction.query.count()}")
            print(f"   - Calendar Events: {CalendarEvent.query.count()}")
            
            if events_created > 0:
                print(f"🎉 Calendar functionality is ready with {events_created} events!")
            else:
                print("⚠️  No calendar events were created - check data availability")
                
        except Exception as e:
            print(f"❌ Error during calendar data initialization: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == '__main__':
    main()
