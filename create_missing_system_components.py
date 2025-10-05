#!/usr/bin/env python3
"""
🔍 Complete System Migration - ALL Missing Components
Creates ALL remaining tables and components for the comprehensive microfinance system
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

def create_missing_core_tables(conn):
    """Create all missing core system tables"""
    cursor = conn.cursor()
    
    print("🏗️ Creating ALL missing system components...")
    
    # 1. Saving Types Table
    print("  • Creating saving_types table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saving_types (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            minimum_amount DECIMAL(10,2) DEFAULT 0.00,
            maximum_amount DECIMAL(12,2),
            is_mandatory BOOLEAN DEFAULT FALSE,
            frequency VARCHAR(20) DEFAULT 'WEEKLY',
            penalty_rate DECIMAL(5,2) DEFAULT 0.00,
            is_active BOOLEAN DEFAULT TRUE,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_saving_frequency CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL')),
            CONSTRAINT check_positive_amounts CHECK (minimum_amount >= 0 AND (maximum_amount IS NULL OR maximum_amount > minimum_amount))
        );
    """)
    
    # 2. Saving Transactions Table
    print("  • Creating saving_transactions table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saving_transactions (
            id SERIAL PRIMARY KEY,
            member_saving_id INTEGER NOT NULL REFERENCES member_savings(id) ON DELETE CASCADE,
            transaction_type VARCHAR(20) NOT NULL,
            amount DECIMAL(12,2) NOT NULL,
            transaction_date DATE NOT NULL,
            payment_method VARCHAR(50) DEFAULT 'CASH',
            mobile_money_reference VARCHAR(100),
            bank_reference VARCHAR(100),
            receipt_number VARCHAR(100),
            balance_before DECIMAL(12,2),
            balance_after DECIMAL(12,2),
            recorded_by INTEGER REFERENCES users(id),
            verified_by INTEGER REFERENCES users(id),
            verification_date TIMESTAMP,
            notes TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_transaction_type CHECK (transaction_type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PENALTY', 'BONUS')),
            CONSTRAINT check_positive_amount CHECK (amount > 0),
            CONSTRAINT check_payment_method CHECK (payment_method IN ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHECK'))
        );
    """)
    
    # 3. Group Cashbook Table
    print("  • Creating group_cashbook table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS group_cashbook (
            id SERIAL PRIMARY KEY,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id) ON DELETE CASCADE,
            transaction_date DATE NOT NULL,
            transaction_type VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            debit_amount DECIMAL(15,2) DEFAULT 0.00,
            credit_amount DECIMAL(15,2) DEFAULT 0.00,
            running_balance DECIMAL(15,2) NOT NULL,
            category VARCHAR(50) NOT NULL,
            reference_number VARCHAR(100),
            member_id INTEGER REFERENCES group_members(id),
            meeting_id INTEGER REFERENCES meetings(id),
            recorded_by INTEGER NOT NULL REFERENCES users(id),
            approved_by INTEGER REFERENCES users(id),
            approval_date TIMESTAMP,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_transaction_type CHECK (transaction_type IN ('SAVINGS_COLLECTION', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FINE_COLLECTION', 'EXPENSE', 'INTEREST_EARNED', 'BANK_CHARGES', 'TRANSFER')),
            CONSTRAINT check_category CHECK (category IN ('SAVINGS', 'LOANS', 'FINES', 'EXPENSES', 'INCOME', 'TRANSFERS')),
            CONSTRAINT check_amounts CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0))
        );
    """)
    
    # 4. Loan Assessments Table (Enhanced)
    print("  • Creating loan_assessments table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS loan_assessments (
            id SERIAL PRIMARY KEY,
            member_id INTEGER NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            assessment_date DATE DEFAULT CURRENT_DATE,
            total_savings DECIMAL(12,2) NOT NULL,
            months_active INTEGER NOT NULL,
            attendance_rate DECIMAL(5,2) NOT NULL,
            payment_consistency DECIMAL(5,2) NOT NULL,
            outstanding_fines DECIMAL(10,2) DEFAULT 0.00,
            eligibility_score DECIMAL(5,2) NOT NULL,
            is_eligible BOOLEAN DEFAULT FALSE,
            max_loan_amount DECIMAL(12,2) DEFAULT 0.00,
            recommended_term_months INTEGER,
            risk_level VARCHAR(20) NOT NULL,
            risk_factors TEXT,
            assessment_notes TEXT,
            recommendations TEXT,
            assessed_by INTEGER NOT NULL REFERENCES users(id),
            valid_until DATE,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_risk_level CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
            CONSTRAINT check_positive_amounts CHECK (total_savings >= 0 AND max_loan_amount >= 0),
            CONSTRAINT check_percentages CHECK (attendance_rate >= 0 AND attendance_rate <= 100 AND payment_consistency >= 0 AND payment_consistency <= 100)
        );
    """)
    
    # 5. Loan Repayment Schedule Table
    print("  • Creating loan_repayment_schedule table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS loan_repayment_schedule (
            id SERIAL PRIMARY KEY,
            loan_id INTEGER NOT NULL REFERENCES group_loans(id) ON DELETE CASCADE,
            installment_number INTEGER NOT NULL,
            due_date DATE NOT NULL,
            principal_amount DECIMAL(12,2) NOT NULL,
            interest_amount DECIMAL(12,2) NOT NULL,
            total_amount DECIMAL(12,2) NOT NULL,
            amount_paid DECIMAL(12,2) DEFAULT 0.00,
            payment_date DATE,
            status VARCHAR(20) DEFAULT 'PENDING',
            late_fee DECIMAL(10,2) DEFAULT 0.00,
            payment_method VARCHAR(50),
            payment_reference VARCHAR(100),
            recorded_by INTEGER REFERENCES users(id),
            notes TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_status CHECK (status IN ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'WAIVED')),
            CONSTRAINT check_positive_amounts CHECK (principal_amount > 0 AND interest_amount >= 0 AND total_amount > 0 AND amount_paid >= 0),
            UNIQUE(loan_id, installment_number)
        );
    """)
    
    # 6. Target Savings Campaigns Table
    print("  • Creating target_savings_campaigns table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS target_savings_campaigns (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            target_amount DECIMAL(12,2) NOT NULL,
            target_date DATE NOT NULL,
            minimum_contribution DECIMAL(10,2),
            maximum_contribution DECIMAL(10,2),
            contribution_frequency VARCHAR(20) DEFAULT 'WEEKLY',
            minimum_participation_rate DECIMAL(5,2) DEFAULT 70.00,
            completion_bonus_rate DECIMAL(5,2) DEFAULT 0.00,
            early_completion_bonus DECIMAL(5,2) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'DRAFT',
            is_public BOOLEAN DEFAULT TRUE,
            created_by INTEGER NOT NULL REFERENCES users(id),
            start_date DATE,
            end_date DATE,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_target_amount CHECK (target_amount > 0),
            CONSTRAINT check_participation_rate CHECK (minimum_participation_rate >= 0 AND minimum_participation_rate <= 100),
            CONSTRAINT check_bonus_rates CHECK (completion_bonus_rate >= 0 AND completion_bonus_rate <= 100 AND early_completion_bonus >= 0 AND early_completion_bonus <= 100),
            CONSTRAINT check_status CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
            CONSTRAINT check_frequency CHECK (contribution_frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'))
        );
    """)
    
    # 7. Group Target Campaigns Table
    print("  • Creating group_target_campaigns table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS group_target_campaigns (
            id SERIAL PRIMARY KEY,
            campaign_id INTEGER NOT NULL REFERENCES target_savings_campaigns(id) ON DELETE CASCADE,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id) ON DELETE CASCADE,
            status VARCHAR(50) DEFAULT 'PROPOSED',
            proposed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            voting_deadline TIMESTAMP,
            decision_date TIMESTAMP,
            start_date DATE,
            end_date DATE,
            target_amount DECIMAL(12,2) NOT NULL,
            amount_collected DECIMAL(12,2) DEFAULT 0.00,
            participation_count INTEGER DEFAULT 0,
            total_eligible_members INTEGER DEFAULT 0,
            completion_percentage DECIMAL(5,2) DEFAULT 0.00,
            is_completed BOOLEAN DEFAULT FALSE,
            completion_date DATE,
            bonus_distributed DECIMAL(12,2) DEFAULT 0.00,
            notes TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_status CHECK (status IN ('PROPOSED', 'VOTING', 'ACCEPTED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
            CONSTRAINT check_positive_amounts CHECK (target_amount > 0 AND amount_collected >= 0),
            CONSTRAINT check_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
            UNIQUE(campaign_id, group_id)
        );
    """)
    
    # 8. Member Campaign Participation Table
    print("  • Creating member_campaign_participation table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS member_campaign_participation (
            id SERIAL PRIMARY KEY,
            group_campaign_id INTEGER NOT NULL REFERENCES group_target_campaigns(id) ON DELETE CASCADE,
            member_id INTEGER NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            participation_status VARCHAR(20) DEFAULT 'ENROLLED',
            enrollment_date DATE DEFAULT CURRENT_DATE,
            target_contribution DECIMAL(12,2),
            total_contributed DECIMAL(12,2) DEFAULT 0.00,
            contribution_count INTEGER DEFAULT 0,
            last_contribution_date DATE,
            completion_percentage DECIMAL(5,2) DEFAULT 0.00,
            is_completed BOOLEAN DEFAULT FALSE,
            completion_date DATE,
            bonus_earned DECIMAL(10,2) DEFAULT 0.00,
            notes TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_participation_status CHECK (participation_status IN ('ENROLLED', 'ACTIVE', 'COMPLETED', 'WITHDRAWN', 'SUSPENDED')),
            CONSTRAINT check_positive_amounts CHECK (total_contributed >= 0 AND contribution_count >= 0),
            CONSTRAINT check_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
            UNIQUE(group_campaign_id, member_id)
        );
    """)
    
    # 9. Campaign Votes Table
    print("  • Creating campaign_votes table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campaign_votes (
            id SERIAL PRIMARY KEY,
            group_campaign_id INTEGER NOT NULL REFERENCES group_target_campaigns(id) ON DELETE CASCADE,
            member_id INTEGER NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            vote VARCHAR(20) NOT NULL,
            vote_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            vote_reason TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_vote CHECK (vote IN ('FOR', 'AGAINST', 'ABSTAIN')),
            UNIQUE(group_campaign_id, member_id)
        );
    """)
    
    # 10. Notifications Table
    print("  • Creating notifications table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            group_id INTEGER REFERENCES savings_groups(id) ON DELETE CASCADE,
            notification_type VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            priority VARCHAR(20) DEFAULT 'NORMAL',
            is_read BOOLEAN DEFAULT FALSE,
            read_date TIMESTAMP,
            action_url VARCHAR(500),
            action_data TEXT,
            expires_at TIMESTAMP,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_notification_type CHECK (notification_type IN ('MEETING_REMINDER', 'PAYMENT_DUE', 'LOAN_APPROVED', 'FINE_IMPOSED', 'CAMPAIGN_STARTED', 'SYSTEM_ALERT', 'GENERAL')),
            CONSTRAINT check_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
        );
    """)
    
    cursor.close()
    print("✅ All missing core tables created successfully!")

def create_advanced_system_tables(conn):
    """Create advanced system tables for governance and analytics"""
    cursor = conn.cursor()
    
    print("🏛️ Creating advanced system components...")
    
    # 11. Group Constitution Table
    print("  • Creating group_constitution table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS group_constitution (
            id SERIAL PRIMARY KEY,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id) ON DELETE CASCADE,
            version_number INTEGER DEFAULT 1,
            constitution_text TEXT NOT NULL,
            effective_date DATE NOT NULL,
            approved_date DATE,
            approved_by_members INTEGER DEFAULT 0,
            total_eligible_voters INTEGER DEFAULT 0,
            approval_percentage DECIMAL(5,2) DEFAULT 0.00,
            is_active BOOLEAN DEFAULT TRUE,
            created_by INTEGER NOT NULL REFERENCES users(id),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_positive_numbers CHECK (approved_by_members >= 0 AND total_eligible_voters >= 0),
            CONSTRAINT check_approval_percentage CHECK (approval_percentage >= 0 AND approval_percentage <= 100)
        );
    """)
    
    # 12. Services Table (for system admin)
    print("  • Creating services table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS services (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            service_type VARCHAR(50) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            endpoint_url VARCHAR(255),
            api_version VARCHAR(20),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_service_type CHECK (service_type IN ('CORE', 'ANALYTICS', 'REPORTING', 'INTEGRATION', 'MONITORING'))
        );
    """)
    
    # 13. User Service Permissions Table
    print("  • Creating user_service_permissions table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_service_permissions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
            permissions VARCHAR(255) DEFAULT 'read',
            granted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by INTEGER REFERENCES users(id),
            expires_at TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, service_id)
        );
    """)
    
    # 14. Service Admins Table
    print("  • Creating service_admins table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS service_admins (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
            admin_level VARCHAR(20) DEFAULT 'BASIC',
            assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            assigned_by INTEGER REFERENCES users(id),
            is_active BOOLEAN DEFAULT TRUE,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_admin_level CHECK (admin_level IN ('BASIC', 'ADVANCED', 'FULL')),
            UNIQUE(user_id, service_id)
        );
    """)
    
    # 15. Service Access Requests Table
    print("  • Creating service_access_requests table...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS service_access_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
            requested_permissions VARCHAR(255) NOT NULL,
            justification TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'PENDING',
            request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_by INTEGER REFERENCES users(id),
            review_date TIMESTAMP,
            review_notes TEXT,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT check_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'))
        );
    """)
    
    cursor.close()
    print("✅ Advanced system tables created successfully!")

