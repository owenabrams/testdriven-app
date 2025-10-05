# 👥 COMPREHENSIVE MEMBER/USER PROFILE CRUD SYSTEM
# Handles member profiles, officer management, and user account information

from flask import Flask, request, jsonify
import psycopg2
from datetime import datetime
import json
import hashlib

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
# MEMBER PROFILE CRUD
# ============================================================================

def get_member_profile(member_id):
    """Get comprehensive member profile information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get basic member information
        cursor.execute('''
            SELECT gm.*, sg.name as group_name, u.username, u.email
            FROM group_members gm
            JOIN savings_groups sg ON gm.group_id = sg.id
            LEFT JOIN users u ON gm.user_id = u.id
            WHERE gm.id = %s
        ''', (member_id,))
        
        member = cursor.fetchone()
        if not member:
            return None
        
        # Get financial summary
        cursor.execute('''
            SELECT 
                COALESCE(SUM(CASE WHEN ma.activity_type = 'savings_collection' THEN ma.amount END), 0) as total_savings,
                COALESCE(SUM(CASE WHEN ma.activity_type = 'loan_disbursement' THEN ma.amount END), 0) as total_loans_received,
                COALESCE(SUM(CASE WHEN ma.activity_type = 'loan_repayment' THEN ma.amount END), 0) as total_loan_repayments,
                COALESCE(SUM(CASE WHEN ma.activity_type = 'fine_collection' THEN ma.amount END), 0) as total_fines_paid
            FROM member_activity_participation map
            JOIN meeting_activities ma ON map.activity_id = ma.id
            WHERE map.member_id = %s
        ''', (member_id,))
        
        financial_summary = cursor.fetchone()
        
        # Get attendance summary
        cursor.execute('''
            SELECT 
                COUNT(*) as total_meetings_invited,
                COUNT(CASE WHEN attendance_status = 'PRESENT' THEN 1 END) as meetings_attended,
                COUNT(CASE WHEN attendance_status = 'ABSENT' THEN 1 END) as meetings_missed,
                COUNT(CASE WHEN attendance_status = 'LATE' THEN 1 END) as meetings_late
            FROM meeting_attendance
            WHERE member_id = %s
        ''', (member_id,))
        
        attendance_summary = cursor.fetchone()
        
        # Get officer positions
        cursor.execute('''
            SELECT 
                CASE 
                    WHEN chair_member_id = %s THEN 'Chairperson'
                    WHEN secretary_member_id = %s THEN 'Secretary'
                    WHEN treasurer_member_id = %s THEN 'Treasurer'
                    ELSE NULL
                END as officer_position
            FROM savings_groups 
            WHERE id = %s
        ''', (member_id, member_id, member_id, member['group_id']))
        
        officer_info = cursor.fetchone()
        
        return {
            'member_info': member,
            'financial_summary': financial_summary,
            'attendance_summary': attendance_summary,
            'officer_position': officer_info['officer_position'] if officer_info else None
        }
        
    except Exception as e:
        raise e
    finally:
        conn.close()

def update_member_profile(member_id, profile_data):
    """Update member profile information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get current member data
        cursor.execute('SELECT * FROM group_members WHERE id = %s', (member_id,))
        current_member = cursor.fetchone()
        
        if not current_member:
            raise ValueError("Member not found")
        
        # Update member information
        update_fields = []
        update_values = []
        
        allowed_fields = [
            'name', 'phone', 'email', 'gender', 'date_of_birth', 'national_id',
            'address', 'occupation', 'education_level', 'marital_status',
            'emergency_contact_name', 'emergency_contact_phone', 'role'
        ]
        
        for field in allowed_fields:
            if field in profile_data:
                update_fields.append(f"{field} = %s")
                update_values.append(profile_data[field])
        
        if update_fields:
            update_fields.append("updated_date = %s")
            update_values.append(datetime.now())
            update_values.append(member_id)
            
            cursor.execute(f'''
                UPDATE group_members 
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            ''', update_values)
            
            updated_member = cursor.fetchone()
            
            # Handle role changes and officer assignments
            if 'role' in profile_data:
                handle_role_change(conn, member_id, current_member['role'], profile_data['role'])
            
            # Update linked user account if exists
            if current_member['user_id'] and 'email' in profile_data:
                cursor.execute('''
                    UPDATE users SET email = %s WHERE id = %s
                ''', (profile_data['email'], current_member['user_id']))
            
            conn.commit()
            
            # Trigger cascading updates
            from cascading_crud_system import handle_member_update
            handle_member_update(conn, member_id, dict(current_member), profile_data)
            
            return updated_member
        
        return current_member
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def handle_role_change(conn, member_id, old_role, new_role):
    """Handle member role changes and officer assignments"""
    cursor = conn.cursor()
    
    # Get member's group
    cursor.execute('SELECT group_id FROM group_members WHERE id = %s', (member_id,))
    group_id = cursor.fetchone()['group_id']
    
    # If changing from OFFICER to MEMBER, check if they hold an officer position
    if old_role == 'OFFICER' and new_role == 'MEMBER':
        cursor.execute('''
            SELECT 
                CASE 
                    WHEN chair_member_id = %s THEN 'chair'
                    WHEN secretary_member_id = %s THEN 'secretary'
                    WHEN treasurer_member_id = %s THEN 'treasurer'
                    ELSE NULL
                END as position
            FROM savings_groups WHERE id = %s
        ''', (member_id, member_id, member_id, group_id))
        
        position = cursor.fetchone()
        if position and position['position']:
            # Remove from officer position (will need manual reassignment)
            cursor.execute(f'''
                UPDATE savings_groups 
                SET {position['position']}_member_id = NULL
                WHERE id = %s
            ''', (group_id,))
            
            # Create notification for group about officer vacancy
            from cascading_crud_system import notify_group_members
            notify_group_members(
                conn, group_id,
                f"{position['position'].title()} Position Vacant",
                f"The {position['position']} position is now vacant and needs to be reassigned.",
                'WARNING', 'HIGH'
            )

