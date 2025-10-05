#!/usr/bin/env python3
"""
🏦 Complete Microfinance System Database Setup
Creates all tables needed for a comprehensive savings group management system
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from datetime import datetime, date, timedelta
from decimal import Decimal
import random

# Database connection details
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

def create_core_system_tables(conn):
    """Create all core system tables with proper relationships"""
    cursor = conn.cursor()
    
    print("🏗️ Creating complete microfinance system tables...")
    
    # 1. Users Table (Foundation)
    print("  • Creating users table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(128) UNIQUE NOT NULL,
            email VARCHAR(128) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            active BOOLEAN DEFAULT TRUE,
            admin BOOLEAN DEFAULT FALSE,
            role VARCHAR(50) DEFAULT 'user',
            is_super_admin BOOLEAN DEFAULT FALSE,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)
    
    # 2. Savings Groups Table
    print("  • Creating savings_groups table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS savings_groups (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            location VARCHAR(255),
            meeting_day VARCHAR(20),
            meeting_time TIME,
            meeting_frequency VARCHAR(20) DEFAULT 'WEEKLY',
            state VARCHAR(20) DEFAULT 'FORMING',
            max_members INTEGER DEFAULT 30,
            members_count INTEGER DEFAULT 0,
            savings_balance DECIMAL(15,2) DEFAULT 0.00,
            loan_fund_balance DECIMAL(15,2) DEFAULT 0.00,
            created_by INTEGER REFERENCES users(id),
            chair_member_id INTEGER,
            treasurer_member_id INTEGER,
            secretary_member_id INTEGER,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_valid_state CHECK (state IN ('FORMING', 'ACTIVE', 'MATURE', 'ELIGIBLE_FOR_LOAN', 'LOAN_ACTIVE', 'CLOSED')),
            CONSTRAINT check_positive_balance CHECK (savings_balance >= 0)
        );
    """)
    
    # 3. Group Members Table
    print("  • Creating group_members table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS group_members (
            id SERIAL PRIMARY KEY,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id),
            name VARCHAR(255) NOT NULL,
            gender VARCHAR(10) NOT NULL,
            phone VARCHAR(20),
            joined_date DATE NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            share_balance DECIMAL(12,2) DEFAULT 0.00,
            total_contributions DECIMAL(12,2) DEFAULT 0.00,
            role VARCHAR(50) DEFAULT 'MEMBER',
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_gender CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
            CONSTRAINT check_role CHECK (role IN ('MEMBER', 'OFFICER', 'FOUNDER')),
            UNIQUE(group_id, user_id)
        );
    """)
    
    # 4. Meetings Table
    print("  • Creating meetings table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meetings (
            id SERIAL PRIMARY KEY,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id) ON DELETE CASCADE,
            meeting_date DATE NOT NULL,
            meeting_time TIME,
            location VARCHAR(255),
            meeting_type VARCHAR(20) DEFAULT 'REGULAR',
            status VARCHAR(20) DEFAULT 'SCHEDULED',
            agenda TEXT,
            minutes TEXT,
            total_savings_collected DECIMAL(12,2) DEFAULT 0.00,
            total_loans_disbursed DECIMAL(12,2) DEFAULT 0.00,
            total_fines_collected DECIMAL(12,2) DEFAULT 0.00,
            members_present INTEGER DEFAULT 0,
            members_absent INTEGER DEFAULT 0,
            chairperson_id INTEGER REFERENCES group_members(id),
            secretary_id INTEGER REFERENCES group_members(id),
            treasurer_id INTEGER REFERENCES group_members(id),
            created_by INTEGER REFERENCES users(id),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_meeting_type CHECK (meeting_type IN ('REGULAR', 'SPECIAL', 'ANNUAL', 'EMERGENCY')),
            CONSTRAINT check_status CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
        );
    """)
    
    # 5. Calendar Events Table (MS Teams-like scheduling)
    print("  • Creating calendar_events table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS calendar_events (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            event_type VARCHAR(50) NOT NULL,
            event_date DATE NOT NULL,
            event_time TIME,
            end_time TIME,
            location VARCHAR(255),
            group_id INTEGER REFERENCES savings_groups(id),
            user_id INTEGER REFERENCES users(id),
            meeting_id INTEGER REFERENCES meetings(id),
            amount DECIMAL(15,2),
            fund_type VARCHAR(20),
            verification_status VARCHAR(20),
            member_gender VARCHAR(10),
            meeting_type VARCHAR(20),
            attendees_count INTEGER,
            total_members INTEGER,
            is_recurring BOOLEAN DEFAULT FALSE,
            recurrence_pattern VARCHAR(50),
            reminder_minutes INTEGER DEFAULT 30,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_event_type CHECK (event_type IN ('MEETING', 'SAVINGS', 'LOAN', 'TRAINING', 'SOCIAL', 'OTHER'))
        );
    """)
    
    # 6. Meeting Attendance Table
    print("  • Creating meeting_attendance table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meeting_attendance (
            id SERIAL PRIMARY KEY,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id),
            member_id INTEGER NOT NULL REFERENCES group_members(id),
            meeting_id INTEGER REFERENCES meetings(id),
            meeting_date DATE NOT NULL,
            meeting_type VARCHAR(50) NOT NULL,
            attended BOOLEAN NOT NULL,
            attendance_time TIMESTAMP,
            excuse_reason TEXT,
            contributed_to_meeting BOOLEAN DEFAULT FALSE,
            meeting_notes TEXT,
            participation_score DECIMAL(3,1) DEFAULT 0.0,
            participated_in_discussions BOOLEAN DEFAULT FALSE,
            contributed_to_savings BOOLEAN DEFAULT FALSE,
            voted_on_decisions BOOLEAN DEFAULT FALSE,
            recorded_by INTEGER NOT NULL REFERENCES users(id),
            recorded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_meeting_type CHECK (meeting_type IN ('REGULAR', 'SPECIAL', 'ANNUAL')),
            UNIQUE(group_id, member_id, meeting_date)
        );
    """)
    
    # 7. Member Savings Table
    print("  • Creating member_savings table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS member_savings (
            id SERIAL PRIMARY KEY,
            member_id INTEGER NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            saving_type VARCHAR(50) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            transaction_date DATE NOT NULL,
            meeting_id INTEGER REFERENCES meetings(id),
            description TEXT,
            recorded_by INTEGER REFERENCES users(id),
            verified_by INTEGER REFERENCES users(id),
            verification_date TIMESTAMP,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_saving_type CHECK (saving_type IN ('PERSONAL', 'ECD_FUND', 'SOCIAL_FUND', 'TARGET_SAVINGS', 'EMERGENCY_FUND')),
            CONSTRAINT check_positive_amount CHECK (amount > 0)
        );
    """)
    
    # 8. Group Loans Table
    print("  • Creating group_loans table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS group_loans (
            id SERIAL PRIMARY KEY,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id),
            borrower_id INTEGER NOT NULL REFERENCES group_members(id),
            loan_amount DECIMAL(12,2) NOT NULL,
            interest_rate DECIMAL(5,2) NOT NULL,
            loan_term_months INTEGER NOT NULL,
            monthly_payment DECIMAL(12,2) NOT NULL,
            total_repayment DECIMAL(12,2) NOT NULL,
            amount_paid DECIMAL(12,2) DEFAULT 0.00,
            balance_remaining DECIMAL(12,2),
            loan_purpose TEXT,
            status VARCHAR(20) DEFAULT 'PENDING',
            application_date DATE NOT NULL,
            approval_date DATE,
            disbursement_date DATE,
            due_date DATE,
            approved_by INTEGER REFERENCES group_members(id),
            disbursed_by INTEGER REFERENCES group_members(id),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_status CHECK (status IN ('PENDING', 'APPROVED', 'DISBURSED', 'ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED')),
            CONSTRAINT check_positive_amounts CHECK (loan_amount > 0 AND interest_rate >= 0 AND loan_term_months > 0)
        );
    """)
    
    # 9. Member Fines Table
    print("  • Creating member_fines table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS member_fines (
            id SERIAL PRIMARY KEY,
            member_id INTEGER NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            fine_type VARCHAR(50) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            reason TEXT NOT NULL,
            fine_date DATE NOT NULL,
            meeting_id INTEGER REFERENCES meetings(id),
            status VARCHAR(20) DEFAULT 'PENDING',
            paid_amount DECIMAL(10,2) DEFAULT 0.00,
            payment_date DATE,
            imposed_by INTEGER REFERENCES group_members(id),
            recorded_by INTEGER REFERENCES users(id),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_fine_type CHECK (fine_type IN ('LATE_ARRIVAL', 'ABSENCE', 'MISCONDUCT', 'LATE_PAYMENT', 'OTHER')),
            CONSTRAINT check_status CHECK (status IN ('PENDING', 'PAID', 'WAIVED', 'PARTIAL')),
            CONSTRAINT check_positive_amount CHECK (amount > 0)
        );
    """)
    
    # 10. Group Transactions Table (Financial ledger)
    print("  • Creating group_transactions table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS group_transactions (
            id SERIAL PRIMARY KEY,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id),
            member_id INTEGER REFERENCES group_members(id),
            transaction_type VARCHAR(50) NOT NULL,
            amount DECIMAL(15,2) NOT NULL,
            transaction_date DATE NOT NULL,
            meeting_id INTEGER REFERENCES meetings(id),
            description TEXT,
            reference_number VARCHAR(100),
            balance_before DECIMAL(15,2),
            balance_after DECIMAL(15,2),
            recorded_by INTEGER REFERENCES users(id),
            verified_by INTEGER REFERENCES users(id),
            verification_date TIMESTAMP,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_transaction_type CHECK (transaction_type IN ('SAVINGS_DEPOSIT', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FINE_PAYMENT', 'INTEREST_EARNED', 'EXPENSE', 'TRANSFER')),
            CONSTRAINT check_positive_amount CHECK (amount > 0)
        );
    """)
    
    cursor.close()
    print("✅ Core system tables created successfully!")

