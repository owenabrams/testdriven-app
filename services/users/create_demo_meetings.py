#!/usr/bin/env python3

import os
import sys
from datetime import datetime, timedelta

# Add the project directory to the Python path
sys.path.insert(0, '/usr/src/app')

from project import create_app, db
from project.api.models import SavingsGroup, GroupMember, Meeting
from project.api.meeting_models import MeetingActivity, MemberActivityParticipation, ActivityDocument

def create_demo_meetings():
    """Create demo meetings with activities for testing"""
    app, _ = create_app()

    with app.app_context():
        try:
            # Get the first savings group
            group = SavingsGroup.query.first()
            if not group:
                print("❌ No savings groups found. Please create a savings group first.")
                return
            
            print(f"✅ Found savings group: {group.name}")
            
            # Get group members
            members = GroupMember.query.filter_by(group_id=group.id).all()
            if not members:
                print("❌ No group members found.")
                return
            
            print(f"✅ Found {len(members)} group members")
            
            # Create demo meetings
            meetings_data = [
                {
                    'meeting_number': 1,
                    'meeting_date': datetime.now() - timedelta(days=7),
                    'meeting_type': 'REGULAR',
                    'status': 'COMPLETED'
                },
                {
                    'meeting_number': 2,
                    'meeting_date': datetime.now() - timedelta(days=3),
                    'meeting_type': 'REGULAR',
                    'status': 'COMPLETED'
                },
                {
                    'meeting_number': 3,
                    'meeting_date': datetime.now() + timedelta(days=3),
                    'meeting_type': 'REGULAR',
                    'status': 'SCHEDULED'
                }
            ]
            
            created_meetings = []
            
            for meeting_data in meetings_data:
                # Check if meeting already exists
                existing_meeting = Meeting.query.filter_by(
                    group_id=group.id,
                    meeting_number=meeting_data['meeting_number']
                ).first()

                if existing_meeting:
                    print(f"⚠️  Meeting #{meeting_data['meeting_number']} already exists")
                    created_meetings.append(existing_meeting)
                    continue

                # Create new meeting
                meeting = Meeting(
                    group_id=group.id,
                    meeting_number=meeting_data['meeting_number'],
                    meeting_date=meeting_data['meeting_date'].date(),
                    meeting_type=meeting_data['meeting_type'],
                    status=meeting_data['status'],
                    chairperson_id=members[0].id if members else 1,
                    secretary_id=members[1].id if len(members) > 1 else members[0].id,
                    treasurer_id=members[2].id if len(members) > 2 else members[0].id,
                    total_members=len(members),
                    members_present=len(members) if meeting_data['status'] == 'COMPLETED' else 0,
                    quorum_met=True if meeting_data['status'] == 'COMPLETED' else False,
                    created_by=members[0].user_id if members else 1
                )

                db.session.add(meeting)
                db.session.flush()  # Get the meeting ID

                print(f"✅ Created meeting #{meeting.meeting_number} ({meeting.meeting_type})")
                created_meetings.append(meeting)
                
                # Create demo activities for completed meetings
                if meeting_data['status'] == 'COMPLETED':
                    activities_data = [
                        {
                            'name': 'Attendance Recording',
                            'type': 'attendance',
                            'description': 'Record member attendance',
                            'order': 1,
                            'status': 'completed'
                        },
                        {
                            'name': 'Savings Collection',
                            'type': 'savings',
                            'description': 'Collect weekly savings from members',
                            'order': 2,
                            'status': 'completed'
                        },
                        {
                            'name': 'Loan Applications Review',
                            'type': 'loans',
                            'description': 'Review and approve loan applications',
                            'order': 3,
                            'status': 'completed'
                        }
                    ]
                    
                    for activity_data in activities_data:
                        activity = MeetingActivity(
                            meeting_id=meeting.id,
                            activity_name=activity_data['name'],
                            activity_type=activity_data['type'],
                            description=activity_data['description'],
                            activity_order=activity_data['order'],
                            status=activity_data['status'],
                            start_time=datetime.combine(meeting.meeting_date, datetime.min.time()),
                            end_time=datetime.combine(meeting.meeting_date, datetime.min.time()) + timedelta(minutes=30)
                        )
                        
                        db.session.add(activity)
                        db.session.flush()
                        
                        print(f"  ✅ Created activity: {activity.activity_name}")
                        
                        # Create member participation for some members
                        for i, member in enumerate(members[:3]):  # First 3 members
                            participation = MemberActivityParticipation(
                                activity_id=activity.id,
                                member_id=member.id,
                                participation_type='active',
                                amount_contributed=1000.00 if activity_data['type'] == 'savings' else 0.00,
                                participation_score=85 + (i * 5),
                                notes=f"Participated actively in {activity_data['name']}"
                            )
                            
                            db.session.add(participation)
                        
                        print(f"    ✅ Created participation records for {min(3, len(members))} members")
            
            # Commit all changes
            db.session.commit()
            
            print(f"\n🎉 Successfully created {len(created_meetings)} demo meetings!")
            print("\n📋 Summary:")
            for meeting in created_meetings:
                activities_count = MeetingActivity.query.filter_by(meeting_id=meeting.id).count()
                print(f"  • Meeting #{meeting.meeting_number} ({meeting.status}) - {activities_count} activities")
            
            print(f"\n🌐 You can now access the meetings at:")
            print(f"   http://localhost:3000/savings-groups?page=meetings")
            
        except Exception as e:
            print(f"❌ Error creating demo meetings: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    create_demo_meetings()
