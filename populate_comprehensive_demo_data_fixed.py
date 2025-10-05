#!/usr/bin/env python3
"""
📊 Complete Demo Data Population - Fixed Version
Creates realistic demo data for ALL system components with proper interconnections
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from datetime import datetime, date, timedelta
from decimal import Decimal
import random
import json

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

def populate_all_missing_data(conn):
    """Populate all missing demo data"""
    cursor = conn.cursor()
    
    print("📊 Populating ALL missing demo data...")
    
    # 1. Create saving types
    print("  • Creating saving types...")
    saving_types = [
        ('Personal Savings', 'Individual member savings account', 1000.00, 50000.00, True, 'WEEKLY', 5.00),
        ('ECD Fund', 'Early Childhood Development fund contribution', 500.00, 10000.00, True, 'MONTHLY', 10.00),
        ('Social Fund', 'Community social activities and welfare', 200.00, 5000.00, False, 'WEEKLY', 0.00),
        ('Emergency Fund', 'Group emergency and crisis response fund', 1000.00, 20000.00, True, 'MONTHLY', 15.00),
        ('Target Savings', 'Goal-oriented savings for specific purposes', 500.00, None, False, 'WEEKLY', 0.00)
    ]
    
    for saving_type in saving_types:
        cursor.execute("""
            INSERT INTO saving_types (name, description, minimum_amount, maximum_amount, 
                                    is_mandatory, frequency, penalty_rate)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO NOTHING;
        """, saving_type)
    
    # 2. Create target savings campaigns
    print("  • Creating target savings campaigns...")
    campaigns = [
        ('Community Water Project', 'Build a borehole for clean water access', 500000.00, 
         date.today() + timedelta(days=180), 2000.00, 10000.00, 'WEEKLY', 80.00, 5.00, 10.00),
        ('School Building Fund', 'Construct additional classrooms for local school', 1000000.00,
         date.today() + timedelta(days=365), 5000.00, 20000.00, 'MONTHLY', 75.00, 3.00, 7.00),
        ('Medical Equipment Fund', 'Purchase medical equipment for health center', 300000.00,
         date.today() + timedelta(days=120), 1000.00, 8000.00, 'WEEKLY', 70.00, 2.00, 5.00)
    ]
    
    for campaign in campaigns:
        cursor.execute("""
            INSERT INTO target_savings_campaigns (name, description, target_amount, target_date,
                                                 minimum_contribution, maximum_contribution, 
                                                 contribution_frequency, minimum_participation_rate,
                                                 completion_bonus_rate, early_completion_bonus,
                                                 status, created_by, start_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (*campaign, 'ACTIVE', 1, date.today()))
    
    # 3. Create services for system admin
    print("  • Creating system services...")
    services = [
        ('User Management', 'User registration and authentication service', 'CORE', True, '/api/users', 'v1'),
        ('Savings Groups', 'Savings group management and operations', 'CORE', True, '/api/groups', 'v1'),
        ('Financial Analytics', 'Financial reporting and analytics dashboard', 'ANALYTICS', True, '/api/analytics', 'v1'),
        ('Loan Management', 'Loan processing and repayment tracking', 'CORE', True, '/api/loans', 'v1'),
        ('Campaign Management', 'Target savings campaign administration', 'CORE', True, '/api/campaigns', 'v1'),
        ('System Monitoring', 'System health and performance monitoring', 'MONITORING', True, '/api/monitoring', 'v1')
    ]
    
    for service in services:
        cursor.execute("""
            INSERT INTO services (name, description, service_type, is_active, endpoint_url, api_version)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO NOTHING;
        """, service)
    
    # 4. Create loan assessments for members
    print("  • Creating loan assessments...")
    cursor.execute("SELECT id FROM group_members ORDER BY id LIMIT 10")
    member_ids = [row[0] for row in cursor.fetchall()]
    
    for member_id in member_ids:
        cursor.execute("""
            INSERT INTO loan_assessments (member_id, total_savings, months_active, 
                                        attendance_rate, payment_consistency, outstanding_fines,
                                        eligibility_score, is_eligible, max_loan_amount, 
                                        recommended_term_months, risk_level, assessed_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (
            member_id,
            random.uniform(50000, 200000),
            random.randint(6, 24),
            random.uniform(70, 100),
            random.uniform(80, 100),
            random.uniform(0, 5000),
            random.uniform(60, 95),
            random.choice([True, False]),
            random.uniform(100000, 500000),
            random.choice([6, 12, 18, 24]),
            random.choice(['LOW', 'MEDIUM', 'HIGH']),
            1
        ))
    
    # 5. Create group target campaigns
    print("  • Creating group target campaigns...")
    cursor.execute("SELECT id FROM target_savings_campaigns ORDER BY id")
    campaign_ids = [row[0] for row in cursor.fetchall()]
    
    cursor.execute("SELECT id FROM savings_groups ORDER BY id")
    group_ids = [row[0] for row in cursor.fetchall()]
    
    for campaign_id in campaign_ids:
        for group_id in group_ids:
            cursor.execute("""
                INSERT INTO group_target_campaigns (campaign_id, group_id, status, target_amount,
                                                  amount_collected, participation_count, 
                                                  total_eligible_members, start_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                campaign_id,
                group_id,
                random.choice(['ACTIVE', 'VOTING', 'PROPOSED']),
                random.uniform(100000, 300000),
                random.uniform(10000, 50000),
                random.randint(3, 8),
                random.randint(5, 12),
                date.today() - timedelta(days=random.randint(1, 30))
            ))
    
    # 6. Create member campaign participation
    print("  • Creating member campaign participation...")
    cursor.execute("SELECT id FROM group_target_campaigns ORDER BY id")
    group_campaign_ids = [row[0] for row in cursor.fetchall()]
    
    for group_campaign_id in group_campaign_ids:
        for member_id in member_ids[:random.randint(3, 8)]:
            cursor.execute("""
                INSERT INTO member_campaign_participation (group_campaign_id, member_id,
                                                         participation_status, target_contribution,
                                                         total_contributed, contribution_count,
                                                         completion_percentage)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (
                group_campaign_id,
                member_id,
                random.choice(['ACTIVE', 'ENROLLED', 'COMPLETED']),
                random.uniform(5000, 15000),
                random.uniform(1000, 8000),
                random.randint(1, 10),
                random.uniform(20, 100)
            ))
    
    # 7. Create campaign votes
    print("  • Creating campaign votes...")
    for group_campaign_id in group_campaign_ids:
        for member_id in member_ids[:random.randint(4, 8)]:
            cursor.execute("""
                INSERT INTO campaign_votes (group_campaign_id, member_id, vote, vote_reason)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (
                group_campaign_id,
                member_id,
                random.choice(['FOR', 'AGAINST', 'ABSTAIN']),
                random.choice([
                    'Good initiative for community development',
                    'Timeline seems too ambitious',
                    'Need more information before deciding',
                    'Fully support this project',
                    'Concerned about financial commitment'
                ])
            ))
    
    # 8. Create notifications
    print("  • Creating notifications...")
    cursor.execute("SELECT id FROM users ORDER BY id")
    user_ids = [row[0] for row in cursor.fetchall()]
    
    notification_types = [
        ('MEETING_REMINDER', 'Weekly Meeting Tomorrow', 'Don\'t forget about tomorrow\'s weekly meeting at 2:00 PM', 'NORMAL'),
        ('PAYMENT_DUE', 'Loan Payment Due', 'Your loan payment of 15,000 is due in 3 days', 'HIGH'),
        ('LOAN_APPROVED', 'Loan Application Approved', 'Congratulations! Your loan application has been approved', 'HIGH'),
        ('FINE_IMPOSED', 'Fine Imposed', 'A fine of 1,000 has been imposed for missing last meeting', 'NORMAL'),
        ('CAMPAIGN_STARTED', 'New Campaign Started', 'Community Water Project campaign has started. Join now!', 'NORMAL'),
        ('SYSTEM_ALERT', 'System Maintenance', 'System will be under maintenance tonight from 11 PM to 2 AM', 'LOW')
    ]
    
    for user_id in user_ids:
        for group_id in group_ids:
            for _ in range(random.randint(2, 4)):
                notification = random.choice(notification_types)
                cursor.execute("""
                    INSERT INTO notifications (user_id, group_id, notification_type, title, 
                                             message, priority, is_read, expires_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                """, (
                    user_id,
                    group_id,
                    notification[0],
                    notification[1],
                    notification[2],
                    notification[3],
                    random.choice([True, False]),
                    datetime.now() + timedelta(days=random.randint(1, 30))
                ))
    
    # 9. Create group cashbook entries
    print("  • Creating group cashbook entries...")
    for group_id in group_ids:
        running_balance = 100000  # Starting balance
        for i in range(random.randint(15, 25)):
            transaction_date = date.today() - timedelta(days=random.randint(1, 90))
            transaction_type = random.choice(['SAVINGS_COLLECTION', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FINE_COLLECTION'])
            
            if transaction_type in ['SAVINGS_COLLECTION', 'LOAN_REPAYMENT', 'FINE_COLLECTION']:
                credit_amount = random.uniform(5000, 50000)
                debit_amount = 0
                running_balance += credit_amount
            else:
                debit_amount = random.uniform(10000, 100000)
                credit_amount = 0
                running_balance -= debit_amount
            
            cursor.execute("""
                INSERT INTO group_cashbook (group_id, transaction_date, transaction_type,
                                          description, debit_amount, credit_amount, 
                                          running_balance, category, recorded_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
            """, (
                group_id,
                transaction_date,
                transaction_type,
                f"{transaction_type.replace('_', ' ').title()} transaction",
                debit_amount,
                credit_amount,
                running_balance,
                random.choice(['SAVINGS', 'LOANS', 'FINES', 'EXPENSES']),
                1
            ))
    
    # 10. Create group constitutions
    print("  • Creating group constitutions...")
    for group_id in group_ids:
        constitution_text = f"""
        CONSTITUTION OF SAVINGS GROUP {group_id}
        
        ARTICLE 1: PURPOSE
        This group is formed to promote savings, provide loans, and support community development.
        
        ARTICLE 2: MEMBERSHIP
        - Minimum 5 members, maximum 30 members
        - Monthly contribution of at least 5,000 currency units
        - Regular attendance at meetings required
        
        ARTICLE 3: LEADERSHIP
        - Chairperson, Treasurer, and Secretary elected annually
        - Leadership positions require minimum 6 months membership
        
        ARTICLE 4: FINANCIAL RULES
        - Loans up to 3x individual savings balance
        - Interest rate of 10% per month
        - Maximum loan term of 12 months
        
        ARTICLE 5: MEETINGS
        - Weekly meetings every Wednesday at 2:00 PM
        - Quorum of 60% required for decisions
        - Fines for absence: 1,000 currency units
        """
        
        cursor.execute("""
            INSERT INTO group_constitution (group_id, constitution_text, effective_date,
                                          approved_by_members, total_eligible_voters,
                                          approval_percentage, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, (
            group_id,
            constitution_text,
            date.today() - timedelta(days=random.randint(30, 180)),
            random.randint(5, 12),
            random.randint(7, 15),
            random.uniform(75, 95),
            1
        ))
    
    cursor.close()
    print("✅ All missing demo data populated successfully!")

def main():
    print("📊 Complete Demo Data Population - Fixed Version")
    print("=" * 60)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        populate_all_missing_data(conn)
        
        print(f"\n🎉 Complete demo data population completed!")
        print(f"\n📊 System now includes comprehensive data for:")
        print("  ✅ 5 Saving types with different rules")
        print("  ✅ 3 Target savings campaigns")
        print("  ✅ 6 System services for admin")
        print("  ✅ 10 Loan assessments with scoring")
        print("  ✅ Group target campaigns with voting")
        print("  ✅ Member campaign participation")
        print("  ✅ Campaign voting records")
        print("  ✅ System notifications")
        print("  ✅ Group financial cashbook")
        print("  ✅ Group constitutions")
        
        print(f"\n🔗 All components are interconnected with:")
        print("  • Automatic balance calculations")
        print("  • Member participation tracking")
        print("  • Democratic voting systems")
        print("  • Complete audit trails")
        print("  • Real-time notifications")
        print("  • User profile analytics")
        
    except psycopg2.Error as e:
        print(f"❌ Demo data population failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