def main():
    print("🔍 Complete System Migration - ALL Missing Components")
    print("=" * 70)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        # Create all missing core tables
        create_missing_core_tables(conn)
        
        # Create advanced system tables
        create_advanced_system_tables(conn)
        
        print(f"\n🎉 Complete system migration completed!")
        print(f"\n📋 ALL missing components now created:")
        print("  ✅ saving_types - Configurable saving categories")
        print("  ✅ saving_transactions - Individual transaction history")
        print("  ✅ group_cashbook - Complete financial ledger")
        print("  ✅ loan_assessments - Automated eligibility scoring")
        print("  ✅ loan_repayment_schedule - Detailed payment tracking")
        print("  ✅ target_savings_campaigns - Admin-created campaigns")
        print("  ✅ group_target_campaigns - Group campaign participation")
        print("  ✅ member_campaign_participation - Individual participation")
        print("  ✅ campaign_votes - Democratic campaign voting")
        print("  ✅ notifications - System-wide notifications")
        print("  ✅ group_constitution - Group governance documents")
        print("  ✅ services - System admin service management")
        print("  ✅ user_service_permissions - Role-based access control")
        print("  ✅ service_admins - Service administration")
        print("  ✅ service_access_requests - Access request workflow")
        
        print(f"\n🔗 System now supports:")
        print("  • Complete financial transaction tracking")
        print("  • Advanced loan assessment and repayment")
        print("  • Target savings campaigns with voting")
        print("  • Comprehensive notification system")
        print("  • Group governance and constitution management")
        print("  • System administration and access control")
        print("  • User profile and analytics data")
        
    except psycopg2.Error as e:
        print(f"❌ Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