def add_foreign_key_constraints(conn):
    """Add foreign key constraints that reference other tables"""
    cursor = conn.cursor()
    
    print("🔗 Adding foreign key constraints...")
    
    # Add foreign keys for savings_groups officer positions
    cursor.execute("""
        ALTER TABLE savings_groups 
        ADD CONSTRAINT fk_chair_member 
        FOREIGN KEY (chair_member_id) REFERENCES group_members(id);
    """)
    
    cursor.execute("""
        ALTER TABLE savings_groups 
        ADD CONSTRAINT fk_treasurer_member 
        FOREIGN KEY (treasurer_member_id) REFERENCES group_members(id);
    """)
    
    cursor.execute("""
        ALTER TABLE savings_groups 
        ADD CONSTRAINT fk_secretary_member 
        FOREIGN KEY (secretary_member_id) REFERENCES group_members(id);
    """)
    
    cursor.close()
    print("✅ Foreign key constraints added!")

def create_indexes(conn):
    """Create performance indexes"""
    cursor = conn.cursor()
    
    print("📊 Creating performance indexes...")
    
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);",
        "CREATE INDEX IF NOT EXISTS idx_meetings_group_date ON meetings(group_id, meeting_date);",
        "CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);",
        "CREATE INDEX IF NOT EXISTS idx_calendar_events_group ON calendar_events(group_id);",
        "CREATE INDEX IF NOT EXISTS idx_attendance_meeting ON meeting_attendance(meeting_id);",
        "CREATE INDEX IF NOT EXISTS idx_attendance_member ON meeting_attendance(member_id);",
        "CREATE INDEX IF NOT EXISTS idx_savings_member ON member_savings(member_id);",
        "CREATE INDEX IF NOT EXISTS idx_savings_date ON member_savings(transaction_date);",
        "CREATE INDEX IF NOT EXISTS idx_loans_group ON group_loans(group_id);",
        "CREATE INDEX IF NOT EXISTS idx_loans_borrower ON group_loans(borrower_id);",
        "CREATE INDEX IF NOT EXISTS idx_fines_member ON member_fines(member_id);",
        "CREATE INDEX IF NOT EXISTS idx_transactions_group ON group_transactions(group_id);",
        "CREATE INDEX IF NOT EXISTS idx_transactions_date ON group_transactions(transaction_date);"
    ]
    
    for index_sql in indexes:
        cursor.execute(index_sql)
    
    cursor.close()
    print("✅ Performance indexes created!")

