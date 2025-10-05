#!/usr/bin/env python3
"""
📊 Populate Demo Data for Savings Cycle System
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

def populate_cycle_data(conn):
    """Populate demo data for the cycle system"""
    cursor = conn.cursor()
    
    print("📊 Populating savings cycle demo data...")
    
    # Get existing groups
    cursor.execute("SELECT id, name FROM savings_groups ORDER BY id")
    groups = cursor.fetchall()
    
    regions = ['Central', 'Eastern', 'Northern', 'Western', 'Southern']
    districts = ['Kampala', 'Wakiso', 'Mukono', 'Jinja', 'Mbale', 'Gulu', 'Lira', 'Mbarara', 'Kasese']
    
    for i, group in enumerate(groups):
        group_id = group[0]
        group_name = group[1]
        region = regions[i % len(regions)]
        district = districts[i % len(districts)]
        
        # Update group with geographic and cycle data
        cursor.execute("""
            UPDATE savings_groups SET 
                region = %s,
                district = %s,
                parish = %s,
                village = %s,
                current_cycle_number = %s,
                cycle_duration_months = %s,
                current_cycle_start_date = %s,
                current_cycle_end_date = %s,
                next_shareout_date = %s,
                total_cycles_completed = %s,
                credit_score = %s,
                is_in_third_year = %s,
                passbook_status = %s,
                ledger_status = %s
            WHERE id = %s
        """, (
            region,
            district,
            f"{district} Parish {i+1}",
            f"{group_name} Village",
            random.randint(1, 4),
            random.choice([6, 12, 18, 24]),
            date.today() - timedelta(days=random.randint(30, 300)),
            date.today() + timedelta(days=random.randint(30, 200)),
            date.today() + timedelta(days=random.randint(60, 250)),
            random.randint(0, 3),
            random.uniform(60, 95),
            random.choice([True, False]),
            random.choice(['CURRENT', 'NEEDS_UPDATE', 'EXCELLENT']),
            random.choice(['CURRENT', 'NEEDS_UPDATE', 'EXCELLENT'])
        ))
        
        # Create savings cycle records
        for cycle_num in range(1, random.randint(2, 4)):
            start_date = date.today() - timedelta(days=365 * cycle_num)
            end_date = start_date + timedelta(days=365)
            
            cursor.execute("""
                INSERT INTO savings_cycles (
                    group_id, cycle_number, start_date, end_date, planned_shareout_date,
                    actual_shareout_date, status, total_savings_collected, total_interest_earned,
                    total_fines_collected, member_retention_rate, average_attendance_rate,
                    loan_repayment_rate, created_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                group_id, cycle_num, start_date, end_date, end_date,
                end_date if cycle_num < 3 else None,
                'COMPLETED' if cycle_num < 3 else 'ACTIVE',
                random.uniform(500000, 2000000),
                random.uniform(50000, 200000),
                random.uniform(10000, 50000),
                random.uniform(80, 100),
                random.uniform(70, 95),
                random.uniform(85, 100),
                1
            ))
        
        # Create financial literacy training records
        training_types = ['BASIC', 'INTERMEDIATE', 'ADVANCED']
        for j, training_type in enumerate(training_types[:random.randint(1, 3)]):
            cursor.execute("""
                INSERT INTO financial_literacy_training (
                    group_id, training_name, training_type, training_date, duration_hours,
                    trainer_name, total_members_invited, total_members_attended,
                    completion_rate, topics_covered, assessment_conducted,
                    certificates_issued, status, recorded_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                group_id,
                f"{training_type.title()} Financial Literacy Training",
                training_type,
                date.today() - timedelta(days=random.randint(30, 365)),
                random.uniform(4, 16),
                f"Trainer {random.randint(1, 10)}",
                random.randint(8, 15),
                random.randint(6, 12),
                random.uniform(75, 100),
                "Savings, Loans, Business Planning, Record Keeping",
                True,
                random.randint(5, 10),
                'COMPLETED',
                1
            ))
    
    # Update member attendance data
    cursor.execute("SELECT id FROM group_members ORDER BY id")
    members = cursor.fetchall()
    
    for member in members:
        member_id = member[0]
        total_eligible = random.randint(20, 50)
        total_attended = random.randint(int(total_eligible * 0.5), total_eligible)
        attendance_pct = (total_attended / total_eligible) * 100
        
        cursor.execute("""
            UPDATE group_members SET
                total_meetings_eligible = %s,
                total_meetings_attended = %s,
                attendance_percentage = %s,
                consecutive_absences = %s,
                last_attendance_date = %s,
                is_eligible_for_loans = %s,
                loan_eligibility_reason = %s
            WHERE id = %s
        """, (
            total_eligible,
            total_attended,
            attendance_pct,
            random.randint(0, 3),
            date.today() - timedelta(days=random.randint(1, 30)),
            attendance_pct >= 50,
            f"Attendance rate: {attendance_pct:.1f}%" if attendance_pct >= 50 else f"Below 50% attendance ({attendance_pct:.1f}%)"
        ))
    
    cursor.close()
    print("✅ Savings cycle demo data populated successfully!")

def main():
    print("📊 Populating Savings Cycle Demo Data")
    print("=" * 50)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        populate_cycle_data(conn)
        
        print(f"\n🎉 Demo data population completed!")
        print(f"\n✅ POPULATED:")
        print("  🌍 Geographic data for all groups")
        print("  🔄 Savings cycle records")
        print("  📚 Financial literacy training records")
        print("  📅 Member attendance tracking data")
        print("  📊 Credit scoring and cycle completion data")
        
    except psycopg2.Error as e:
        print(f"❌ Demo data population failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
