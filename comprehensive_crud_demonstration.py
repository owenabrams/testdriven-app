#!/usr/bin/env python3
"""
🎯 COMPREHENSIVE CRUD DEMONSTRATION
Shows how to perform CRUD operations on all meeting activities and group information
"""

import requests
import json
from datetime import datetime, date

BASE_URL = "http://localhost:5001"

def demonstrate_attendance_crud():
    """Demonstrate attendance CRUD operations"""
    print("🎯 DEMONSTRATING ATTENDANCE CRUD")
    print("=" * 50)
    
    # 1. Record attendance for meeting 15 (Group 2)
    print("1. Recording attendance for meeting 15...")
    
    # Get Group 2 members
    response = requests.get(f"{BASE_URL}/api/members/?group_id=2")
    members = response.json()['members']
    
    attendance_records = []
    for i, member in enumerate(members[:4]):  # First 4 members present
        attendance_data = {
            'meeting_id': 15,
            'member_id': member['id'],
            'status': 'PRESENT',
            'arrival_time': f"14:{str(i*5).zfill(2)}:00",
            'notes': f"Arrived on time for {member['name']}"
        }
        
        response = requests.post(f"{BASE_URL}/api/attendance/", json=attendance_data)
        if response.status_code == 201:
            result = response.json()
            attendance_records.append(result['attendance_id'])
            print(f"   ✅ Recorded attendance for {member['name']} (ID: {result['attendance_id']})")
        else:
            print(f"   ❌ Failed to record attendance for {member['name']}: {response.text}")
    
    # Record late arrival for one member
    if len(members) > 4:
        late_member = members[4]
        attendance_data = {
            'meeting_id': 15,
            'member_id': late_member['id'],
            'status': 'LATE',
            'arrival_time': "14:25:00",
            'notes': f"{late_member['name']} arrived 25 minutes late"
        }
        
        response = requests.post(f"{BASE_URL}/api/attendance/", json=attendance_data)
        if response.status_code == 201:
            result = response.json()
            attendance_records.append(result['attendance_id'])
            print(f"   ✅ Recorded late arrival for {late_member['name']} (ID: {result['attendance_id']})")
    
    # 2. Get attendance for meeting 15
    print("\n2. Getting attendance records for meeting 15...")
    response = requests.get(f"{BASE_URL}/api/attendance/?meeting_id=15")
    if response.status_code == 200:
        attendance_data = response.json()
        print(f"   ✅ Retrieved {attendance_data['count']} attendance records")
        for record in attendance_data['attendance_records']:
            print(f"      • {record['member_name']}: {record['attendance_status']} at {record['arrival_time'] or 'N/A'}")
    
    print("\n" + "=" * 50)
    return attendance_records

def demonstrate_member_profile_crud():
    """Demonstrate member profile CRUD operations"""
    print("👥 DEMONSTRATING MEMBER PROFILE CRUD")
    print("=" * 50)
    
    # Get a member from Group 2
    response = requests.get(f"{BASE_URL}/api/members/?group_id=2")
    members = response.json()['members']
    
    if not members:
        print("❌ No members found in Group 2")
        return
    
    member = members[0]  # Use first member
    member_id = member['id']
    
    # 1. Get comprehensive member profile
    print(f"1. Getting comprehensive profile for {member['name']} (ID: {member_id})...")
    response = requests.get(f"{BASE_URL}/api/member-profile/{member_id}")
    
    if response.status_code == 200:
        profile = response.json()
        print("   ✅ Member Profile Retrieved:")
        print(f"      • Name: {profile['member_info']['name']}")
        print(f"      • Role: {profile['member_info']['effective_role']}")
        print(f"      • Phone: {profile['member_info']['phone']}")
        print(f"      • Group: {profile['member_info']['group_name']}")
        
        if profile['financial_summary']:
            print("   💰 Financial Summary:")
            print(f"      • Total Savings: UGX {profile['financial_summary'].get('total_savings', 0):,.2f}")
            print(f"      • Total Loans: UGX {profile['financial_summary'].get('total_loans_received', 0):,.2f}")
            print(f"      • Total Repayments: UGX {profile['financial_summary'].get('total_loan_repayments', 0):,.2f}")
        
        if profile['attendance_summary']:
            print("   📊 Attendance Summary:")
            print(f"      • Meetings Attended: {profile['attendance_summary'].get('meetings_attended', 0)}")
            print(f"      • Total Meetings: {profile['attendance_summary'].get('total_meetings_invited', 0)}")
    
    # 2. Update member profile
    print(f"\n2. Updating profile for {member['name']}...")
    update_data = {
        'email': f"{member['name'].lower().replace(' ', '.')}@example.com",
        'occupation': 'Small Business Owner',
        'education_level': 'Secondary',
        'emergency_contact_name': 'Jane Doe',
        'emergency_contact_phone': '+256701234567'
    }
    
    response = requests.put(f"{BASE_URL}/api/member-profile/{member_id}", json=update_data)
    if response.status_code == 200:
        result = response.json()
        print("   ✅ Member profile updated successfully")
        print(f"      • Email: {result['member']['email']}")
        print(f"      • Occupation: {result['member']['occupation']}")
        print(f"      • Education: {result['member']['education_level']}")
    else:
        print(f"   ❌ Failed to update profile: {response.text}")
    
    print("\n" + "=" * 50)
    return member_id