def main():
    print("🏦 Complete Microfinance System Database Setup")
    print("=" * 60)
    
    # Connect to database
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        # Create all core tables
        create_core_system_tables(conn)
        
        # Add foreign key constraints
        try:
            add_foreign_key_constraints(conn)
        except psycopg2.Error as e:
            print(f"⚠️  Foreign key constraints may already exist: {e}")
        
        # Create indexes
        create_indexes(conn)
        
        print(f"\n🎉 Complete microfinance system database setup completed!")
        print(f"\n📋 System includes:")
        print("  ✅ User management and authentication")
        print("  ✅ Savings groups with officer roles")
        print("  ✅ Group members with financial tracking")
        print("  ✅ Meeting scheduling and management")
        print("  ✅ Calendar events (MS Teams-like)")
        print("  ✅ Meeting attendance tracking")
        print("  ✅ Member savings with multiple types")
        print("  ✅ Group loans with repayment tracking")
        print("  ✅ Member fines and penalties")
        print("  ✅ Complete financial transaction ledger")
        print("  ✅ Enhanced Meeting Activities (already created)")
        
        print(f"\n🔗 All tables are properly linked with:")
        print("  • Foreign key relationships")
        print("  • Data integrity constraints")
        print("  • Performance indexes")
        print("  • Audit trails")
        
    except psycopg2.Error as e:
        print(f"❌ Setup failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
