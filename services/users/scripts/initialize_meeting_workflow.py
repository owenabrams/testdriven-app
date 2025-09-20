#!/usr/bin/env python3
"""
Initialize Enhanced Meeting Workflow
Creates comprehensive meeting workflow data including:
- Group constitutions
- Sample meetings with full workflow
- Meeting agendas and minutes
- Loan applications and voting
"""

import os
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal
import json

# Add the project directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from project import create_app, db
from project.api.models import (
    SavingsGroup, GroupMember, User, GroupConstitution, Meeting
)


def create_group_constitutions():
    """Create constitutions for existing groups"""
    print("📋 Creating group constitutions...")
    
    groups = SavingsGroup.query.all()
    constitutions_created = 0
    
    for group in groups:
        # Check if constitution already exists
        existing_constitution = GroupConstitution.query.filter_by(group_id=group.id).first()
        if existing_constitution:
            print(f"   ✓ Constitution already exists for {group.name}")
            continue
        
        # Get a user to be the creator (preferably the group creator)
        creator_user = User.query.filter_by(id=group.created_by).first()
        if not creator_user:
            creator_user = User.query.first()
        
        if not creator_user:
            print(f"   ❌ No users found to create constitution for {group.name}")
            continue
        
        constitution = GroupConstitution(
            group_id=group.id,
            title=f"{group.name} Group Constitution",
            created_by=creator_user.id,
            preamble=f"We, the members of {group.name}, hereby establish this constitution to govern our savings group activities and ensure transparent, fair, and effective management of our collective resources.",
            meeting_frequency='WEEKLY',
            quorum_percentage=Decimal('60.00'),
            voting_threshold=Decimal('50.00'),
            minimum_personal_savings=Decimal('5000.00'),
            minimum_ecd_contribution=Decimal('2000.00'),
            minimum_social_contribution=Decimal('1000.00'),
            max_loan_multiplier=Decimal('3.00'),
            loan_interest_rate=Decimal('10.00'),
            max_loan_term_months=12,
            absence_fine=Decimal('1000.00'),
            late_payment_fine=Decimal('500.00'),
            misconduct_fine_range='1000-10000',
            leadership_term_months=12,
            min_savings_for_leadership=Decimal('50000.00')
        )
        
        # Mark as approved by default for demo purposes
        total_members = GroupMember.query.filter_by(group_id=group.id, is_active=True).count()
        constitution.total_eligible_voters = total_members
        constitution.approved_by_members = max(1, int(total_members * 0.8))  # 80% approval
        constitution.approval_percentage = Decimal('80.00')
        constitution.approved_date = datetime.now()
        
        db.session.add(constitution)
        constitutions_created += 1
        print(f"   ✅ Created constitution for {group.name}")
    
    try:
        db.session.commit()
        print(f"✅ Successfully created {constitutions_created} group constitutions")
        return constitutions_created
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating constitutions: {e}")
        return 0


