# 🎯 COMPREHENSIVE MEETING ACTIVITIES CRUD SYSTEM
# Handles all meeting activities: attendance, trainings, loans, savings, etc.

from flask import Flask, request, jsonify
import psycopg2
from datetime import datetime
import json

def get_db_connection():
    """Get database connection"""
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="testdriven_dev",
            user="postgres",
            password="postgres"
        )
        conn.autocommit = False
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# ============================================================================
# ATTENDANCE MANAGEMENT CRUD
# ============================================================================

def create_attendance_record(meeting_id, member_id, status='PRESENT', arrival_time=None, notes=None):
    """Create attendance record for a member"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO meeting_attendance (
                meeting_id, member_id, attendance_status, arrival_time, 
                departure_time, notes, created_date
            ) VALUES (%s, %s, %s, %s, NULL, %s, %s)
            RETURNING id
        ''', (meeting_id, member_id, status, arrival_time, notes, datetime.now()))
        
        attendance_id = cursor.fetchone()[0]
        conn.commit()
        
        # Update member's attendance statistics
        update_member_attendance_stats(conn, member_id)
        
        return attendance_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_attendance_record(attendance_id, status=None, arrival_time=None, departure_time=None, notes=None):
    """Update attendance record"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get current record
        cursor.execute('SELECT * FROM meeting_attendance WHERE id = %s', (attendance_id,))
        current = cursor.fetchone()
        
        if not current:
            raise ValueError("Attendance record not found")
        
        # Update fields
        cursor.execute('''
            UPDATE meeting_attendance 
            SET attendance_status = %s, arrival_time = %s, departure_time = %s, 
                notes = %s, updated_date = %s
            WHERE id = %s
            RETURNING *
        ''', (
            status or current['attendance_status'],
            arrival_time or current['arrival_time'],
            departure_time or current['departure_time'],
            notes or current['notes'],
            datetime.now(),
            attendance_id
        ))
        
        updated_record = cursor.fetchone()
        conn.commit()
        
        # Update member's attendance statistics
        update_member_attendance_stats(conn, current['member_id'])
        
        return updated_record
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_member_attendance_stats(conn, member_id):
    """Update member's attendance statistics"""
    cursor = conn.cursor()
    
    # Calculate attendance percentage
    cursor.execute('''
        SELECT 
            COUNT(*) as total_meetings,
            COUNT(CASE WHEN attendance_status = 'PRESENT' THEN 1 END) as attended_meetings
        FROM meeting_attendance ma
        JOIN meetings m ON ma.meeting_id = m.id
        JOIN group_members gm ON ma.member_id = gm.id
        WHERE gm.id = %s
    ''', (member_id,))
    
    stats = cursor.fetchone()
    if stats['total_meetings'] > 0:
        attendance_percentage = (stats['attended_meetings'] / stats['total_meetings']) * 100
        
        cursor.execute('''
            UPDATE group_members 
            SET attendance_percentage = %s, 
                total_meetings_attended = %s,
                total_meetings_eligible = %s,
                last_attendance_date = CASE 
                    WHEN %s > 0 THEN (
                        SELECT MAX(m.meeting_date) 
                        FROM meeting_attendance ma 
                        JOIN meetings m ON ma.meeting_id = m.id 
                        WHERE ma.member_id = %s AND ma.attendance_status = 'PRESENT'
                    )
                    ELSE last_attendance_date
                END
            WHERE id = %s
        ''', (
            attendance_percentage,
            stats['attended_meetings'],
            stats['total_meetings'],
            stats['attended_meetings'],
            member_id,
            member_id
        ))

# ============================================================================
# SAVINGS COLLECTION CRUD
# ============================================================================