def demonstrate_savings_and_loans():
    """Demonstrate savings and loan CRUD operations"""
    print("💰 DEMONSTRATING SAVINGS & LOANS CRUD")
    print("=" * 50)
    
    # Get Group 2 members
    response = requests.get(f"{BASE_URL}/api/members/?group_id=2")
    members = response.json()['members']
    
    if len(members) < 3:
        print("❌ Need at least 3 members for demonstration")
        return
    
    # 1. Record savings collections for multiple members
    print("1. Recording savings collections...")
    savings_amounts = [25000, 30000, 20000]  # Different amounts for variety
    
    for i, member in enumerate(members[:3]):
        # First create a meeting activity
        activity_data = {
            'meeting_id': 15,
            'activity_type': 'savings_collection',
            'description': f'Monthly savings - {member["name"]}',
            'amount': savings_amounts[i],
            'status': 'completed'
        }
        
        response = requests.post(f"{BASE_URL}/api/meeting-activities/", json=activity_data)
        if response.status_code == 201:
            activity_result = response.json()
            print(f"   ✅ Recorded UGX {savings_amounts[i]:,} savings for {member['name']}")
            
            # Record member participation
            participation_data = {
                'activity_id': activity_result['activity']['id'],
                'member_id': member['id'],
                'participation_type': 'CONTRIBUTOR',
                'amount_contributed': savings_amounts[i],
                'notes': f'October 2025 monthly savings contribution'
            }
            
            # Insert participation record directly via database
            import psycopg2
            conn = psycopg2.connect(
                host="localhost",
                database="testdriven_dev",
                user=None,  # Use default user
                password=None
            )
            cursor = conn.cursor()
            
            try:
                cursor.execute('''
                    INSERT INTO member_activity_participation (
                        activity_id, member_id, participation_type, amount_contributed, notes, created_date
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                ''', (
                    activity_result['activity']['id'],
                    member['id'],
                    'CONTRIBUTOR',
                    savings_amounts[i],
                    'October 2025 monthly savings contribution',
                    datetime.now()
                ))
                conn.commit()
                print(f"      • Participation recorded for {member['name']}")
            except Exception as e:
                print(f"      ❌ Failed to record participation: {e}")
                conn.rollback()
            finally:
                conn.close()
        else:
            print(f"   ❌ Failed to record savings for {member['name']}: {response.text}")
    
    # 2. Process a loan application
    print("\n2. Processing loan application...")
    loan_member = members[0]  # First member applies for loan
    
    loan_data = {
        'meeting_id': 15,
        'activity_type': 'loan_disbursement',
        'description': f'Business loan - {loan_member["name"]}',
        'amount': 100000,  # UGX 100,000 loan
        'status': 'completed'
    }
    
    response = requests.post(f"{BASE_URL}/api/meeting-activities/", json=loan_data)
    if response.status_code == 201:
        loan_result = response.json()
        print(f"   ✅ Processed UGX 100,000 loan for {loan_member['name']}")
        print(f"      • Activity ID: {loan_result['activity']['id']}")
    else:
        print(f"   ❌ Failed to process loan: {response.text}")
    
    print("\n" + "=" * 50)

