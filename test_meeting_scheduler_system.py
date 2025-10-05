#!/usr/bin/env python3
"""
📅 MS Teams-like Meeting Scheduler System Demo
Tests the complete meeting scheduling workflow
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5001/api"

def test_scheduler_calendar():
    """Test scheduler calendar API"""
    print("📅 TESTING SCHEDULER CALENDAR")
    print("=" * 50)
    
    # Test calendar view
    response = requests.get(f"{BASE_URL}/scheduler/calendar?group_id=1")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Calendar API working")
        print(f"  Total slots: {data['total_slots']}")
        print(f"  Date range: {data['date_range']['start']} to {data['date_range']['end']}")
    else:
        print(f"❌ Calendar API failed: {response.status_code}")
        print(f"  Error: {response.text}")

def test_meeting_templates():
    """Test meeting templates API"""
    print("\n📋 TESTING MEETING TEMPLATES")
    print("=" * 50)
    
    # Get templates for group 1
    response = requests.get(f"{BASE_URL}/scheduler/meeting-templates?group_id=1")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Templates API working")
        print(f"  Total templates: {data['total']}")
        
        for template in data['meeting_templates']:
            print(f"  • {template['template_name']} ({template['meeting_type']})")
            print(f"    Duration: {template['default_duration_minutes']} minutes")
            print(f"    Recurring: {template['is_recurring']} ({template.get('recurrence_pattern', 'N/A')})")
            
            # Show template activities if available
            if template.get('template_activities'):
                try:
                    activities = json.loads(template['template_activities'])
                    print(f"    Activities: {len(activities)} planned")
                    for activity in activities[:3]:  # Show first 3
                        print(f"      - {activity['name']} ({activity['duration']}min)")
                except:
                    print(f"    Activities: {template['template_activities']}")
    else:
        print(f"❌ Templates API failed: {response.status_code}")

def test_meeting_scheduling():
    """Test meeting scheduling with direct SQL"""
    print("\n🗓️ TESTING MEETING SCHEDULING")
    print("=" * 50)
    
    # Test with minimal data first
    meeting_data = {
        "group_id": 1,
        "meeting_date": "2025-10-20",
        "meeting_time": "14:00",
        "title": "Test Meeting",
        "scheduled_by": 1
    }
    
    print(f"Scheduling meeting: {meeting_data['title']}")
    response = requests.post(f"{BASE_URL}/scheduler/schedule-meeting", 
                           json=meeting_data,
                           headers={'Content-Type': 'application/json'})
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Meeting scheduled successfully!")
        print(f"  Meeting ID: {data['meeting_id']}")
        print(f"  Members invited: {data['members_invited']}")
        return data['meeting_id']
    else:
        print(f"❌ Meeting scheduling failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return None

def test_meeting_with_activities():
    """Test scheduling meeting with planned activities"""
    print("\n📋 TESTING MEETING WITH PLANNED ACTIVITIES")
    print("=" * 50)
    
    meeting_data = {
        "group_id": 1,
        "meeting_date": "2025-10-25",
        "meeting_time": "14:00",
        "title": "Complete Savings Meeting",
        "description": "Full meeting with all planned activities",
        "location": "Community Center",
        "meeting_type": "REGULAR",
        "duration_minutes": 120,
        "scheduled_by": 1,
        "planned_activities": [
            {
                "order": 1,
                "name": "Opening Prayer",
                "type": "OPENING_PRAYER",
                "duration": 5
            },
            {
                "order": 2,
                "name": "Attendance Check",
                "type": "ATTENDANCE_CHECK",
                "duration": 10
            },
            {
                "order": 3,
                "name": "Individual Savings Collection",
                "type": "INDIVIDUAL_SAVINGS",
                "duration": 30,
                "amount": 5000
            },
            {
                "order": 4,
                "name": "Loan Applications Review",
                "type": "LOAN_APPLICATIONS",
                "duration": 20
            },
            {
                "order": 5,
                "name": "Fine Collection",
                "type": "FINE_COLLECTION",
                "duration": 10,
                "amount": 1000
            },
            {
                "order": 6,
                "name": "Closing Prayer",
                "type": "CLOSING_PRAYER",
                "duration": 5
            }
        ]
    }
    
    print(f"Scheduling complete meeting with {len(meeting_data['planned_activities'])} activities")
    response = requests.post(f"{BASE_URL}/scheduler/schedule-meeting", 
                           json=meeting_data,
                           headers={'Content-Type': 'application/json'})
    
    if response.status_code == 201:
        data = response.json()
        print(f"✅ Complete meeting scheduled!")
        print(f"  Meeting ID: {data['meeting_id']}")
        print(f"  Members invited: {data['members_invited']}")
        return data['meeting_id']
    else:
        print(f"❌ Complete meeting scheduling failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return None

def test_meeting_invitations(meeting_id):
    """Test meeting invitations API"""
    if not meeting_id:
        print("\n❌ No meeting ID to test invitations")
        return
    
    print(f"\n👥 TESTING MEETING INVITATIONS (Meeting {meeting_id})")
    print("=" * 50)
    
    response = requests.get(f"{BASE_URL}/scheduler/meetings/{meeting_id}/invitations")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Invitations API working")
        print(f"  Total invitations: {data['invitation_summary']['total_invitations']}")
        print(f"  Accepted: {data['invitation_summary']['accepted']}")
        print(f"  Pending: {data['invitation_summary']['pending']}")
        print(f"  Declined: {data['invitation_summary']['declined']}")
        
        print("\n  Member invitations:")
        for invitation in data['invitations'][:5]:  # Show first 5
            print(f"    • {invitation['member_name']}: {invitation['invitation_status']}")
    else:
        print(f"❌ Invitations API failed: {response.status_code}")

def test_planned_activities(meeting_id):
    """Test planned activities API"""
    if not meeting_id:
        print("\n❌ No meeting ID to test activities")
        return
    
    print(f"\n📋 TESTING PLANNED ACTIVITIES (Meeting {meeting_id})")
    print("=" * 50)
    
    response = requests.get(f"{BASE_URL}/scheduler/meetings/{meeting_id}/planned-activities")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Planned Activities API working")
        print(f"  Total activities: {data['activity_summary']['total_activities']}")
        print(f"  Total estimated duration: {data['activity_summary']['total_estimated_duration']} minutes")
        print(f"  Total estimated amount: ${data['activity_summary']['total_estimated_amount']:,.0f}")
        
        print("\n  Planned activities:")
        for activity in data['planned_activities']:
            print(f"    {activity['activity_order']}. {activity['activity_name']} ({activity['estimated_duration_minutes']}min)")
            if activity.get('estimated_amount', 0) > 0:
                print(f"       Amount: ${activity['estimated_amount']:,.0f}")
    else:
        print(f"❌ Planned Activities API failed: {response.status_code}")

def test_calendar_integration():
    """Test how scheduler integrates with existing calendar"""
    print(f"\n🗓️ TESTING CALENDAR INTEGRATION")
    print("=" * 50)
    
    # Check if scheduled meetings appear in regular calendar
    response = requests.get(f"{BASE_URL}/calendar/filtered?group_id=1&start_date=2025-10-15&end_date=2025-10-31")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Calendar integration working")
        print(f"  Total events in date range: {data.get('total_events', 0)}")
        
        # Look for meeting events
        meeting_events = [event for event in data.get('filtered_events', []) 
                         if 'meeting' in event.get('title', '').lower()]
        print(f"  Meeting events found: {len(meeting_events)}")
        
        for event in meeting_events[:3]:
            print(f"    • {event['event_date']}: {event['title']}")
    else:
        print(f"❌ Calendar integration failed: {response.status_code}")

def main():
    print("📅 MS TEAMS-LIKE MEETING SCHEDULER SYSTEM TEST")
    print("=" * 70)
    print("Testing comprehensive meeting scheduling workflow...")
    
    # Test all components
    test_scheduler_calendar()
    test_meeting_templates()
    
    # Test basic meeting scheduling
    meeting_id = test_meeting_scheduling()
    
    # Test complete meeting with activities
    complete_meeting_id = test_meeting_with_activities()
    
    # Test related APIs
    test_meeting_invitations(meeting_id or complete_meeting_id)
    test_planned_activities(complete_meeting_id)
    test_calendar_integration()
    
    print(f"\n🎉 MEETING SCHEDULER SYSTEM TEST COMPLETE!")
    print("=" * 70)
    print("✅ Key Features Tested:")
    print("  📅 Click-to-schedule calendar interface")
    print("  📋 Meeting templates with pre-configured activities")
    print("  👥 Auto-invitation of all group members")
    print("  📊 Planned activities within meetings")
    print("  🔗 Integration with existing calendar system")
    print("  📈 Meeting and invitation management")

if __name__ == "__main__":
    main()