def record_savings_collection(meeting_id, member_id, amount, savings_type='REGULAR', notes=None):
    """Record savings collection for a member"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create meeting activity
        cursor.execute('''
            INSERT INTO meeting_activities (
                meeting_id, activity_type, description, amount, status, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            meeting_id, 
            'savings_collection',
            f'{savings_type} savings collection',
            amount,
            'completed',
            datetime.now()
        ))
        
        activity_id = cursor.fetchone()[0]
        
        # Record member participation
        cursor.execute('''
            INSERT INTO member_activity_participation (
                activity_id, member_id, participation_type, amount_contributed, 
                notes, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
        ''', (
            activity_id, member_id, 'CONTRIBUTOR', amount, notes, datetime.now()
        ))
        
        # Update member's savings balance
        cursor.execute('''
            UPDATE group_members 
            SET total_contributions = total_contributions + %s,
                share_balance = share_balance + %s
            WHERE id = %s
        ''', (amount, amount, member_id))
        
        # Update group's savings balance
        cursor.execute('''
            UPDATE savings_groups 
            SET savings_balance = savings_balance + %s
            WHERE id = (SELECT group_id FROM group_members WHERE id = %s)
        ''', (amount, member_id))
        
        conn.commit()
        return activity_id
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# ============================================================================
# LOAN MANAGEMENT CRUD
# ============================================================================

def process_loan_application(meeting_id, member_id, loan_amount, loan_purpose, interest_rate=10.0):
    """Process loan application during meeting"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check member eligibility
        cursor.execute('''
            SELECT gm.*, sg.loan_fund_balance 
            FROM group_members gm 
            JOIN savings_groups sg ON gm.group_id = sg.id 
            WHERE gm.id = %s
        ''', (member_id,))
        
        member_info = cursor.fetchone()
        
        if not member_info['is_eligible_for_loans']:
            raise ValueError("Member not eligible for loans")
        
        if member_info['loan_fund_balance'] < loan_amount:
            raise ValueError("Insufficient loan fund balance")
        
        # Create loan record
        cursor.execute('''
            INSERT INTO loans (
                member_id, group_id, loan_amount, interest_rate, loan_purpose,
                application_date, status, meeting_id, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            member_id, member_info['group_id'], loan_amount, interest_rate,
            loan_purpose, datetime.now().date(), 'APPROVED', meeting_id, datetime.now()
        ))
        
        loan_id = cursor.fetchone()[0]
        
        # Create meeting activity for loan disbursement
        cursor.execute('''
            INSERT INTO meeting_activities (
                meeting_id, activity_type, description, amount, status, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            meeting_id,
            'loan_disbursement',
            f'Loan disbursement - {loan_purpose}',
            loan_amount,
            'completed',
            datetime.now()
        ))
        
        activity_id = cursor.fetchone()[0]
        
        # Record member participation
        cursor.execute('''
            INSERT INTO member_activity_participation (
                activity_id, member_id, participation_type, amount_contributed, 
                notes, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
        ''', (
            activity_id, member_id, 'BENEFICIARY', loan_amount, 
            f'Loan ID: {loan_id}', datetime.now()
        ))
        
        # Update group's loan fund balance
        cursor.execute('''
            UPDATE savings_groups 
            SET loan_fund_balance = loan_fund_balance - %s
            WHERE id = %s
        ''', (loan_amount, member_info['group_id']))
        
        conn.commit()
        return {'loan_id': loan_id, 'activity_id': activity_id}
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def record_loan_repayment(meeting_id, loan_id, repayment_amount, payment_type='PRINCIPAL_AND_INTEREST'):
    """Record loan repayment during meeting"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get loan information
        cursor.execute('''
            SELECT l.*, gm.group_id 
            FROM loans l 
            JOIN group_members gm ON l.member_id = gm.id 
            WHERE l.id = %s
        ''', (loan_id,))
        
        loan_info = cursor.fetchone()
        if not loan_info:
            raise ValueError("Loan not found")
        
        # Create repayment record
        cursor.execute('''
            INSERT INTO loan_repayments (
                loan_id, repayment_amount, repayment_date, payment_type, 
                meeting_id, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            loan_id, repayment_amount, datetime.now().date(), 
            payment_type, meeting_id, datetime.now()
        ))
        
        repayment_id = cursor.fetchone()[0]
        
        # Create meeting activity
        cursor.execute('''
            INSERT INTO meeting_activities (
                meeting_id, activity_type, description, amount, status, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            meeting_id,
            'loan_repayment',
            f'Loan repayment - Loan ID: {loan_id}',
            repayment_amount,
            'completed',
            datetime.now()
        ))
        
        activity_id = cursor.fetchone()[0]
        
        # Record member participation
        cursor.execute('''
            INSERT INTO member_activity_participation (
                activity_id, member_id, participation_type, amount_contributed, 
                notes, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
        ''', (
            activity_id, loan_info['member_id'], 'CONTRIBUTOR', repayment_amount,
            f'Repayment ID: {repayment_id}', datetime.now()
        ))
        
        # Update group's loan fund balance
        cursor.execute('''
            UPDATE savings_groups 
            SET loan_fund_balance = loan_fund_balance + %s
            WHERE id = %s
        ''', (repayment_amount, loan_info['group_id']))
        
        # Update loan status if fully repaid
        cursor.execute('''
            SELECT 
                l.loan_amount + (l.loan_amount * l.interest_rate / 100) as total_due,
                COALESCE(SUM(lr.repayment_amount), 0) as total_paid
            FROM loans l
            LEFT JOIN loan_repayments lr ON l.id = lr.loan_id
            WHERE l.id = %s
            GROUP BY l.id, l.loan_amount, l.interest_rate
        ''', (loan_id,))
        
        loan_status = cursor.fetchone()
        if loan_status['total_paid'] >= loan_status['total_due']:
            cursor.execute('''
                UPDATE loans SET status = 'FULLY_REPAID', repayment_date = %s 
                WHERE id = %s
            ''', (datetime.now().date(), loan_id))
        
        conn.commit()
        return {'repayment_id': repayment_id, 'activity_id': activity_id}
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# ============================================================================
# TRAINING ACTIVITIES CRUD
# ============================================================================

def record_training_activity(meeting_id, training_topic, trainer_name, participants, duration_minutes=60):
    """Record training activity during meeting"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create meeting activity
        cursor.execute('''
            INSERT INTO meeting_activities (
                meeting_id, activity_type, description, amount, status, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            meeting_id,
            'training_session',
            f'Training: {training_topic} (Trainer: {trainer_name})',
            0.00,  # No monetary amount for training
            'completed',
            datetime.now()
        ))
        
        activity_id = cursor.fetchone()[0]
        
        # Record participant attendance
        for member_id in participants:
            cursor.execute('''
                INSERT INTO member_activity_participation (
                    activity_id, member_id, participation_type, amount_contributed, 
                    notes, created_date
                ) VALUES (%s, %s, %s, %s, %s, %s)
            ''', (
                activity_id, member_id, 'PARTICIPANT', 0.00,
                f'Training duration: {duration_minutes} minutes', datetime.now()
            ))
        
        conn.commit()
        return activity_id
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# ============================================================================
# FUND CONTRIBUTIONS CRUD (ECD, Target, Emergency)
# ============================================================================

def record_fund_contribution(meeting_id, member_id, fund_type, amount, notes=None):
    """Record special fund contribution (ECD, Target, Emergency)"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Validate fund type
        valid_fund_types = ['ECD_FUND', 'TARGET_FUND', 'EMERGENCY_FUND', 'SOCIAL_FUND']
        if fund_type not in valid_fund_types:
            raise ValueError(f"Invalid fund type. Must be one of: {valid_fund_types}")
        
        # Create meeting activity
        activity_type_map = {
            'ECD_FUND': 'ecd_fund_contribution',
            'TARGET_FUND': 'target_fund_contribution', 
            'EMERGENCY_FUND': 'emergency_fund_contribution',
            'SOCIAL_FUND': 'social_fund_collection'
        }
        
        cursor.execute('''
            INSERT INTO meeting_activities (
                meeting_id, activity_type, description, amount, status, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (
            meeting_id,
            activity_type_map[fund_type],
            f'{fund_type.replace("_", " ").title()} contribution',
            amount,
            'completed',
            datetime.now()
        ))
        
        activity_id = cursor.fetchone()[0]
        
        # Record member participation
        cursor.execute('''
            INSERT INTO member_activity_participation (
                activity_id, member_id, participation_type, amount_contributed, 
                notes, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s)
        ''', (
            activity_id, member_id, 'CONTRIBUTOR', amount, notes, datetime.now()
        ))
        
        conn.commit()
        return activity_id
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
