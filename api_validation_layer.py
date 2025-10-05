# 🔒 API VALIDATION LAYER
# This module provides comprehensive validation functions for all API endpoints

import psycopg2
from functools import wraps
from flask import jsonify, request
from datetime import datetime

def validate_data_integrity(func):
    """Decorator to add data integrity validation to API endpoints"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except psycopg2.IntegrityError as e:
            return jsonify({
                'error': 'Data integrity violation',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }), 400
        except Exception as e:
            return jsonify({
                'error': 'Validation error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }), 500
    return wrapper

def validate_group_creation(data):
    """Validate group creation data"""
    errors = []
    
    # Required fields
    required_fields = ['name', 'created_by']
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f'Missing required field: {field}')
    
    # Validate name length
    if 'name' in data and len(data['name']) < 3:
        errors.append('Group name must be at least 3 characters long')
    
    # Validate max_members
    if 'max_members' in data:
        try:
            max_members = int(data['max_members'])
            if max_members < 5 or max_members > 100:
                errors.append('Max members must be between 5 and 100')
        except (ValueError, TypeError):
            errors.append('Max members must be a valid number')
    
    return errors

def validate_member_creation(data, conn):
    """Validate group member creation data"""
    errors = []
    
    # Required fields
    required_fields = ['name', 'group_id', 'gender']
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f'Missing required field: {field}')
    
    # Validate name length
    if 'name' in data and len(data['name']) < 2:
        errors.append('Member name must be at least 2 characters long')
    
    # Validate gender
    if 'gender' in data and data['gender'] not in ['MALE', 'FEMALE', 'OTHER']:
        errors.append('Gender must be MALE, FEMALE, or OTHER')
    
    # Validate role
    if 'role' in data and data['role'] not in ['MEMBER', 'OFFICER', 'FOUNDER']:
        errors.append('Role must be MEMBER, OFFICER, or FOUNDER')
    
    # Check if group exists and has space
    if 'group_id' in data:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT max_members, 
                   (SELECT COUNT(*) FROM group_members WHERE group_id = %s AND is_active = true) as current_members
            FROM savings_groups WHERE id = %s
        """, (data['group_id'], data['group_id']))
        
        group_info = cursor.fetchone()
        if not group_info:
            errors.append('Group does not exist')
        else:
            max_members, current_members = group_info
            if current_members >= max_members:
                errors.append(f'Group is full (max {max_members} members)')
    
    # Validate phone number format
    if 'phone' in data and data['phone']:
        phone = data['phone'].strip()
        if not phone.startswith('+') or len(phone) < 10:
            errors.append('Phone number must start with + and be at least 10 digits')
    
    return errors

