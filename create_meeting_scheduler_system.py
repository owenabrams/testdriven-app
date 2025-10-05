#!/usr/bin/env python3
"""
📅 MS Teams-like Meeting Scheduler System
Creates a comprehensive meeting scheduling system where users can:
- Click on dates to schedule meetings
- Select groups to auto-invite all members
- Plan activities within meetings (savings, loans, fines, voting)
- Separate scheduling calendar from activity viewing calendar
- Complete meeting workflow management
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from datetime import datetime, date, timedelta
from decimal import Decimal
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

def create_meeting_scheduler_tables(conn):
    """Create tables for MS Teams-like meeting scheduling"""
    cursor = conn.cursor()
    
    print("📅 Creating meeting scheduler tables...")
    
    # 1. Meeting Invitations Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meeting_invitations (
            id SERIAL PRIMARY KEY,
            meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
            member_id INTEGER NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            
            -- Invitation details
            invitation_status VARCHAR(20) DEFAULT 'PENDING',
            invited_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            response_date TIMESTAMP,
            response_notes TEXT,
            
            -- Meeting role for this member
            meeting_role VARCHAR(50) DEFAULT 'PARTICIPANT',
            is_required BOOLEAN DEFAULT TRUE,
            can_delegate BOOLEAN DEFAULT FALSE,
            
            -- Notification preferences
            email_notification_sent BOOLEAN DEFAULT FALSE,
            sms_notification_sent BOOLEAN DEFAULT FALSE,
            reminder_sent BOOLEAN DEFAULT FALSE,
            
            -- Audit fields
            invited_by INTEGER NOT NULL REFERENCES users(id),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT check_invitation_status CHECK (invitation_status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE', 'NO_RESPONSE')),
            CONSTRAINT check_meeting_role CHECK (meeting_role IN ('CHAIRPERSON', 'SECRETARY', 'TREASURER', 'PARTICIPANT', 'OBSERVER')),
            UNIQUE(meeting_id, member_id)
        );
    """)
    
    # 2. Planned Meeting Activities Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS planned_meeting_activities (
            id SERIAL PRIMARY KEY,
            meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
            
            -- Activity planning
            activity_order INTEGER NOT NULL,
            activity_name VARCHAR(255) NOT NULL,
            activity_type VARCHAR(50) NOT NULL,
            estimated_duration_minutes INTEGER DEFAULT 15,
            is_mandatory BOOLEAN DEFAULT TRUE,
            
            -- Activity configuration
            activity_config JSONB,  -- Store activity-specific configuration
            expected_participants INTEGER,
            requires_voting BOOLEAN DEFAULT FALSE,
            requires_documentation BOOLEAN DEFAULT FALSE,
            
            -- Financial planning
            estimated_amount DECIMAL(15,2) DEFAULT 0.00,
            fund_type VARCHAR(50),
            
            -- Activity status
            status VARCHAR(20) DEFAULT 'PLANNED',
            actual_duration_minutes INTEGER,
            actual_participants INTEGER,
            actual_amount DECIMAL(15,2) DEFAULT 0.00,
            
            -- Execution details
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            outcome_notes TEXT,
            
            -- Audit fields
            planned_by INTEGER NOT NULL REFERENCES users(id),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT check_activity_type CHECK (activity_type IN (
                'OPENING_PRAYER', 'ATTENDANCE_CHECK', 'MINUTES_REVIEW', 
                'INDIVIDUAL_SAVINGS', 'GROUP_SAVINGS', 'LOAN_APPLICATIONS', 
                'LOAN_DISBURSEMENTS', 'LOAN_REPAYMENTS', 'FINE_COLLECTION', 
                'VOTING_SESSION', 'TRAINING_SESSION', 'AOB', 'CLOSING_PRAYER'
            )),
            CONSTRAINT check_activity_status CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED')),
            UNIQUE(meeting_id, activity_order)
        );
    """)
    
    # 3. Meeting Templates Table (for recurring meeting patterns)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meeting_templates (
            id SERIAL PRIMARY KEY,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id) ON DELETE CASCADE,
            
            -- Template details
            template_name VARCHAR(255) NOT NULL,
            template_description TEXT,
            meeting_type VARCHAR(20) DEFAULT 'REGULAR',
            
            -- Default settings
            default_duration_minutes INTEGER DEFAULT 120,
            default_location VARCHAR(255),
            default_agenda TEXT,
            
            -- Recurrence settings
            is_recurring BOOLEAN DEFAULT FALSE,
            recurrence_pattern VARCHAR(50),  -- WEEKLY, MONTHLY, QUARTERLY
            recurrence_day_of_week INTEGER,  -- 1=Monday, 7=Sunday
            recurrence_day_of_month INTEGER, -- 1-31
            
            -- Auto-invitation settings
            auto_invite_all_members BOOLEAN DEFAULT TRUE,
            default_invitation_message TEXT,
            
            -- Template activities (JSON array of activity configurations)
            template_activities JSONB,
            
            -- Template status
            is_active BOOLEAN DEFAULT TRUE,
            
            -- Audit fields
            created_by INTEGER NOT NULL REFERENCES users(id),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT check_meeting_type CHECK (meeting_type IN ('REGULAR', 'SPECIAL', 'ANNUAL', 'EMERGENCY', 'TRAINING')),
            CONSTRAINT check_recurrence_pattern CHECK (recurrence_pattern IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY') OR recurrence_pattern IS NULL)
        );
    """)
    
    # 4. Meeting Activity Participants Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meeting_activity_participants (
            id SERIAL PRIMARY KEY,
            planned_activity_id INTEGER NOT NULL REFERENCES planned_meeting_activities(id) ON DELETE CASCADE,
            member_id INTEGER NOT NULL REFERENCES group_members(id) ON DELETE CASCADE,
            
            -- Participation planning
            participation_type VARCHAR(50) DEFAULT 'PARTICIPANT',
            is_required BOOLEAN DEFAULT FALSE,
            estimated_contribution DECIMAL(12,2) DEFAULT 0.00,
            
            -- Actual participation
            actually_participated BOOLEAN DEFAULT FALSE,
            actual_contribution DECIMAL(12,2) DEFAULT 0.00,
            participation_notes TEXT,
            participation_score DECIMAL(3,1) DEFAULT 0.0,
            
            -- Audit fields
            planned_by INTEGER NOT NULL REFERENCES users(id),
            recorded_by INTEGER REFERENCES users(id),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT check_participation_type CHECK (participation_type IN ('LEADER', 'PARTICIPANT', 'OBSERVER', 'FACILITATOR')),
            CONSTRAINT check_participation_score CHECK (participation_score >= 0 AND participation_score <= 10),
            UNIQUE(planned_activity_id, member_id)
        );
    """)
    
    # 5. Meeting Scheduler Calendar Table (separate from activity calendar)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scheduler_calendar (
            id SERIAL PRIMARY KEY,
            
            -- Calendar entry details
            calendar_date DATE NOT NULL,
            time_slot TIME NOT NULL,
            duration_minutes INTEGER DEFAULT 120,
            
            -- Meeting reference
            meeting_id INTEGER REFERENCES meetings(id) ON DELETE SET NULL,
            group_id INTEGER NOT NULL REFERENCES savings_groups(id) ON DELETE CASCADE,
            
            -- Scheduling details
            title VARCHAR(255) NOT NULL,
            description TEXT,
            location VARCHAR(255),
            meeting_type VARCHAR(20) DEFAULT 'REGULAR',
            
            -- Availability and booking
            is_booked BOOLEAN DEFAULT FALSE,
            is_available BOOLEAN DEFAULT TRUE,
            booking_status VARCHAR(20) DEFAULT 'AVAILABLE',
            
            -- Conflict management
            has_conflicts BOOLEAN DEFAULT FALSE,
            conflict_notes TEXT,
            
            -- Recurring meeting info
            is_recurring BOOLEAN DEFAULT FALSE,
            recurrence_id INTEGER,  -- Groups recurring meetings
            template_id INTEGER REFERENCES meeting_templates(id),
            
            -- Notification settings
            reminder_minutes INTEGER DEFAULT 30,
            send_invitations BOOLEAN DEFAULT TRUE,
            
            -- Audit fields
            scheduled_by INTEGER NOT NULL REFERENCES users(id),
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT check_booking_status CHECK (booking_status IN ('AVAILABLE', 'BOOKED', 'TENTATIVE', 'CANCELLED', 'COMPLETED')),
            CONSTRAINT check_meeting_type CHECK (meeting_type IN ('REGULAR', 'SPECIAL', 'ANNUAL', 'EMERGENCY', 'TRAINING'))
        );
    """)
    
    # Create indexes for performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_invitations_meeting_member ON meeting_invitations(meeting_id, member_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_invitations_status ON meeting_invitations(invitation_status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_planned_activities_meeting ON planned_meeting_activities(meeting_id, activity_order)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_planned_activities_type ON planned_meeting_activities(activity_type, status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_participants ON meeting_activity_participants(planned_activity_id, member_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_scheduler_calendar_date ON scheduler_calendar(calendar_date, time_slot)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_scheduler_calendar_group ON scheduler_calendar(group_id, calendar_date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_scheduler_calendar_booking ON scheduler_calendar(booking_status, is_available)")
    
    cursor.close()
    print("✅ Meeting scheduler tables created successfully!")

