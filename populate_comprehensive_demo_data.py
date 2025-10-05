#!/usr/bin/env python3
"""
🎯 Comprehensive Demo Data Population
Creates realistic, interconnected demo data for the complete microfinance system
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from datetime import datetime, date, timedelta
from decimal import Decimal
import random

# Database connection
DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'testdriven_dev'
DB_USER = os.getenv('USER')

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection failed: {e}")
        return None

def populate_demo_data(conn):
    """Populate comprehensive demo data"""
    cursor = conn.cursor()
    
    print("🎯 Populating comprehensive demo data...")
    
    # 1. Create Users
    print("  • Creating users...")
    users_data = [
        ('admin', 'admin@savingsgroup.com', 'admin123', True, True, 'super_admin'),
        ('mary_chair', 'mary@email.com', 'password123', True, False, 'user'),
        ('john_treasurer', 'john@email.com', 'password123', True, False, 'user'),
        ('sarah_secretary', 'sarah@email.com', 'password123', True, False, 'user'),
        ('peter_member', 'peter@email.com', 'password123', True, False, 'user'),
        ('grace_member', 'grace@email.com', 'password123', True, False, 'user'),
        ('david_member', 'david@email.com', 'password123', True, False, 'user'),
        ('jane_member', 'jane@email.com', 'password123', True, False, 'user')
    ]
    
    for user in users_data:
        cursor.execute("""
            INSERT INTO users (username, email, password, active, admin, role)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (username) DO NOTHING;
        """, user)
    
    # 2. Create Savings Groups
    print("  • Creating savings groups...")
    cursor.execute("""
        INSERT INTO savings_groups (name, description, location, meeting_day, meeting_time, 
                                  meeting_frequency, state, max_members, members_count, 
                                  savings_balance, loan_fund_balance, created_by)
        VALUES 
        ('Umoja Women Group', 'Community women savings group focused on economic empowerment', 
         'Kibera Community Center', 'WEDNESDAY', '14:00', 'WEEKLY', 'ACTIVE', 25, 7, 
         125000.00, 50000.00, 1),
        ('Harambee Youth Collective', 'Young entrepreneurs savings and loan group', 
         'Mathare Youth Center', 'SATURDAY', '10:00', 'WEEKLY', 'ACTIVE', 20, 5, 
         75000.00, 30000.00, 1)
        ON CONFLICT DO NOTHING;
    """)
    
    # 3. Create Group Members
    print("  • Creating group members...")
    members_data = [
        # Umoja Women Group (group_id = 1)
        (1, 2, 'Mary Wanjiku', 'FEMALE', '+254701234567', '2024-01-15', True, 15000.00, 45000.00, 'OFFICER'),
        (1, 3, 'John Kamau', 'MALE', '+254701234568', '2024-01-15', True, 12000.00, 36000.00, 'OFFICER'),
        (1, 4, 'Sarah Nyong\'o', 'FEMALE', '+254701234569', '2024-01-20', True, 18000.00, 54000.00, 'OFFICER'),
        (1, 5, 'Peter Mwangi', 'MALE', '+254701234570', '2024-02-01', True, 8000.00, 24000.00, 'MEMBER'),
        (1, 6, 'Grace Akinyi', 'FEMALE', '+254701234571', '2024-02-01', True, 10000.00, 30000.00, 'MEMBER'),
        (1, 7, 'David Ochieng', 'MALE', '+254701234572', '2024-02-15', True, 6000.00, 18000.00, 'MEMBER'),
        (1, 8, 'Jane Wambui', 'FEMALE', '+254701234573', '2024-03-01', True, 5000.00, 15000.00, 'MEMBER'),
        
        # Harambee Youth Collective (group_id = 2)
        (2, 2, 'Mary Wanjiku', 'FEMALE', '+254701234567', '2024-03-01', True, 8000.00, 16000.00, 'MEMBER'),
        (2, 5, 'Peter Mwangi', 'MALE', '+254701234570', '2024-03-01', True, 12000.00, 24000.00, 'OFFICER'),
        (2, 6, 'Grace Akinyi', 'FEMALE', '+254701234571', '2024-03-15', True, 10000.00, 20000.00, 'MEMBER'),
        (2, 7, 'David Ochieng', 'MALE', '+254701234572', '2024-03-15', True, 15000.00, 30000.00, 'OFFICER'),
        (2, 8, 'Jane Wambui', 'FEMALE', '+254701234573', '2024-04-01', True, 7000.00, 14000.00, 'MEMBER')
    ]
    
    for member in members_data:
        cursor.execute("""
            INSERT INTO group_members (group_id, user_id, name, gender, phone, joined_date, 
                                     is_active, share_balance, total_contributions, role)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, member)
    
    # 4. Update group officer positions
    print("  • Assigning group officers...")
    cursor.execute("""
        UPDATE savings_groups SET 
            chair_member_id = 1, 
            treasurer_member_id = 2, 
            secretary_member_id = 3 
        WHERE id = 1;
    """)
    
    cursor.execute("""
        UPDATE savings_groups SET 
            chair_member_id = 10, 
            treasurer_member_id = 11, 
            secretary_member_id = 9 
        WHERE id = 2;
    """)
    
    # 5. Create Meetings
    print("  • Creating meetings...")
    meetings_data = [
        # Umoja Women Group meetings
        (1, '2024-09-25', '14:00', 'Kibera Community Center', 'REGULAR', 'COMPLETED', 
         'Weekly savings collection and loan applications', 'Meeting went well, all members contributed', 
         12500.00, 25000.00, 500.00, 6, 1, 1, 2, 3, 1),
        (1, '2024-10-02', '14:00', 'Kibera Community Center', 'REGULAR', 'COMPLETED',
         'Loan disbursements and fine collections', 'Two loans approved and disbursed',
         15000.00, 30000.00, 1000.00, 7, 0, 1, 2, 3, 1),
        (1, '2024-10-09', '14:00', 'Kibera Community Center', 'REGULAR', 'SCHEDULED',
         'Monthly review and target setting', 'Upcoming monthly review meeting',
         0.00, 0.00, 0.00, 0, 0, 1, 2, 3, 1),
         
        # Harambee Youth Collective meetings
        (2, '2024-09-28', '10:00', 'Mathare Youth Center', 'REGULAR', 'COMPLETED',
         'Youth entrepreneurship training and savings', 'Training session on business planning',
         8000.00, 15000.00, 200.00, 5, 0, 10, 11, 9, 1),
        (2, '2024-10-05', '10:00', 'Mathare Youth Center', 'REGULAR', 'SCHEDULED',
         'Loan applications review', 'Review pending loan applications',
         0.00, 0.00, 0.00, 0, 0, 10, 11, 9, 1)
    ]
    
    for meeting in meetings_data:
        cursor.execute("""
            INSERT INTO meetings (group_id, meeting_date, meeting_time, location, meeting_type, 
                                status, agenda, minutes, total_savings_collected, total_loans_disbursed,
                                total_fines_collected, members_present, members_absent, chairperson_id,
                                secretary_id, treasurer_id, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, meeting)
    
    # 6. Create Calendar Events (MS Teams-like)
    print("  • Creating calendar events...")
    calendar_events = [
        ('Weekly Umoja Meeting', 'Regular weekly savings meeting', 'MEETING', '2024-10-16', '14:00', '16:00', 
         'Kibera Community Center', 1, None, None, None, None, None, 'REGULAR', 7, 7, True, 'WEEKLY', 30),
        ('Monthly Financial Review', 'Monthly group financial review and planning', 'MEETING', '2024-10-30', '14:00', '17:00',
         'Kibera Community Center', 1, None, None, None, None, None, 'SPECIAL', 7, 7, False, None, 60),
        ('Youth Entrepreneurship Training', 'Business skills training for youth members', 'TRAINING', '2024-10-12', '10:00', '15:00',
         'Mathare Youth Center', 2, None, None, None, None, None, None, 5, 5, False, None, 120),
        ('Loan Repayment Due', 'Monthly loan repayment collection', 'LOAN', '2024-10-15', '09:00', None,
         'Various locations', 1, None, None, 5000.00, 'LOAN_FUND', 'PENDING', None, None, None, False, None, 1440)
    ]
    
    for event in calendar_events:
        cursor.execute("""
            INSERT INTO calendar_events (title, description, event_type, event_date, event_time, end_time,
                                       location, group_id, user_id, meeting_id, amount, fund_type, 
                                       verification_status, meeting_type, attendees_count, total_members,
                                       is_recurring, recurrence_pattern, reminder_minutes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING;
        """, event)
    
    cursor.close()
    print("✅ Comprehensive demo data populated successfully!")

def main():
    print("🎯 Comprehensive Demo Data Population")
    print("=" * 50)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        populate_demo_data(conn)
        
        print(f"\n🎉 Demo data population completed!")
        print(f"\n📊 System now includes:")
        print("  ✅ 8 Users (admin + 7 group members)")
        print("  ✅ 2 Savings Groups with different focuses")
        print("  ✅ 12 Group Members across both groups")
        print("  ✅ 5 Meetings (3 completed, 2 scheduled)")
        print("  ✅ 4 Calendar Events with MS Teams-like features")
        print("  ✅ Officer assignments and group leadership")
        print("  ✅ Financial tracking and balances")
        
        print(f"\n🔗 All data is interconnected:")
        print("  • Users linked to group memberships")
        print("  • Groups have assigned officers")
        print("  • Meetings linked to groups and officers")
        print("  • Calendar events for scheduling")
        print("  • Financial balances tracked")
        print("  • Enhanced Meeting Activities ready")
        
    except psycopg2.Error as e:
        print(f"❌ Demo data population failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