def validate_meeting_creation(data, conn):
    """Validate meeting creation data"""
    errors = []
    
    # Required fields
    required_fields = ['group_id', 'meeting_date']
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f'Missing required field: {field}')
    
    # Validate meeting date format
    if 'meeting_date' in data:
        try:
            meeting_date = datetime.strptime(data['meeting_date'], '%Y-%m-%d').date()
            if meeting_date < datetime.now().date():
                errors.append('Meeting date cannot be in the past')
        except ValueError:
            errors.append('Meeting date must be in YYYY-MM-DD format')
    
    # Validate meeting time format
    if 'meeting_time' in data and data['meeting_time']:
        try:
            datetime.strptime(data['meeting_time'], '%H:%M')
        except ValueError:
            errors.append('Meeting time must be in HH:MM format')
    
    # Check if group exists and has officers
    if 'group_id' in data:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT chair_member_id, secretary_member_id, treasurer_member_id
            FROM savings_groups WHERE id = %s
        """, (data['group_id'],))
        
        group_info = cursor.fetchone()
        if not group_info:
            errors.append('Group does not exist')
        else:
            chair_id, secretary_id, treasurer_id = group_info
            if not all([chair_id, secretary_id, treasurer_id]):
                errors.append('Group must have all officers assigned before creating meetings')
    
    # Validate meeting type
    if 'meeting_type' in data and data['meeting_type'] not in ['REGULAR', 'SPECIAL', 'ANNUAL', 'EMERGENCY']:
        errors.append('Meeting type must be REGULAR, SPECIAL, ANNUAL, or EMERGENCY')
    
    return errors

def validate_officer_assignment(data, conn):
    """Validate officer assignment to groups"""
    errors = []
    
    # Required fields
    required_fields = ['group_id', 'chair_member_id', 'secretary_member_id', 'treasurer_member_id']
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f'Missing required field: {field}')
    
    if 'group_id' in data:
        group_id = data['group_id']
        cursor = conn.cursor()
        
        # Check if all officers belong to the group
        officer_fields = ['chair_member_id', 'secretary_member_id', 'treasurer_member_id']
        officer_names = ['chairperson', 'secretary', 'treasurer']
        
        for field, name in zip(officer_fields, officer_names):
            if field in data and data[field]:
                cursor.execute("""
                    SELECT id FROM group_members 
                    WHERE id = %s AND group_id = %s AND is_active = true
                """, (data[field], group_id))
                
                if not cursor.fetchone():
                    errors.append(f'{name.title()} must be an active member of this group')
        
        # Check if officers are different people
        officer_ids = [data.get(field) for field in officer_fields if data.get(field)]
        if len(officer_ids) != len(set(officer_ids)):
            errors.append('Each officer position must be held by a different person')
    
    return errors

def validate_role_permissions(user_role, required_role):
    """Validate if user has required role permissions"""
    role_hierarchy = {
        'ADMIN': 4,
        'CHAIRPERSON': 3,
        'TREASURER': 2,
        'SECRETARY': 2,
        'MEMBER': 1
    }
    
    user_level = role_hierarchy.get(user_role, 0)
    required_level = role_hierarchy.get(required_role, 0)
    
    return user_level >= required_level

def validate_financial_data(data):
    """Validate financial transaction data"""
    errors = []
    
    # Validate amount
    if 'amount' in data:
        try:
            amount = float(data['amount'])
            if amount < 0:
                errors.append('Amount cannot be negative')
            if amount > 10000000:  # 10 million limit
                errors.append('Amount exceeds maximum limit')
        except (ValueError, TypeError):
            errors.append('Amount must be a valid number')
    
    # Validate currency
    if 'currency' in data and data['currency'] not in ['UGX', 'USD', 'EUR', 'GBP']:
        errors.append('Currency must be UGX, USD, EUR, or GBP')
    
    return errors

def check_circular_navigation_integrity(conn):
    """Check if circular navigation will work properly"""
    cursor = conn.cursor()
    issues = []
    
    # Check for meetings without groups
    cursor.execute("""
        SELECT COUNT(*) FROM meetings m
        LEFT JOIN savings_groups sg ON m.group_id = sg.id
        WHERE sg.id IS NULL
    """)
    orphaned_meetings = cursor.fetchone()[0]
    if orphaned_meetings > 0:
        issues.append(f'{orphaned_meetings} meetings reference non-existent groups')
    
    # Check for calendar events without meetings
    cursor.execute("""
        SELECT COUNT(*) FROM calendar_events ce
        LEFT JOIN meetings m ON ce.meeting_id = m.id
        WHERE ce.meeting_id IS NOT NULL AND m.id IS NULL
    """)
    orphaned_events = cursor.fetchone()[0]
    if orphaned_events > 0:
        issues.append(f'{orphaned_events} calendar events reference non-existent meetings')
    
    # Check for meetings without officers
    cursor.execute("""
        SELECT COUNT(*) FROM meetings
        WHERE chairperson_id IS NULL OR secretary_id IS NULL OR treasurer_id IS NULL
    """)
    meetings_without_officers = cursor.fetchone()[0]
    if meetings_without_officers > 0:
        issues.append(f'{meetings_without_officers} meetings lack proper officer assignments')
    
    return issues

def get_validation_summary(conn):
    """Get a comprehensive validation summary"""
    cursor = conn.cursor()
    
    # Count various data integrity issues
    cursor.execute("""
        SELECT 
            'Groups without officers' as issue_type,
            COUNT(*) as count
        FROM savings_groups 
        WHERE chair_member_id IS NULL OR secretary_member_id IS NULL OR treasurer_member_id IS NULL
        
        UNION ALL
        
        SELECT 
            'Meetings without officers',
            COUNT(*)
        FROM meetings 
        WHERE chairperson_id IS NULL OR secretary_id IS NULL OR treasurer_id IS NULL
        
        UNION ALL
        
        SELECT 
            'Groups without members',
            COUNT(*)
        FROM savings_groups sg
        LEFT JOIN group_members gm ON sg.id = gm.group_id
        WHERE gm.id IS NULL
        
        UNION ALL
        
        SELECT 
            'Orphaned calendar events',
            COUNT(*)
        FROM calendar_events ce
        LEFT JOIN meetings m ON ce.meeting_id = m.id
        WHERE ce.meeting_id IS NOT NULL AND m.id IS NULL
    """)
    
    validation_results = cursor.fetchall()
    
    return {
        'validation_results': [
            {'issue_type': row[0], 'count': row[1]} 
            for row in validation_results
        ],
        'circular_navigation_issues': check_circular_navigation_integrity(conn),
        'timestamp': datetime.now().isoformat()
    }