def enhance_existing_meetings_table(conn):
    """Add fields to existing meetings table for better scheduling"""
    cursor = conn.cursor()
    
    print("🔧 Enhancing existing meetings table...")
    
    # Add scheduling-related fields to meetings table
    enhancement_fields = [
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS scheduled_by INTEGER REFERENCES users(id)",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS invitation_sent BOOLEAN DEFAULT FALSE",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS invitation_sent_date TIMESTAMP",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_template_id INTEGER REFERENCES meeting_templates(id)",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN DEFAULT FALSE",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS recurrence_id INTEGER",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link VARCHAR(500)",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_password VARCHAR(100)",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS max_participants INTEGER",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS registration_required BOOLEAN DEFAULT FALSE",
        "ALTER TABLE meetings ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP"
    ]
    
    for field in enhancement_fields:
        cursor.execute(field)
    
    cursor.close()
    print("✅ Meetings table enhanced successfully!")

def create_default_meeting_templates(conn):
    """Create default meeting templates for common meeting types"""
    cursor = conn.cursor()
    
    print("📋 Creating default meeting templates...")
    
    # Get all groups to create templates for each
    cursor.execute("SELECT id, name FROM savings_groups ORDER BY id")
    groups = cursor.fetchall()
    
    for group_id, group_name in groups:
        # Regular Weekly Meeting Template
        cursor.execute("""
            INSERT INTO meeting_templates (
                group_id, template_name, template_description, meeting_type,
                default_duration_minutes, default_location, default_agenda,
                is_recurring, recurrence_pattern, recurrence_day_of_week,
                auto_invite_all_members, default_invitation_message,
                template_activities, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            group_id,
            f"Weekly {group_name} Meeting",
            f"Regular weekly meeting for {group_name} savings group",
            'REGULAR',
            120,  # 2 hours
            f"{group_name} Meeting Location",
            "1. Opening Prayer\n2. Attendance\n3. Minutes Review\n4. Savings Collection\n5. Loan Activities\n6. AOB\n7. Closing",
            True,
            'WEEKLY',
            3,  # Wednesday
            True,
            f"You are invited to the weekly {group_name} meeting. Please confirm your attendance.",
            json.dumps([
                {"order": 1, "name": "Opening Prayer", "type": "OPENING_PRAYER", "duration": 5},
                {"order": 2, "name": "Attendance Check", "type": "ATTENDANCE_CHECK", "duration": 10},
                {"order": 3, "name": "Minutes Review", "type": "MINUTES_REVIEW", "duration": 15},
                {"order": 4, "name": "Individual Savings", "type": "INDIVIDUAL_SAVINGS", "duration": 30},
                {"order": 5, "name": "Loan Applications", "type": "LOAN_APPLICATIONS", "duration": 20},
                {"order": 6, "name": "Loan Repayments", "type": "LOAN_REPAYMENTS", "duration": 15},
                {"order": 7, "name": "Fine Collection", "type": "FINE_COLLECTION", "duration": 10},
                {"order": 8, "name": "Any Other Business", "type": "AOB", "duration": 10},
                {"order": 9, "name": "Closing Prayer", "type": "CLOSING_PRAYER", "duration": 5}
            ]),
            1  # created by admin user
        ))
        
        # Monthly Special Meeting Template
        cursor.execute("""
            INSERT INTO meeting_templates (
                group_id, template_name, template_description, meeting_type,
                default_duration_minutes, default_location, default_agenda,
                is_recurring, recurrence_pattern, recurrence_day_of_month,
                auto_invite_all_members, default_invitation_message,
                template_activities, created_by
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            group_id,
            f"Monthly {group_name} Review",
            f"Monthly review and planning meeting for {group_name}",
            'SPECIAL',
            180,  # 3 hours
            f"{group_name} Meeting Location",
            "1. Opening\n2. Monthly Financial Review\n3. Loan Portfolio Review\n4. Member Performance\n5. Planning\n6. Closing",
            True,
            'MONTHLY',
            1,  # First day of month
            True,
            f"Monthly review meeting for {group_name}. Important decisions will be made.",
            json.dumps([
                {"order": 1, "name": "Opening & Attendance", "type": "ATTENDANCE_CHECK", "duration": 15},
                {"order": 2, "name": "Financial Review", "type": "GROUP_SAVINGS", "duration": 45},
                {"order": 3, "name": "Loan Portfolio Review", "type": "LOAN_APPLICATIONS", "duration": 60},
                {"order": 4, "name": "Member Performance Review", "type": "VOTING_SESSION", "duration": 30},
                {"order": 5, "name": "Next Month Planning", "type": "AOB", "duration": 25},
                {"order": 6, "name": "Closing", "type": "CLOSING_PRAYER", "duration": 5}
            ]),
            1
        ))
    
    cursor.close()
    print("✅ Default meeting templates created successfully!")