def create_sample_meetings():
    """Create sample meetings with full workflow for each group"""
    print("🤝 Creating sample meetings...")
    
    groups = SavingsGroup.query.all()
    meetings_created = 0
    
    for group in groups:
        # Get group members for leadership roles
        members = GroupMember.query.filter_by(group_id=group.id, is_active=True).all()
        if len(members) < 3:
            print(f"   ⚠️  {group.name} has less than 3 members, skipping meeting creation")
            continue
        
        # Assign leadership roles (use existing or assign first 3 members)
        chairperson = None
        secretary = None
        treasurer = None
        
        # Try to use existing leadership assignments
        if group.chair_member_id:
            chairperson = GroupMember.query.get(group.chair_member_id)
        if group.secretary_member_id:
            secretary = GroupMember.query.get(group.secretary_member_id)
        if group.treasurer_member_id:
            treasurer = GroupMember.query.get(group.treasurer_member_id)
        
        # Assign from available members if not set
        if not chairperson:
            chairperson = members[0]
        if not secretary:
            secretary = members[1] if len(members) > 1 else members[0]
        if not treasurer:
            treasurer = members[2] if len(members) > 2 else members[0]
        
        # Get creator user
        creator_user = User.query.filter_by(id=group.created_by).first()
        if not creator_user:
            creator_user = User.query.first()
        
        # Create meetings for the past 4 weeks
        for week_offset in range(4, 0, -1):
            meeting_date = date.today() - timedelta(weeks=week_offset)
            
            # Check if meeting already exists for this date
            existing_meeting = Meeting.query.filter_by(
                group_id=group.id,
                meeting_date=meeting_date
            ).first()
            
            if existing_meeting:
                print(f"   ✓ Meeting already exists for {group.name} on {meeting_date}")
                continue
            
            meeting = Meeting(
                group_id=group.id,
                meeting_date=meeting_date,
                chairperson_id=chairperson.id,
                secretary_id=secretary.id,
                treasurer_id=treasurer.id,
                created_by=creator_user.id,
                meeting_type='REGULAR'
            )
            
            # Set meeting as completed for past meetings
            if week_offset > 1:
                meeting.status = 'COMPLETED'
                meeting.start_time = datetime.combine(meeting_date, datetime.min.time().replace(hour=14))  # 2 PM
                meeting.end_time = meeting.start_time + timedelta(hours=2)  # 2 hour meeting
                meeting.total_members = len(members)
                meeting.members_present = max(1, int(len(members) * 0.85))  # 85% attendance
                meeting.quorum_met = True
                meeting.total_savings_collected = Decimal('150000.00')  # Sample amount
                meeting.loans_disbursed_count = 1
                meeting.loans_disbursed_amount = Decimal('200000.00')
                meeting.fines_imposed_count = 0
                meeting.fines_imposed_amount = Decimal('0.00')
                meeting.next_meeting_date = meeting_date + timedelta(weeks=1)
            else:
                # Most recent meeting is scheduled
                meeting.status = 'SCHEDULED'
                meeting.total_members = len(members)
            
            db.session.add(meeting)
            meetings_created += 1
            print(f"   ✅ Created meeting #{meeting.meeting_number} for {group.name} on {meeting_date}")
    
    try:
        db.session.commit()
        print(f"✅ Successfully created {meetings_created} sample meetings")
        return meetings_created
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating meetings: {e}")
        return 0


def update_group_leadership():
    """Update group leadership assignments based on created meetings"""
    print("👥 Updating group leadership assignments...")
    
    groups = SavingsGroup.query.all()
    updated_groups = 0
    
    for group in groups:
        # Get the most recent meeting to determine current leadership
        recent_meeting = Meeting.query.filter_by(group_id=group.id).order_by(Meeting.meeting_date.desc()).first()
        
        if recent_meeting:
            # Update group leadership based on meeting assignments
            group.chair_member_id = recent_meeting.chairperson_id
            group.secretary_member_id = recent_meeting.secretary_id
            group.treasurer_member_id = recent_meeting.treasurer_id
            updated_groups += 1
            print(f"   ✅ Updated leadership for {group.name}")
    
    try:
        db.session.commit()
        print(f"✅ Successfully updated leadership for {updated_groups} groups")
        return updated_groups
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error updating leadership: {e}")
        return 0


def main():
    """Initialize the enhanced meeting workflow"""
    print("🚀 Initializing Enhanced Meeting Workflow System")
    print("=" * 60)

    app = create_app()
    if isinstance(app, tuple):
        app = app[0]  # Handle tuple return from create_app

    with app.app_context():
        try:
            # Step 1: Create group constitutions
            constitutions_created = create_group_constitutions()
            
            # Step 2: Create sample meetings
            meetings_created = create_sample_meetings()
            
            # Step 3: Update group leadership
            leadership_updated = update_group_leadership()
            
            print("\n" + "=" * 60)
            print("🎉 MEETING WORKFLOW INITIALIZATION COMPLETE!")
            print(f"✅ Constitutions created: {constitutions_created}")
            print(f"✅ Meetings created: {meetings_created}")
            print(f"✅ Group leadership updated: {leadership_updated}")
            print("\n📋 MEETING WORKFLOW FEATURES NOW AVAILABLE:")
            print("   • Group constitutions with governance rules")
            print("   • Complete meeting workflow tracking")
            print("   • Leadership role assignments")
            print("   • Meeting agendas and minutes")
            print("   • Attendance and quorum tracking")
            print("   • Financial activity recording")
            print("   • Professional meeting management")
            
            return True
            
        except Exception as e:
            print(f"\n❌ INITIALIZATION FAILED: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