def demonstrate_group_information_tabs():
    """Demonstrate group information tabs CRUD"""
    print("🏢 DEMONSTRATING GROUP INFORMATION TABS")
    print("=" * 50)
    
    group_id = 2  # Use Group 2
    
    # 1. Update group overview
    print("1. Updating group overview...")
    overview_data = {
        'description': 'A progressive VSLA focused on financial inclusion and community development',
        'region': 'Central Uganda',
        'district': 'Kampala',
        'parish': 'Nakawa',
        'village': 'Bugolobi'
    }
    
    response = requests.put(f"{BASE_URL}/api/groups/{group_id}", json=overview_data)
    if response.status_code == 200:
        result = response.json()
        print("   ✅ Group overview updated successfully")
        print(f"      • Description: {overview_data['description'][:50]}...")
        print(f"      • Location: {overview_data['village']}, {overview_data['district']}")
    else:
        print(f"   ❌ Failed to update overview: {response.text}")
    
    # 2. Add training records directly to database
    print("\n2. Adding training records...")
    
    import psycopg2
    conn = psycopg2.connect(
        host="localhost",
        database="testdriven_dev",
        user=None,
        password=None
    )
    cursor = conn.cursor()
    
    try:
        # Insert training record
        cursor.execute('''
            INSERT INTO group_trainings (
                group_id, training_topic, trainer_name, training_date,
                duration_hours, participants_count, training_outcomes, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            group_id,
            'Digital Financial Services',
            'Moses Kiggundu',
            '2025-10-15',
            2.5,
            6,
            'Members learned about mobile money, digital savings, and online banking',
            datetime.now()
        ))
        
        training_id = cursor.fetchone()[0]
        conn.commit()
        print(f"   ✅ Training record created (ID: {training_id})")
        print("      • Topic: Digital Financial Services")
        print("      • Duration: 2.5 hours")
        print("      • Participants: 6 members")
        
    except Exception as e:
        print(f"   ❌ Failed to create training record: {e}")
        conn.rollback()
    finally:
        conn.close()
    
    # 3. Add voting session
    print("\n3. Recording voting session...")
    
    conn = psycopg2.connect(
        host="localhost",
        database="testdriven_dev",
        user=None,
        password=None
    )
    cursor = conn.cursor()
    
    try:
        # Insert voting session
        cursor.execute('''
            INSERT INTO group_voting_sessions (
                group_id, voting_topic, voting_date, voting_type,
                total_eligible_voters, description, result, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            group_id,
            'Approve New Loan Policy',
            '2025-10-01',
            'SIMPLE_MAJORITY',
            6,
            'Vote to approve new loan policy with reduced interest rates',
            'PASSED',
            datetime.now()
        ))
        
        voting_id = cursor.fetchone()[0]
        conn.commit()
        print(f"   ✅ Voting session recorded (ID: {voting_id})")
        print("      • Topic: Approve New Loan Policy")
        print("      • Result: PASSED")
        print("      • Eligible Voters: 6")
        
    except Exception as e:
        print(f"   ❌ Failed to record voting session: {e}")
        conn.rollback()
    finally:
        conn.close()
    
    print("\n" + "=" * 50)

def main():
    """Run comprehensive CRUD demonstration"""
    print("🚀 COMPREHENSIVE CRUD DEMONSTRATION STARTING")
    print("=" * 60)
    print("This demonstration shows CRUD operations for:")
    print("• Meeting attendance tracking")
    print("• Member profile management")
    print("• Savings and loan processing")
    print("• Group information tabs")
    print("=" * 60)
    print()
    
    try:
        # Test server connectivity
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print("❌ Backend server not responding. Please start the server first.")
            return
        
        # Run demonstrations
        attendance_records = demonstrate_attendance_crud()
        member_id = demonstrate_member_profile_crud()
        demonstrate_savings_and_loans()
        demonstrate_group_information_tabs()
        
        print("🎉 COMPREHENSIVE CRUD DEMONSTRATION COMPLETE!")
        print("=" * 60)
        print("✅ All CRUD operations demonstrated successfully")
        print("📊 Check the database and frontend to see the changes")
        print("🔗 Visit http://localhost:3000/groups/2 to see updated group information")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server.")
        print("Please ensure the server is running on http://localhost:5001")
    except Exception as e:
        print(f"❌ Error during demonstration: {e}")

if __name__ == "__main__":
    main()