def main():
    print("📅 MS Teams-like Meeting Scheduler System")
    print("=" * 70)
    
    conn = get_db_connection()
    if not conn:
        return
    
    try:
        # Create the comprehensive meeting scheduling system
        create_meeting_scheduler_tables(conn)
        enhance_existing_meetings_table(conn)
        create_default_meeting_templates(conn)
        
        print(f"\n🎉 Meeting scheduler system implemented!")
        print(f"\n✅ NEW SCHEDULING FEATURES:")
        print("  📅 Click-to-schedule calendar interface")
        print("  👥 Auto-invite all group members")
        print("  📋 Plan activities within meetings")
        print("  🔄 Recurring meeting templates")
        print("  📧 Invitation and notification system")
        print("  ⏰ Time slot management and conflict detection")
        
        print(f"\n🗄️ NEW TABLES CREATED:")
        print("  • meeting_invitations - Member invitation management")
        print("  • planned_meeting_activities - Activity planning within meetings")
        print("  • meeting_templates - Reusable meeting patterns")
        print("  • meeting_activity_participants - Activity-level participation")
        print("  • scheduler_calendar - Separate scheduling calendar")
        
        print(f"\n🔗 MEETING SCHEDULER WORKFLOW:")
        print("  1. Click on date in scheduler calendar")
        print("  2. Select group → Auto-invite all members")
        print("  3. Choose meeting template or create custom")
        print("  4. Plan activities (savings, loans, fines, voting)")
        print("  5. Set time, location, and notifications")
        print("  6. Send invitations to members")
        print("  7. Track responses and manage attendance")
        print("  8. Execute planned activities during meeting")
        print("  9. Record outcomes and update related tables")
        
        print(f"\n📊 INTEGRATION WITH EXISTING SYSTEM:")
        print("  • Links to existing savings, loans, fines tables")
        print("  • Updates calendar_events with actual activities")
        print("  • Maintains attendance tracking")
        print("  • Preserves all existing functionality")
        
    except psycopg2.Error as e:
        print(f"❌ Implementation failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()