# ============================================================================
# OFFICER MANAGEMENT CRUD
# ============================================================================

def assign_officer_position(group_id, member_id, position):
    """Assign member to officer position"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Validate position
        valid_positions = ['chair', 'secretary', 'treasurer']
        if position not in valid_positions:
            raise ValueError(f"Invalid position. Must be one of: {valid_positions}")
        
        # Check if member belongs to group and is eligible
        cursor.execute('''
            SELECT * FROM group_members 
            WHERE id = %s AND group_id = %s AND is_active = true
        ''', (member_id, group_id))
        
        member = cursor.fetchone()
        if not member:
            raise ValueError("Member not found or not active in this group")
        
        # Get current officer in this position
        cursor.execute(f'''
            SELECT {position}_member_id FROM savings_groups WHERE id = %s
        ''', (group_id,))
        
        current_officer = cursor.fetchone()[f'{position}_member_id']
        
        # Update officer position
        cursor.execute(f'''
            UPDATE savings_groups 
            SET {position}_member_id = %s
            WHERE id = %s
        ''', (member_id, group_id))
        
        # Update member role to OFFICER
        cursor.execute('''
            UPDATE group_members 
            SET role = 'OFFICER'
            WHERE id = %s
        ''', (member_id,))
        
        # If there was a previous officer, update their role if they don't hold other positions
        if current_officer and current_officer != member_id:
            cursor.execute('''
                SELECT 
                    CASE 
                        WHEN chair_member_id = %s OR secretary_member_id = %s OR treasurer_member_id = %s 
                        THEN 'OFFICER' 
                        ELSE 'MEMBER' 
                    END as new_role
                FROM savings_groups WHERE id = %s
            ''', (current_officer, current_officer, current_officer, group_id))
            
            new_role = cursor.fetchone()['new_role']
            cursor.execute('''
                UPDATE group_members SET role = %s WHERE id = %s
            ''', (new_role, current_officer))
        
        conn.commit()
        
        # Send notifications
        from cascading_crud_system import notify_group_members
        notify_group_members(
            conn, group_id,
            f"New {position.title()} Appointed",
            f"{member['name']} has been appointed as the new {position}.",
            'INFO', 'NORMAL'
        )
        
        return True
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_group_officers(group_id):
    """Get all officers for a group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                sg.chair_member_id, cm.name as chair_name, cm.phone as chair_phone,
                sg.secretary_member_id, sm.name as secretary_name, sm.phone as secretary_phone,
                sg.treasurer_member_id, tm.name as treasurer_name, tm.phone as treasurer_phone
            FROM savings_groups sg
            LEFT JOIN group_members cm ON sg.chair_member_id = cm.id
            LEFT JOIN group_members sm ON sg.secretary_member_id = sm.id
            LEFT JOIN group_members tm ON sg.treasurer_member_id = tm.id
            WHERE sg.id = %s
        ''', (group_id,))
        
        return cursor.fetchone()
        
    except Exception as e:
        raise e
    finally:
        conn.close()

# ============================================================================
# USER ACCOUNT CRUD
# ============================================================================

def create_user_account(member_id, username, email, password, role='MEMBER'):
    """Create user account for a member"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if member exists
        cursor.execute('SELECT * FROM group_members WHERE id = %s', (member_id,))
        member = cursor.fetchone()
        
        if not member:
            raise ValueError("Member not found")
        
        if member['user_id']:
            raise ValueError("Member already has a user account")
        
        # Hash password
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        
        # Create user account
        cursor.execute('''
            INSERT INTO users (username, email, password_hash, role, is_active, created_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        ''', (username, email, password_hash, role, True, datetime.now()))
        
        user_id = cursor.fetchone()[0]
        
        # Link user account to member
        cursor.execute('''
            UPDATE group_members SET user_id = %s WHERE id = %s
        ''', (user_id, member_id))
        
        conn.commit()
        return user_id
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def update_user_account(user_id, account_data):
    """Update user account information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        update_fields = []
        update_values = []
        
        allowed_fields = ['username', 'email', 'role', 'is_active']
        
        for field in allowed_fields:
            if field in account_data:
                update_fields.append(f"{field} = %s")
                update_values.append(account_data[field])
        
        # Handle password change
        if 'password' in account_data:
            password_hash = hashlib.sha256(account_data['password'].encode()).hexdigest()
            update_fields.append("password_hash = %s")
            update_values.append(password_hash)
        
        if update_fields:
            update_fields.append("updated_date = %s")
            update_values.append(datetime.now())
            update_values.append(user_id)
            
            cursor.execute(f'''
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            ''', update_values)
            
            updated_user = cursor.fetchone()
            conn.commit()
            return updated_user
        
        return None
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_user_profile(user_id):
    """Get comprehensive user profile"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user and linked member information
        cursor.execute('''
            SELECT u.*, gm.name as member_name, gm.phone, sg.name as group_name,
                   CASE 
                       WHEN sg.chair_member_id = gm.id THEN 'Chairperson'
                       WHEN sg.secretary_member_id = gm.id THEN 'Secretary'
                       WHEN sg.treasurer_member_id = gm.id THEN 'Treasurer'
                       ELSE 'Member'
                   END as group_position
            FROM users u
            LEFT JOIN group_members gm ON u.id = gm.user_id
            LEFT JOIN savings_groups sg ON gm.group_id = sg.id
            WHERE u.id = %s
        ''', (user_id,))
        
        user_profile = cursor.fetchone()
        
        # Get user's groups if they're in multiple groups
        cursor.execute('''
            SELECT sg.id, sg.name, gm.role,
                   CASE 
                       WHEN sg.chair_member_id = gm.id THEN 'Chairperson'
                       WHEN sg.secretary_member_id = gm.id THEN 'Secretary'
                       WHEN sg.treasurer_member_id = gm.id THEN 'Treasurer'
                       ELSE 'Member'
                   END as position
            FROM group_members gm
            JOIN savings_groups sg ON gm.group_id = sg.id
            WHERE gm.user_id = %s AND gm.is_active = true
        ''', (user_id,))
        
        user_groups = cursor.fetchall()
        
        return {
            'user_profile': user_profile,
            'groups': user_groups
        }
        
    except Exception as e:
        raise e
    finally:
        conn.close()

# ============================================================================
# MEMBER SEARCH AND FILTERING
# ============================================================================

def search_members(group_id=None, search_term=None, role=None, is_active=True):
    """Search and filter members"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        where_conditions = []
        params = []
        
        if group_id:
            where_conditions.append("gm.group_id = %s")
            params.append(group_id)
        
        if search_term:
            where_conditions.append("(gm.name ILIKE %s OR gm.phone ILIKE %s OR gm.email ILIKE %s)")
            search_pattern = f"%{search_term}%"
            params.extend([search_pattern, search_pattern, search_pattern])
        
        if role:
            where_conditions.append("gm.role = %s")
            params.append(role)
        
        if is_active is not None:
            where_conditions.append("gm.is_active = %s")
            params.append(is_active)
        
        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        cursor.execute(f'''
            SELECT gm.*, sg.name as group_name, u.username,
                   CASE 
                       WHEN sg.chair_member_id = gm.id THEN 'Chairperson'
                       WHEN sg.secretary_member_id = gm.id THEN 'Secretary'
                       WHEN sg.treasurer_member_id = gm.id THEN 'Treasurer'
                       ELSE gm.role
                   END as effective_role
            FROM group_members gm
            JOIN savings_groups sg ON gm.group_id = sg.id
            LEFT JOIN users u ON gm.user_id = u.id
            {where_clause}
            ORDER BY gm.name
        ''', params)
        
        return cursor.fetchall()
        
    except Exception as e:
        raise e
    finally:
        conn.close()
