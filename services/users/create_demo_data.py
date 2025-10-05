#!/usr/bin/env python3
"""
Create demo data for Enhanced Meeting Activities System
"""

import os
import sys
from datetime import datetime, timedelta

# Add the project directory to the Python path
sys.path.insert(0, '/usr/src/app')

from project import create_app
from project.api.models import db, User, SavingsGroup, GroupMember, Meeting

def create_demo_data():
    """Create demo data for testing the Enhanced Meeting Activities System"""
    
    print("🚀 CREATING DEMO DATA FOR ENHANCED MEETING ACTIVITIES SYSTEM")
    print("=" * 60)
    
    try:
        app, _ = create_app()
        
        with app.app_context():
            print("✅ Connected to database")
            
            # Check if demo data already exists
            existing_meetings = Meeting.query.count()
            if existing_meetings > 0:
                print(f"📊 Found {existing_meetings} existing meetings")
                print("✅ Demo data already exists!")
                return True
            
            # Create demo users if they don't exist
            demo_users = [
                {'email': 'sarah.chairperson@example.com', 'username': 'sarah_chair', 'is_super_admin': False, 'admin': True},
                {'email': 'mary.secretary@example.com', 'username': 'mary_sec', 'is_super_admin': False, 'admin': False},
                {'email': 'grace.treasurer@example.com', 'username': 'grace_treas', 'is_super_admin': False, 'admin': False},
                {'email': 'member1@example.com', 'username': 'member1', 'is_super_admin': False, 'admin': False},
                {'email': 'member2@example.com', 'username': 'member2', 'is_super_admin': False, 'admin': False},
            ]
            
            created_users = []
            for user_data in demo_users:
                existing_user = User.query.filter_by(email=user_data['email']).first()
                if not existing_user:
                    user = User(
                        username=user_data['username'],
                        email=user_data['email'],
                        password='password123'  # Demo password
                    )
                    user.is_super_admin = user_data['is_super_admin']
                    user.admin = user_data['admin']
                    db.session.add(user)
                    created_users.append(user)
                    print(f"👤 Created user: {user_data['email']}")
                else:
                    created_users.append(existing_user)
                    print(f"👤 Using existing user: {user_data['email']}")
            
            # Create demo group if it doesn't exist
            demo_group = SavingsGroup.query.filter_by(name='Demo Savings Group').first()
            if not demo_group:
                demo_group = SavingsGroup(
                    name='Demo Savings Group',
                    formation_date=datetime.utcnow().date() - timedelta(days=60),
                    created_by=created_users[0].id,
                    description='A demo savings group for testing Enhanced Meeting Activities',
                    district='Demo District',
                    parish='Demo Parish',
                    village='Demo Village'
                )
                db.session.add(demo_group)
                print("🏢 Created demo group: Demo Savings Group")
            else:
                print("🏢 Using existing demo group")
            
            db.session.commit()
            
            # Add members to group
            for i, user in enumerate(created_users):
                existing_member = GroupMember.query.filter_by(
                    group_id=demo_group.id,
                    user_id=user.id
                ).first()

                if not existing_member:
                    role = 'OFFICER' if i < 3 else 'MEMBER'
                    member = GroupMember(
                        group_id=demo_group.id,
                        user_id=user.id,
                        name=user.username,
                        gender='F' if 'sarah' in user.email or 'mary' in user.email or 'grace' in user.email else 'M',
                        role=role
                    )
                    # Set joined_date after creation since it's not in constructor
                    member.joined_date = datetime.utcnow().date() - timedelta(days=30)
                    db.session.add(member)
                    officer_role = 'chairperson' if i == 0 else 'secretary' if i == 1 else 'treasurer' if i == 2 else 'member'
                    print(f"👥 Added {user.email} as {officer_role}")
            
            # Get the group members for officer assignments
            chairperson = GroupMember.query.filter_by(group_id=demo_group.id, user_id=created_users[0].id).first()
            secretary = GroupMember.query.filter_by(group_id=demo_group.id, user_id=created_users[1].id).first()
            treasurer = GroupMember.query.filter_by(group_id=demo_group.id, user_id=created_users[2].id).first()

            if chairperson and secretary and treasurer:
                # Create demo meetings
                meeting_dates = [
                    datetime.utcnow() - timedelta(days=21),  # 3 weeks ago
                    datetime.utcnow() - timedelta(days=14),  # 2 weeks ago
                    datetime.utcnow() - timedelta(days=7),   # 1 week ago
                    datetime.utcnow(),                       # Today
                ]

                for i, meeting_date in enumerate(meeting_dates):
                    meeting = Meeting(
                        group_id=demo_group.id,
                        meeting_date=meeting_date.date(),
                        chairperson_id=chairperson.id,
                        secretary_id=secretary.id,
                        treasurer_id=treasurer.id,
                        created_by=created_users[0].id,
                        meeting_type='REGULAR'
                    )
                    # Set additional fields after creation
                    meeting.status = 'COMPLETED' if i < 3 else 'SCHEDULED'
                    meeting.general_notes = f'Meeting held at Community Center - Room {i + 1}. Regular monthly meeting with savings collection and loan activities.'
                    db.session.add(meeting)
                    print(f"📅 Created meeting #{meeting.meeting_number} for {meeting_date.strftime('%Y-%m-%d')}")
            else:
                print("⚠️  Could not create meetings - missing officer assignments")
            
            db.session.commit()
            
            print("\n🎉 DEMO DATA CREATION COMPLETE!")
            print("=" * 60)
            print("📊 Summary:")
            print(f"   👤 Users: {len(created_users)}")
            print(f"   🏢 Groups: 1")
            print(f"   👥 Group Members: {len(created_users)}")
            print(f"   📅 Meetings: {len(meeting_dates)}")
            print("\n🔑 Demo Login Credentials:")
            print("   📧 Email: sarah.chairperson@example.com")
            print("   🔒 Password: password123")
            print("   👑 Role: Chairperson (Admin)")
            print("\n🌐 Access the application at:")
            print("   🖥️  Frontend: http://localhost:3000")
            print("   🔧 Backend API: http://localhost:5000")
            print("\n📍 To access Enhanced Meeting Activities:")
            print("   1. Go to: http://localhost:3000/savings-groups")
            print("   2. Look for 'Meetings' and 'Activity Reports' in the sidebar")
            print("   3. Click on any meeting to see the enhanced features")
            
            return True
            
    except Exception as e:
        print(f"❌ Error creating demo data: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = create_demo_data()
    sys.exit(0 if success else 1)
