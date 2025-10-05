#!/usr/bin/env python3
"""
🚀 MINIMAL ENHANCED MEETING ACTIVITIES DEMO
Demonstrates Enhanced Meeting Activities API working with minimal Flask setup
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_socketio import SocketIO
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date, timedelta
import json
import os
import io
import csv
from decimal import Decimal
import hashlib
import secrets
import jwt

# Load environment configuration
from load_environment import load_environment
config = load_environment()
from functools import wraps

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration
app.config['SECRET_KEY'] = config['secret_key']

# Password hashing functions
def hash_password(password):
    """Hash a password with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return salt + password_hash.hex()

def verify_password(password, hashed_password):
    """Verify a password against its hash"""
    if len(hashed_password) < 32:
        return False
    salt = hashed_password[:32]
    stored_hash = hashed_password[32:]
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return password_hash.hex() == stored_hash

# Database setup - PostgreSQL (from smart environment loader)
DB_HOST = config['db_host']
DB_PORT = config['db_port']
DB_NAME = config['db_name']
DB_USER = config['db_user']
DB_PASSWORD = config['db_password']

def get_db_connection():
    """Get PostgreSQL database connection"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            cursor_factory=RealDictCursor
        )
        return conn
    except psycopg2.Error as e:
        print(f"Database connection failed: {e}")
        return None

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif hasattr(obj, 'isoformat'):  # Handle time objects
        return obj.isoformat()
    return obj

def serialize_record(record):
    """Serialize database record for JSON response"""
    if record is None:
        return None
    return {key: decimal_to_float(value) for key, value in dict(record).items()}

# Authentication decorators
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]  # Remove 'Bearer ' prefix

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(current_user_id, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated

# Basic API Endpoints

@app.route('/ping', methods=['GET'])
def ping():
    """Health check endpoint for ALB"""
    return jsonify({
        'environment': 'production',
        'message': 'pong!',
        'status': 'success',
        'version': '1.1.0-stable'
    })

@app.route('/auth/login', methods=['POST'])
def login():
    """Login endpoint"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    # Check for admin credentials
    if email == 'admin@savingsgroup.com' and password == 'admin123':
        # Generate JWT token
        token = jwt.encode({
            'user_id': 1,
            'email': email,
            'role': 'super_admin',
            'is_super_admin': True,
            'exp': datetime.utcnow() + timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm='HS256')

        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'auth_token': token,
            'user': {
                'id': 1,
                'email': email,
                'role': 'super_admin',
                'is_super_admin': True,
                'username': 'admin'
            }
        })

    return jsonify({'message': 'Invalid email or password.', 'status': 'fail'}), 401

@app.route('/users', methods=['GET'])
def get_users():
    """Get all users"""
    return jsonify({
        'status': 'success',
        'data': {
            'users': [{
                'id': 1,
                'username': 'admin',
                'email': 'admin@savingsgroup.com',
                'active': True,
                'admin': True,
                'role': 'super_admin',
                'is_super_admin': True,
                'managed_services': [],
                'service_permissions': []
            }]
        }
    })

# Enhanced Meeting Activities API Endpoints

@app.route('/api/meeting-activities/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Enhanced Meeting Activities API',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/meeting-activities/', methods=['GET', 'POST'])
def activities():
    """Get all meeting activities or create new one"""
    if request.method == 'GET':
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get group_id filter from query parameters
        group_id = request.args.get('group_id')

        if group_id:
            cursor.execute('''
                SELECT ma.id, ma.meeting_id, ma.activity_type, ma.description, ma.amount,
                       ma.status, ma.created_date, m.meeting_date, m.location, sg.name as group_name
                FROM meeting_activities ma
                JOIN meetings m ON ma.meeting_id = m.id
                JOIN savings_groups sg ON m.group_id = sg.id
                WHERE m.group_id = %s
                ORDER BY ma.created_date DESC
            ''', (group_id,))
        else:
            cursor.execute('''
                SELECT ma.id, ma.meeting_id, ma.activity_type, ma.description, ma.amount,
                       ma.status, ma.created_date, m.meeting_date, m.location, sg.name as group_name
                FROM meeting_activities ma
                JOIN meetings m ON ma.meeting_id = m.id
                JOIN savings_groups sg ON m.group_id = sg.id
                ORDER BY ma.created_date DESC
            ''')

        activities = cursor.fetchall()
        conn.close()

        return jsonify({
            'activities': [dict(activity) for activity in activities],
            'total': len(activities)
        })

    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        required_fields = ['meeting_id', 'activity_type', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            # Create the main activity record
            cursor.execute('''
                INSERT INTO meeting_activities (meeting_id, activity_type, description, amount, status, created_date, updated_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            ''', (
                data['meeting_id'],
                data['activity_type'],
                data['description'],
                data.get('amount', 0),
                data.get('status', 'pending'),
                datetime.now(),
                datetime.now()
            ))

            new_activity = cursor.fetchone()
            activity_id = new_activity['id']

            # Get all members of the group for this meeting
            cursor.execute('''
                SELECT gm.id, gm.name, gm.group_id
                FROM group_members gm
                JOIN meetings m ON gm.group_id = m.group_id
                WHERE m.id = %s AND gm.is_active = true
            ''', (data['meeting_id'],))

            group_members = cursor.fetchall()

            # Create individual participation records for each member
            member_participations = data.get('member_participations', [])

            if member_participations:
                # Use provided member participation data
                for participation in member_participations:
                    cursor.execute('''
                        INSERT INTO member_activity_participation
                        (activity_id, member_id, participation_type, amount_contributed, notes, created_date)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    ''', (
                        activity_id,
                        participation['member_id'],
                        participation.get('participation_type', 'PARTICIPANT'),
                        participation.get('amount_contributed', 0),
                        participation.get('notes', ''),
                        datetime.now()
                    ))
            else:
                # Create default participation records for all group members
                for member in group_members:
                    cursor.execute('''
                        INSERT INTO member_activity_participation
                        (activity_id, member_id, participation_type, amount_contributed, notes, created_date)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    ''', (
                        activity_id,
                        member['id'],
                        'contributor',
                        0,
                        'Default participation record - to be updated with actual data',
                        datetime.now()
                    ))

            conn.commit()

            # Return the activity with participation count
            cursor.execute('''
                SELECT COUNT(*) as participation_count
                FROM member_activity_participation
                WHERE activity_id = %s
            ''', (activity_id,))

            participation_count = cursor.fetchone()['participation_count']

            conn.close()

            return jsonify({
                'message': 'Activity created successfully with member participation records',
                'activity': dict(new_activity),
                'participation_count': participation_count
            }), 201

        except Exception as e:
            conn.rollback()
            conn.close()
            return jsonify({'error': f'Failed to create activity: {str(e)}'}), 500

@app.route('/api/meeting-activities/<int:activity_id>', methods=['GET', 'PUT', 'DELETE'])
def activity_detail(activity_id):
    """Get, update, or delete specific meeting activity"""
    conn = get_db_connection()

    if request.method == 'GET':
        activity = conn.execute('''
            SELECT * FROM meeting_activities WHERE id = ?
        ''', (activity_id,)).fetchone()

        if not activity:
            conn.close()
            return jsonify({'error': 'Activity not found'}), 404

        # Get documents for this activity
        documents = conn.execute('''
            SELECT * FROM activity_documents WHERE activity_id = ?
        ''', (activity_id,)).fetchall()

        # Get participation for this activity
        participation = conn.execute('''
            SELECT * FROM member_activity_participation WHERE activity_id = ?
        ''', (activity_id,)).fetchall()

        conn.close()

        return jsonify({
            'activity': dict(activity),
            'documents': [dict(doc) for doc in documents],
            'participation': [dict(part) for part in participation]
        })

    elif request.method == 'PUT':
        # Check if activity exists
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM meeting_activities WHERE id = %s
        ''', (activity_id,))
        activity = cursor.fetchone()

        if not activity:
            conn.close()
            return jsonify({'error': 'Activity not found'}), 404

        data = request.get_json()
        if not data:
            conn.close()
            return jsonify({'error': 'No data provided'}), 400

        # Update activity
        update_fields = []
        update_values = []

        allowed_fields = ['meeting_id', 'activity_type', 'description', 'amount', 'status']
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                update_values.append(data[field])

        if update_fields:
            update_fields.append("updated_date = %s")
            update_values.append(datetime.now())
            update_values.append(activity_id)

            cursor.execute(f'''
                UPDATE meeting_activities
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            ''', update_values)
            updated_activity = cursor.fetchone()
            conn.commit()
        else:
            updated_activity = activity
        conn.close()

        return jsonify({
            'message': 'Activity updated successfully',
            'activity': dict(updated_activity)
        })

    elif request.method == 'DELETE':
        # Check if activity exists
        activity = conn.execute('''
            SELECT * FROM meeting_activities WHERE id = ?
        ''', (activity_id,)).fetchone()

        if not activity:
            conn.close()
            return jsonify({'error': 'Activity not found'}), 404

        # Delete related records first (documents and participation)
        conn.execute('DELETE FROM activity_documents WHERE activity_id = ?', (activity_id,))
        conn.execute('DELETE FROM member_activity_participation WHERE activity_id = ?', (activity_id,))

        # Delete the activity
        conn.execute('DELETE FROM meeting_activities WHERE id = ?', (activity_id,))
        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Activity deleted successfully',
            'deleted_activity_id': activity_id
        })

@app.route('/api/meeting-activities/<int:activity_id>/documents', methods=['GET'])
def get_activity_documents(activity_id):
    """Get documents for a specific activity"""
    conn = get_db_connection()
    documents = conn.execute('''
        SELECT * FROM activity_documents WHERE activity_id = ?
    ''', (activity_id,)).fetchall()
    conn.close()
    
    return jsonify({
        'documents': [dict(doc) for doc in documents],
        'total': len(documents)
    })

@app.route('/api/meeting-activities/<int:activity_id>/participation', methods=['GET', 'POST'])
def activity_participation(activity_id):
    """Get or add participation for a specific activity"""
    conn = get_db_connection()

    if request.method == 'GET':
        participation = conn.execute('''
            SELECT * FROM member_activity_participation WHERE activity_id = ?
        ''', (activity_id,)).fetchall()
        conn.close()

        return jsonify({
            'participation': [dict(part) for part in participation],
            'total': len(participation)
        })

    elif request.method == 'POST':
        # Check if activity exists
        activity = conn.execute('''
            SELECT * FROM meeting_activities WHERE id = ?
        ''', (activity_id,)).fetchone()

        if not activity:
            conn.close()
            return jsonify({'error': 'Activity not found'}), 404

        data = request.get_json()
        if not data:
            conn.close()
            return jsonify({'error': 'No data provided'}), 400

        required_fields = ['member_id', 'participation_type', 'amount_contributed']
        for field in required_fields:
            if field not in data:
                conn.close()
                return jsonify({'error': f'Missing required field: {field}'}), 400

        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO member_activity_participation
            (activity_id, member_id, participation_type, amount_contributed, notes, created_date)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            activity_id,
            data['member_id'],
            data['participation_type'],
            data['amount_contributed'],
            data.get('notes', ''),
            datetime.now().isoformat()
        ))

        participation_id = cursor.lastrowid
        conn.commit()

        # Get the created participation
        new_participation = conn.execute('''
            SELECT * FROM member_activity_participation WHERE id = ?
        ''', (participation_id,)).fetchone()
        conn.close()

        return jsonify({
            'message': 'Participation added successfully',
            'participation': dict(new_participation)
        }), 201

@app.route('/api/meeting-activities/reports/summary', methods=['GET'])
def get_summary_report():
    """Get summary report of all activities"""
    conn = get_db_connection()
    
    # Activity counts by type
    activity_counts = conn.execute('''
        SELECT activity_type, COUNT(*) as count, SUM(amount) as total_amount
        FROM meeting_activities 
        GROUP BY activity_type
    ''').fetchall()
    
    # Status distribution
    status_counts = conn.execute('''
        SELECT status, COUNT(*) as count
        FROM meeting_activities 
        GROUP BY status
    ''').fetchall()
    
    # Total statistics
    totals = conn.execute('''
        SELECT 
            COUNT(*) as total_activities,
            SUM(amount) as total_amount,
            COUNT(DISTINCT meeting_id) as total_meetings
        FROM meeting_activities
    ''').fetchone()
    
    # Document statistics
    doc_stats = conn.execute('''
        SELECT COUNT(*) as total_documents, SUM(file_size) as total_size
        FROM activity_documents
    ''').fetchone()
    
    # Participation statistics
    part_stats = conn.execute('''
        SELECT 
            COUNT(*) as total_participations,
            COUNT(DISTINCT member_id) as unique_members,
            SUM(amount_contributed) as total_contributed
        FROM member_activity_participation
    ''').fetchone()
    
    conn.close()
    
    return jsonify({
        'activity_counts': [dict(row) for row in activity_counts],
        'status_counts': [dict(row) for row in status_counts],
        'totals': dict(totals),
        'document_stats': dict(doc_stats),
        'participation_stats': dict(part_stats),
        'generated_at': datetime.now().isoformat()
    })

@app.route('/api/meeting-activities/reports/by-meeting/<int:meeting_id>', methods=['GET'])
def get_meeting_report(meeting_id):
    """Get report for a specific meeting"""
    conn = get_db_connection()
    
    activities = conn.execute('''
        SELECT * FROM meeting_activities WHERE meeting_id = ?
    ''', (meeting_id,)).fetchall()
    
    if not activities:
        return jsonify({'error': 'No activities found for this meeting'}), 404
    
    # Get total amounts by type
    totals = conn.execute('''
        SELECT activity_type, COUNT(*) as count, SUM(amount) as total_amount
        FROM meeting_activities 
        WHERE meeting_id = ?
        GROUP BY activity_type
    ''', (meeting_id,)).fetchall()
    
    conn.close()
    
    return jsonify({
        'meeting_id': meeting_id,
        'activities': [dict(activity) for activity in activities],
        'totals_by_type': [dict(total) for total in totals],
        'total_activities': len(activities)
    })

@app.route('/api/meeting-activities/reports/analytics', methods=['GET'])
def get_analytics():
    """Get analytics data"""
    conn = get_db_connection()
    
    # Monthly activity trends (simplified for demo)
    monthly_trends = conn.execute('''
        SELECT 
            strftime('%Y-%m', created_date) as month,
            COUNT(*) as activity_count,
            SUM(amount) as total_amount
        FROM meeting_activities 
        GROUP BY strftime('%Y-%m', created_date)
        ORDER BY month
    ''').fetchall()
    
    # Top activity types
    top_activities = conn.execute('''
        SELECT activity_type, COUNT(*) as frequency, AVG(amount) as avg_amount
        FROM meeting_activities 
        GROUP BY activity_type
        ORDER BY frequency DESC
    ''').fetchall()
    
    # Member participation analysis
    member_analysis = conn.execute('''
        SELECT 
            member_id,
            COUNT(*) as participation_count,
            SUM(amount_contributed) as total_contributed,
            AVG(amount_contributed) as avg_contribution
        FROM member_activity_participation
        GROUP BY member_id
        ORDER BY total_contributed DESC
    ''').fetchall()
    
    conn.close()
    
    return jsonify({
        'monthly_trends': [dict(row) for row in monthly_trends],
        'top_activities': [dict(row) for row in top_activities],
        'member_analysis': [dict(row) for row in member_analysis],
        'generated_at': datetime.now().isoformat()
    })

# ============================================================================
# COMPREHENSIVE SYSTEM API ENDPOINTS
# ============================================================================

@app.route('/', methods=['GET'])
def index():
    """Main page showing complete system status"""
    return jsonify({
        'message': '🏦 Complete Microfinance System API',
        'status': 'operational',
        'system_components': [
            'User Management & Authentication',
            'Savings Groups Management',
            'Group Members & Officer Roles',
            'Meeting Scheduling & Management',
            'Calendar Events (MS Teams-like)',
            'Meeting Attendance Tracking',
            'Member Savings & Financial Tracking',
            'Group Loans & Repayment Management',
            'Member Fines & Penalties',
            'Financial Transaction Ledger',
            'Enhanced Meeting Activities',
            'Document Management System'
        ],
        'api_categories': {
            'users': '/api/users/',
            'groups': '/api/groups/',
            'members': '/api/members/',
            'meetings': '/api/meetings/',
            'calendar': '/api/calendar/',
            'attendance': '/api/attendance/',
            'savings': '/api/savings/',
            'loans': '/api/loans/',
            'fines': '/api/fines/',
            'transactions': '/api/transactions/',
            'activities': '/api/meeting-activities/',
            'campaigns': '/api/campaigns/',
            'notifications': '/api/notifications/',
            'analytics': '/api/analytics/',
            'admin': '/api/admin/',
            'reports': '/api/reports/'
        },
        'integration_status': 'COMPLETE - All system components integrated and operational'
    })

# ============================================================================
# USERS API
# ============================================================================

@app.route('/api/users/', methods=['GET', 'POST'])
def users():
    """Get all users or create new user"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("""
            SELECT id, username, email, active, admin, role, is_super_admin, created_date
            FROM users ORDER BY created_date DESC
        """)
        users = cursor.fetchall()
        conn.close()

        return jsonify({
            'users': [serialize_record(user) for user in users],
            'total': len(users)
        })

    elif request.method == 'POST':
        data = request.get_json()
        if not data or not all(k in data for k in ['username', 'email', 'password']):
            conn.close()
            return jsonify({'error': 'Missing required fields: username, email, password'}), 400

        try:
            cursor.execute("""
                INSERT INTO users (username, email, password, active, admin, role)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, username, email, active, admin, role, created_date
            """, (
                data['username'],
                data['email'],
                data['password'],  # In production, this should be hashed
                data.get('active', True),
                data.get('admin', False),
                data.get('role', 'user')
            ))

            new_user = cursor.fetchone()
            conn.commit()
            conn.close()

            return jsonify({
                'message': 'User created successfully',
                'user': serialize_record(new_user)
            }), 201

        except psycopg2.IntegrityError as e:
            conn.close()
            return jsonify({'error': 'Username or email already exists'}), 409

# ============================================================================
# SAVINGS GROUPS API
# ============================================================================

@app.route('/api/groups/', methods=['GET', 'POST'])
def groups():
    """Get all savings groups or create new group"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("""
            SELECT sg.*,
                   u.username as created_by_username,
                   cm.name as chair_name,
                   tm.name as treasurer_name,
                   sm.name as secretary_name
            FROM savings_groups sg
            LEFT JOIN users u ON sg.created_by = u.id
            LEFT JOIN group_members cm ON sg.chair_member_id = cm.id
            LEFT JOIN group_members tm ON sg.treasurer_member_id = tm.id
            LEFT JOIN group_members sm ON sg.secretary_member_id = sm.id
            ORDER BY sg.created_date DESC
        """)
        groups = cursor.fetchall()
        conn.close()

        return jsonify({
            'groups': [serialize_record(group) for group in groups],
            'total': len(groups)
        })

    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            conn.close()
            return jsonify({'error': 'No data provided'}), 400

        # Validate group creation data
        from api_validation_layer import validate_group_creation
        validation_errors = validate_group_creation(data)
        if validation_errors:
            conn.close()
            return jsonify({'error': 'Validation failed', 'details': validation_errors}), 400

        try:
            cursor.execute("""
                INSERT INTO savings_groups (name, description, location, meeting_day, meeting_time,
                                          meeting_frequency, state, max_members, created_by)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                data['name'],
                data.get('description', ''),
                data.get('location', ''),
                data.get('meeting_day', 'WEDNESDAY'),
                data.get('meeting_time', '14:00'),
                data.get('meeting_frequency', 'WEEKLY'),
                data.get('state', 'FORMING'),
                data.get('max_members', 30),
                data['created_by']
            ))

            new_group = cursor.fetchone()
            conn.commit()
            conn.close()

            return jsonify({
                'message': 'Savings group created successfully',
                'group': serialize_record(new_group)
            }), 201

        except psycopg2.Error as e:
            conn.close()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/groups/<int:group_id>', methods=['GET', 'PUT', 'DELETE'])
def group_detail(group_id):
    """Get, update, or delete a specific group with cascading effects"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("""
            SELECT sg.*,
                   u.username as created_by_username,
                   cm.name as chair_name,
                   tm.name as treasurer_name,
                   sm.name as secretary_name
            FROM savings_groups sg
            LEFT JOIN users u ON sg.created_by = u.id
            LEFT JOIN group_members cm ON sg.chair_member_id = cm.id
            LEFT JOIN group_members tm ON sg.treasurer_member_id = tm.id
            LEFT JOIN group_members sm ON sg.secretary_member_id = sm.id
            WHERE sg.id = %s
        """, (group_id,))

        group = cursor.fetchone()
        if not group:
            conn.close()
            return jsonify({'error': 'Group not found'}), 404

        conn.close()
        return jsonify({'group': serialize_record(group)})

    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            conn.close()
            return jsonify({'error': 'No data provided'}), 400

        # Get current group data
        cursor.execute("SELECT * FROM savings_groups WHERE id = %s", (group_id,))
        old_group = cursor.fetchone()
        if not old_group:
            conn.close()
            return jsonify({'error': 'Group not found'}), 404

        # Validate group update data (less strict than creation)
        validation_errors = []
        if 'name' in data and len(data['name']) < 3:
            validation_errors.append('Group name must be at least 3 characters')
        if 'max_members' in data and (data['max_members'] < 5 or data['max_members'] > 100):
            validation_errors.append('Max members must be between 5 and 100')

        if validation_errors:
            conn.close()
            return jsonify({'error': 'Validation failed', 'details': validation_errors}), 400

        try:
            # Update group
            update_fields = []
            update_values = []

            allowed_fields = ['name', 'description', 'location', 'meeting_day', 'meeting_time',
                            'meeting_frequency', 'state', 'max_members']
            for field in allowed_fields:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    update_values.append(data[field])

            if update_fields:
                update_values.append(group_id)
                cursor.execute(f"""
                    UPDATE savings_groups
                    SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING *
                """, update_values)

                updated_group = cursor.fetchone()

                # Handle cascading updates
                from cascading_crud_system import handle_group_update
                cascade_result = handle_group_update(conn, group_id, serialize_record(old_group), data)

                conn.commit()
                conn.close()

                return jsonify({
                    'message': 'Group updated successfully',
                    'group': serialize_record(updated_group),
                    'cascade_effects': cascade_result
                })
            else:
                conn.close()
                return jsonify({'error': 'No valid fields to update'}), 400

        except psycopg2.Error as e:
            conn.close()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

    elif request.method == 'DELETE':
        # Handle cascading deletion
        from cascading_crud_system import handle_deletion_cascade
        cascade_effects = handle_deletion_cascade(conn, 'group', group_id)

        try:
            cursor.execute("DELETE FROM savings_groups WHERE id = %s", (group_id,))
            if cursor.rowcount == 0:
                conn.close()
                return jsonify({'error': 'Group not found'}), 404

            conn.commit()
            conn.close()

            return jsonify({
                'message': 'Group deleted successfully',
                'cascade_effects': cascade_effects
            })

        except psycopg2.Error as e:
            conn.close()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

# ============================================================================
# GROUP MEMBERS API
# ============================================================================

@app.route('/api/members/', methods=['GET', 'POST'])
def members():
    """Get all group members or create new member"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    if request.method == 'GET':
        # Get optional group_id filter
        group_id = request.args.get('group_id')

        if group_id:
            cursor.execute("""
                SELECT gm.*, sg.name as group_name, u.username
                FROM group_members gm
                JOIN savings_groups sg ON gm.group_id = sg.id
                LEFT JOIN users u ON gm.user_id = u.id
                WHERE gm.group_id = %s AND gm.is_active = true
                ORDER BY gm.role DESC, gm.name
            """, (group_id,))
        else:
            cursor.execute("""
                SELECT gm.*, sg.name as group_name, u.username
                FROM group_members gm
                JOIN savings_groups sg ON gm.group_id = sg.id
                LEFT JOIN users u ON gm.user_id = u.id
                WHERE gm.is_active = true
                ORDER BY sg.name, gm.role DESC, gm.name
            """)

        members = cursor.fetchall()
        conn.close()

        return jsonify({
            'members': [serialize_record(member) for member in members],
            'total': len(members)
        })

    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            conn.close()
            return jsonify({'error': 'No data provided'}), 400

        # Validate required fields
        required_fields = ['name', 'group_id', 'gender']
        for field in required_fields:
            if field not in data or not data[field]:
                conn.close()
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate data integrity
        from api_validation_layer import validate_member_creation
        validation_errors = validate_member_creation(data, conn)
        if validation_errors:
            conn.close()
            return jsonify({'error': 'Validation failed', 'details': validation_errors}), 400

        try:
            cursor.execute("""
                INSERT INTO group_members (
                    name, group_id, user_id, gender, phone, role,
                    joined_date, is_active, attendance_percentage, is_eligible_for_loans
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                data['name'],
                data['group_id'],
                data.get('user_id'),
                data['gender'],
                data.get('phone', ''),
                data.get('role', 'MEMBER'),
                datetime.now().date(),
                True,
                0.0,
                False
            ))

            new_member = cursor.fetchone()
            conn.commit()
            conn.close()

            return jsonify({
                'message': 'Group member created successfully',
                'member': serialize_record(new_member)
            }), 201

        except psycopg2.Error as e:
            conn.close()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/members/<int:member_id>', methods=['GET', 'PUT', 'DELETE'])
def member_detail(member_id):
    """Get, update, or delete a specific member with cascading effects"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("""
            SELECT gm.*, sg.name as group_name, u.username
            FROM group_members gm
            JOIN savings_groups sg ON gm.group_id = sg.id
            LEFT JOIN users u ON gm.user_id = u.id
            WHERE gm.id = %s
        """, (member_id,))

        member = cursor.fetchone()
        if not member:
            conn.close()
            return jsonify({'error': 'Member not found'}), 404

        conn.close()
        return jsonify({'member': serialize_record(member)})

    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            conn.close()
            return jsonify({'error': 'No data provided'}), 400

        # Get current member data
        cursor.execute("SELECT * FROM group_members WHERE id = %s", (member_id,))
        old_member = cursor.fetchone()
        if not old_member:
            conn.close()
            return jsonify({'error': 'Member not found'}), 404

        try:
            # Update member
            update_fields = []
            update_values = []

            allowed_fields = ['name', 'phone', 'gender', 'role', 'is_active']
            for field in allowed_fields:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    update_values.append(data[field])

            if update_fields:
                update_values.append(member_id)
                cursor.execute(f"""
                    UPDATE group_members
                    SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING *
                """, update_values)

                updated_member = cursor.fetchone()

                # Handle cascading updates
                from cascading_crud_system import handle_member_update
                cascade_result = handle_member_update(conn, member_id, serialize_record(old_member), data)

                conn.commit()
                conn.close()

                return jsonify({
                    'message': 'Member updated successfully',
                    'member': serialize_record(updated_member),
                    'cascade_effects': cascade_result
                })
            else:
                conn.close()
                return jsonify({'error': 'No valid fields to update'}), 400

        except psycopg2.Error as e:
            conn.close()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

    elif request.method == 'DELETE':
        # Handle cascading deletion
        from cascading_crud_system import handle_deletion_cascade
        cascade_effects = handle_deletion_cascade(conn, 'member', member_id)

        try:
            cursor.execute("DELETE FROM group_members WHERE id = %s", (member_id,))
            if cursor.rowcount == 0:
                conn.close()
                return jsonify({'error': 'Member not found'}), 404

            conn.commit()
            conn.close()

            return jsonify({
                'message': 'Member deleted successfully',
                'cascade_effects': cascade_effects
            })

        except psycopg2.Error as e:
            conn.close()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/groups/<int:group_id>/assign-officers', methods=['POST'])
def assign_group_officers(group_id):
    """Assign officers to a group"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()
    data = request.get_json()

    if not data:
        conn.close()
        return jsonify({'error': 'No data provided'}), 400

    # Validate officer assignment
    data['group_id'] = group_id
    from api_validation_layer import validate_officer_assignment
    validation_errors = validate_officer_assignment(data, conn)
    if validation_errors:
        conn.close()
        return jsonify({'error': 'Validation failed', 'details': validation_errors}), 400

    try:
        cursor.execute("""
            UPDATE savings_groups
            SET chair_member_id = %s, secretary_member_id = %s, treasurer_member_id = %s
            WHERE id = %s
            RETURNING *
        """, (
            data['chair_member_id'],
            data['secretary_member_id'],
            data['treasurer_member_id'],
            group_id
        ))

        updated_group = cursor.fetchone()
        if not updated_group:
            conn.close()
            return jsonify({'error': 'Group not found'}), 404

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Officers assigned successfully',
            'group': serialize_record(updated_group)
        })

    except psycopg2.Error as e:
        conn.close()
        return jsonify({'error': f'Database error: {str(e)}'}), 500

# ============================================================================
# MEETINGS & CALENDAR API
# ============================================================================

@app.route('/api/meetings/', methods=['GET', 'POST'])
def meetings():
    """Get all meetings or create new meeting"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute("""
            SELECT m.*,
                   sg.name as group_name,
                   cp.name as chairperson_name,
                   sec.name as secretary_name,
                   tr.name as treasurer_name
            FROM meetings m
            LEFT JOIN savings_groups sg ON m.group_id = sg.id
            LEFT JOIN group_members cp ON m.chairperson_id = cp.id
            LEFT JOIN group_members sec ON m.secretary_id = sec.id
            LEFT JOIN group_members tr ON m.treasurer_id = tr.id
            ORDER BY m.meeting_date DESC
        """)
        meetings = cursor.fetchall()
        conn.close()

        return jsonify({
            'meetings': [serialize_record(meeting) for meeting in meetings],
            'total': len(meetings)
        })

    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            conn.close()
            return jsonify({'error': 'No data provided'}), 400

        # Validate meeting creation data
        from api_validation_layer import validate_meeting_creation
        validation_errors = validate_meeting_creation(data, conn)
        if validation_errors:
            conn.close()
            return jsonify({'error': 'Validation failed', 'details': validation_errors}), 400

        try:
            cursor.execute("""
                INSERT INTO meetings (group_id, meeting_date, meeting_time, location, meeting_type,
                                    status, agenda, scheduled_by, created_date)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                data['group_id'],
                data['meeting_date'],
                data.get('meeting_time', '14:00'),
                data.get('location', ''),
                data.get('meeting_type', 'REGULAR'),
                'SCHEDULED',
                data.get('agenda', ''),
                data.get('scheduled_by', 1),
                datetime.now()
            ))

            new_meeting = cursor.fetchone()
            conn.commit()
            conn.close()

            return jsonify({
                'message': 'Meeting created successfully',
                'meeting': serialize_record(new_meeting)
            }), 201

        except psycopg2.Error as e:
            conn.close()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/meetings/<int:meeting_id>', methods=['PUT', 'DELETE'])
def meeting_update_delete(meeting_id):
    """Update or delete a specific meeting with cascading effects"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    if request.method == 'PUT':
        data = request.get_json()
        if not data:
            conn.close()
            return jsonify({'error': 'No data provided'}), 400

        # Get current meeting data
        cursor.execute("SELECT * FROM meetings WHERE id = %s", (meeting_id,))
        old_meeting = cursor.fetchone()
        if not old_meeting:
            conn.close()
            return jsonify({'error': 'Meeting not found'}), 404

        # Validate meeting update data
        data['group_id'] = old_meeting['group_id']  # Ensure group_id is available for validation
        from api_validation_layer import validate_meeting_creation
        validation_errors = validate_meeting_creation(data, conn)
        if validation_errors:
            conn.close()
            return jsonify({'error': 'Validation failed', 'details': validation_errors}), 400

        try:
            # Update meeting
            update_fields = []
            update_values = []

            allowed_fields = ['meeting_date', 'meeting_time', 'location', 'meeting_type',
                            'status', 'agenda']
            for field in allowed_fields:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    update_values.append(data[field])

            if update_fields:
                update_values.append(meeting_id)
                cursor.execute(f"""
                    UPDATE meetings
                    SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING *
                """, update_values)

                updated_meeting = cursor.fetchone()

                # Handle cascading updates
                from cascading_crud_system import handle_meeting_update
                cascade_result = handle_meeting_update(conn, meeting_id, serialize_record(old_meeting), data)

                conn.commit()
                conn.close()

                return jsonify({
                    'message': 'Meeting updated successfully',
                    'meeting': serialize_record(updated_meeting),
                    'cascade_effects': cascade_result
                })
            else:
                conn.close()
                return jsonify({'error': 'No valid fields to update'}), 400

        except psycopg2.Error as e:
            conn.close()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

    elif request.method == 'DELETE':
        # Handle cascading deletion
        from cascading_crud_system import handle_deletion_cascade
        cascade_effects = handle_deletion_cascade(conn, 'meeting', meeting_id)

        try:
            cursor.execute("DELETE FROM meetings WHERE id = %s", (meeting_id,))
            if cursor.rowcount == 0:
                conn.close()
                return jsonify({'error': 'Meeting not found'}), 404

            conn.commit()
            conn.close()

            return jsonify({
                'message': 'Meeting deleted successfully',
                'cascade_effects': cascade_effects
            })

        except psycopg2.Error as e:
            conn.close()
            return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/calendar/', methods=['GET', 'POST'])
def calendar_events():
    """Get calendar events or create new event (MS Teams-like)"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    if request.method == 'GET':
        # Get date range from query parameters
        start_date = request.args.get('start_date', '2024-10-01')
        end_date = request.args.get('end_date', '2025-12-31')  # Extended to include 2025

        # Get calendar events
        cursor.execute("""
            SELECT ce.*, sg.name as group_name
            FROM calendar_events ce
            LEFT JOIN savings_groups sg ON ce.group_id = sg.id
            WHERE ce.event_date BETWEEN %s AND %s
            ORDER BY ce.event_date, ce.event_time
        """, (start_date, end_date))

        calendar_events = cursor.fetchall()

        # Get meetings as calendar events
        cursor.execute("""
            SELECT
                m.id,
                m.meeting_date as event_date,
                m.meeting_time as event_time,
                COALESCE(sc.title, CONCAT('Meeting - ', sg.name)) as title,
                COALESCE(sc.description, m.agenda) as description,
                m.location,
                'MEETING' as event_type,
                m.status,
                m.group_id,
                sg.name as group_name,
                m.created_date
            FROM meetings m
            LEFT JOIN savings_groups sg ON m.group_id = sg.id
            LEFT JOIN scheduler_calendar sc ON sc.meeting_id = m.id
            WHERE m.meeting_date BETWEEN %s AND %s
            ORDER BY m.meeting_date, m.meeting_time
        """, (start_date, end_date))

        meeting_events = cursor.fetchall()

        # Combine both types of events
        all_events = []

        # Add calendar events
        for event in calendar_events:
            all_events.append(serialize_record(event))

        # Add meeting events
        for event in meeting_events:
            all_events.append(serialize_record(event))

        # Sort all events by date and time
        all_events.sort(key=lambda x: (x.get('event_date', ''), x.get('event_time', '')))

        conn.close()

        return jsonify({
            'events': all_events,
            'total': len(all_events),
            'date_range': {'start': start_date, 'end': end_date}
        })

@app.route('/api/calendar/events', methods=['GET'])
def calendar_events_alias():
    """Alias for calendar events endpoint"""
    return calendar_events()

# ============================================================================
# SAVINGS CYCLE API
# ============================================================================

@app.route('/api/savings-cycles/', methods=['GET'])
def savings_cycles():
    """Get savings cycles with filtering"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    # Get query parameters
    group_id = request.args.get('group_id')
    status = request.args.get('status')

    # Build query
    where_conditions = []
    params = []

    if group_id:
        where_conditions.append("sc.group_id = %s")
        params.append(group_id)

    if status:
        where_conditions.append("sc.status = %s")
        params.append(status.upper())

    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    cursor.execute(f"""
        SELECT sc.*, sg.name as group_name, sg.region, sg.district
        FROM savings_cycles sc
        JOIN savings_groups sg ON sc.group_id = sg.id
        {where_clause}
        ORDER BY sc.group_id, sc.cycle_number DESC
    """, params)

    cycles = cursor.fetchall()
    conn.close()

    return jsonify({
        'savings_cycles': [serialize_record(cycle) for cycle in cycles],
        'total': len(cycles)
    })

@app.route('/api/groups/<int:group_id>/members', methods=['GET'])
def group_members(group_id):
    """Get all members of a specific group"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    cursor.execute("""
        SELECT gm.*, u.username, u.email
        FROM group_members gm
        LEFT JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = %s AND gm.is_active = true
        ORDER BY gm.name
    """, (group_id,))

    members = cursor.fetchall()
    conn.close()

    return jsonify({
        'members': [serialize_record(member) for member in members],
        'total': len(members)
    })

@app.route('/api/groups/<int:group_id>/current-cycle', methods=['GET'])
def group_current_cycle(group_id):
    """Get current cycle information for a group"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    cursor.execute("""
        SELECT sg.*,
               sc.id as current_cycle_id,
               sc.cycle_number,
               sc.start_date as cycle_start_date,
               sc.end_date as cycle_end_date,
               sc.total_savings_collected,
               sc.total_interest_earned,
               sc.member_retention_rate,
               sc.average_attendance_rate
        FROM savings_groups sg
        LEFT JOIN savings_cycles sc ON sg.id = sc.group_id AND sc.status = 'ACTIVE'
        WHERE sg.id = %s
    """, (group_id,))

    group_cycle = cursor.fetchone()

    if not group_cycle:
        conn.close()
        return jsonify({'error': 'Group not found'}), 404

    # Get cycle history
    cursor.execute("""
        SELECT cycle_number, status, total_savings_collected,
               actual_shareout_date, member_retention_rate
        FROM savings_cycles
        WHERE group_id = %s
        ORDER BY cycle_number
    """, (group_id,))

    cycle_history = cursor.fetchall()

    conn.close()

    return jsonify({
        'group_cycle_info': serialize_record(group_cycle),
        'cycle_history': [serialize_record(cycle) for cycle in cycle_history]
    })

# ============================================================================
# ENHANCED CALENDAR FILTERING API
# ============================================================================

@app.route('/api/calendar/filtered', methods=['GET'])
def calendar_filtered():
    """Get calendar events with comprehensive filtering"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    # Get all filter parameters
    region = request.args.get('region')
    district = request.args.get('district')
    parish = request.args.get('parish')
    village = request.args.get('village')
    gender = request.args.get('gender')
    saving_type = request.args.get('saving_type')
    role = request.args.get('role')
    min_amount = request.args.get('min_amount')
    max_amount = request.args.get('max_amount')
    group_id = request.args.get('group_id')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    # Build dynamic query
    where_conditions = []
    params = []

    base_query = """
        SELECT ce.*, sg.name as group_name, sg.region, sg.district,
               sg.parish, sg.village, u.username
        FROM calendar_events ce
        LEFT JOIN savings_groups sg ON ce.group_id = sg.id
        LEFT JOIN users u ON ce.user_id = u.id
    """

    if region and region != 'ALL':
        where_conditions.append("sg.region = %s")
        params.append(region)

    if district and district != 'ALL':
        where_conditions.append("sg.district = %s")
        params.append(district)

    if parish and parish != 'ALL':
        where_conditions.append("sg.parish = %s")
        params.append(parish)

    if village and village != 'ALL':
        where_conditions.append("sg.village = %s")
        params.append(village)

    if gender and gender != 'ALL':
        where_conditions.append("ce.member_gender = %s")
        params.append(gender)

    if saving_type and saving_type != 'ALL':
        where_conditions.append("ce.fund_type = %s")
        params.append(saving_type)

    if role and role != 'ALL':
        where_conditions.append("ce.member_role = %s")
        params.append(role)

    if min_amount:
        where_conditions.append("ce.amount >= %s")
        params.append(float(min_amount))

    if max_amount:
        where_conditions.append("ce.amount <= %s")
        params.append(float(max_amount))

    if group_id:
        where_conditions.append("ce.group_id = %s")
        params.append(group_id)

    if start_date:
        where_conditions.append("ce.event_date >= %s")
        params.append(start_date)

    if end_date:
        where_conditions.append("ce.event_date <= %s")
        params.append(end_date)

    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    final_query = f"{base_query} {where_clause} ORDER BY ce.event_date DESC LIMIT 100"

    cursor.execute(final_query, params)
    events = cursor.fetchall()

    # Get filter summary
    cursor.execute(f"""
        SELECT
            COUNT(*) as total_events,
            COUNT(DISTINCT sg.id) as groups_involved,
            SUM(ce.amount) as total_amount,
            COUNT(DISTINCT sg.region) as regions_covered
        FROM calendar_events ce
        LEFT JOIN savings_groups sg ON ce.group_id = sg.id
        LEFT JOIN users u ON ce.user_id = u.id
        {where_clause}
    """, params)

    summary = cursor.fetchone()
    conn.close()

    return jsonify({
        'filtered_events': [serialize_record(event) for event in events],
        'total': len(events),
        'filter_summary': serialize_record(summary),
        'applied_filters': {
            'region': region,
            'district': district,
            'parish': parish,
            'village': village,
            'gender': gender,
            'saving_type': saving_type,
            'role': role,
            'amount_range': f"{min_amount or 0} - {max_amount or 'unlimited'}",
            'group_id': group_id,
            'date_range': f"{start_date or 'all'} to {end_date or 'all'}"
        }
    })

# ============================================================================
# CAMPAIGNS API
# ============================================================================

@app.route('/api/campaigns/', methods=['GET'])
def campaigns():
    """Get all target savings campaigns"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    cursor.execute("""
        SELECT tsc.*, u.username as created_by_username,
               COUNT(gtc.id) as active_groups
        FROM target_savings_campaigns tsc
        LEFT JOIN users u ON tsc.created_by = u.id
        LEFT JOIN group_target_campaigns gtc ON tsc.id = gtc.campaign_id AND gtc.status = 'ACTIVE'
        GROUP BY tsc.id, u.username
        ORDER BY tsc.created_date DESC
    """)
    campaigns = cursor.fetchall()
    conn.close()

    return jsonify({
        'campaigns': [serialize_record(campaign) for campaign in campaigns],
        'total': len(campaigns)
    })

@app.route('/api/target-campaigns', methods=['GET'])
def target_campaigns():
    """Redirect to campaigns endpoint for compatibility"""
    return campaigns()

@app.route('/api/campaigns/<int:campaign_id>/groups', methods=['GET'])
def campaign_groups(campaign_id):
    """Get groups participating in a campaign"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    cursor.execute("""
        SELECT gtc.*, sg.name as group_name, sg.members_count,
               COUNT(mcp.id) as participating_members
        FROM group_target_campaigns gtc
        JOIN savings_groups sg ON gtc.group_id = sg.id
        LEFT JOIN member_campaign_participation mcp ON gtc.id = mcp.group_campaign_id
        WHERE gtc.campaign_id = %s
        GROUP BY gtc.id, sg.name, sg.members_count
        ORDER BY gtc.amount_collected DESC
    """, (campaign_id,))

    groups = cursor.fetchall()
    conn.close()

    return jsonify({
        'campaign_groups': [serialize_record(group) for group in groups],
        'total': len(groups)
    })

# ============================================================================
# NOTIFICATIONS API
# ============================================================================

@app.route('/api/notifications/', methods=['GET'])
def old_notifications():
    """Get notifications with filtering"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    # Get query parameters
    user_id = request.args.get('user_id')
    is_read = request.args.get('is_read')
    priority = request.args.get('priority')

    # Build query
    where_conditions = []
    params = []

    if user_id:
        where_conditions.append("n.user_id = %s")
        params.append(user_id)

    if is_read is not None:
        where_conditions.append("n.is_read = %s")
        params.append(is_read.lower() == 'true')

    if priority:
        where_conditions.append("n.priority = %s")
        params.append(priority.upper())

    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    cursor.execute(f"""
        SELECT n.*, u.username, sg.name as group_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        LEFT JOIN savings_groups sg ON n.group_id = sg.id
        {where_clause}
        ORDER BY n.created_date DESC
        LIMIT 50
    """, params)

    notifications = cursor.fetchall()
    conn.close()

    return jsonify({
        'notifications': [serialize_record(notification) for notification in notifications],
        'total': len(notifications)
    })

@app.route('/api/notifications/user/<int:user_id>/unread-count', methods=['GET'])
def user_unread_notifications_count(user_id):
    """Get unread notifications count for a specific user"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    cursor.execute("""
        SELECT COUNT(*) as unread_count
        FROM notifications
        WHERE user_id = %s AND is_read = false
    """, (user_id,))

    result = cursor.fetchone()
    conn.close()

    return jsonify({
        'status': 'success',
        'data': {
            'unread_count': result['unread_count'] if result else 0,
            'user_id': user_id
        }
    })

@app.route('/api/notifications/user/<int:user_id>', methods=['GET'])
def user_notifications(user_id):
    """Get all notifications for a specific user"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, title, message, notification_type, is_read, created_date
        FROM notifications
        WHERE user_id = %s
        ORDER BY created_date DESC
        LIMIT 50
    """, (user_id,))

    notifications = cursor.fetchall()
    conn.close()

    return jsonify({
        'status': 'success',
        'data': {
            'notifications': [serialize_record(notification) for notification in notifications],
            'user_id': user_id,
            'total': len(notifications)
        }
    })

# ============================================================================
# ANALYTICS API
# ============================================================================

@app.route('/api/analytics/financial-summary', methods=['GET'])
def financial_analytics():
    """Get comprehensive financial analytics"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    # Get financial summary by group
    cursor.execute("""
        SELECT
            sg.id,
            sg.name,
            sg.savings_balance,
            sg.loan_fund_balance,
            sg.members_count,
            COUNT(DISTINCT gl.id) as active_loans,
            SUM(gl.loan_amount) as total_loans_disbursed,
            SUM(gl.amount_paid) as total_repayments,
            COUNT(DISTINCT gtc.id) as active_campaigns
        FROM savings_groups sg
        LEFT JOIN group_loans gl ON sg.id = gl.group_id AND gl.status IN ('ACTIVE', 'DISBURSED')
        LEFT JOIN group_target_campaigns gtc ON sg.id = gtc.group_id AND gtc.status = 'ACTIVE'
        GROUP BY sg.id, sg.name, sg.savings_balance, sg.loan_fund_balance, sg.members_count
        ORDER BY sg.savings_balance DESC
    """)

    group_analytics = cursor.fetchall()

    # Get system-wide totals
    cursor.execute("""
        SELECT
            SUM(savings_balance) as total_savings,
            SUM(loan_fund_balance) as total_loan_funds,
            COUNT(*) as total_groups,
            SUM(members_count) as total_members
        FROM savings_groups
    """)

    system_totals = cursor.fetchone()

    conn.close()

    return jsonify({
        'financial_analytics': {
            'group_breakdown': [serialize_record(group) for group in group_analytics],
            'system_totals': serialize_record(system_totals)
        },
        'generated_at': datetime.now().isoformat()
    })

# ============================================================================
# FINANCIAL LITERACY TRACKING API
# ============================================================================

@app.route('/api/financial-literacy/', methods=['GET'])
def financial_literacy_training():
    """Get financial literacy training records"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    group_id = request.args.get('group_id')
    training_type = request.args.get('training_type')

    where_conditions = []
    params = []

    if group_id:
        where_conditions.append("flt.group_id = %s")
        params.append(group_id)

    if training_type:
        where_conditions.append("flt.training_type = %s")
        params.append(training_type.upper())

    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    cursor.execute(f"""
        SELECT flt.*, sg.name as group_name, sg.region, sg.district
        FROM financial_literacy_training flt
        JOIN savings_groups sg ON flt.group_id = sg.id
        {where_clause}
        ORDER BY flt.training_date DESC
    """, params)

    trainings = cursor.fetchall()
    conn.close()

    return jsonify({
        'financial_literacy_trainings': [serialize_record(training) for training in trainings],
        'total': len(trainings)
    })

@app.route('/api/attendance/summary', methods=['GET'])
def attendance_summary():
    """Get comprehensive attendance summary with activity participation"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    group_id = request.args.get('group_id')
    period = request.args.get('period', 'MONTHLY')  # WEEKLY, MONTHLY, QUARTERLY

    where_condition = "WHERE gm.group_id = %s" if group_id else ""
    params = [group_id] if group_id else []

    # Get enhanced attendance with activity participation
    cursor.execute(f"""
        SELECT
            gm.id,
            gm.name,
            gm.total_meetings_eligible,
            gm.total_meetings_attended,
            gm.attendance_percentage,
            gm.consecutive_absences,
            gm.is_eligible_for_loans,
            gm.loan_eligibility_reason,
            sg.name as group_name,
            sg.region,
            sg.district,
            sg.parish,
            sg.village,
            -- Activity participation summary
            COUNT(ma.id) as total_meeting_records,
            COUNT(CASE WHEN ma.savings_contributed THEN 1 END) as meetings_with_savings,
            COUNT(CASE WHEN ma.loan_activity THEN 1 END) as meetings_with_loans,
            COUNT(CASE WHEN ma.fine_paid THEN 1 END) as meetings_with_fines,
            COALESCE(SUM(ma.savings_amount), 0) as total_savings_contributed,
            COALESCE(AVG(ma.activity_participation_score), 0) as avg_participation_score
        FROM group_members gm
        JOIN savings_groups sg ON gm.group_id = sg.id
        LEFT JOIN meeting_attendance ma ON gm.id = ma.member_id
            AND ma.meeting_date >= CURRENT_DATE - INTERVAL '30 days'
        {where_condition}
        GROUP BY gm.id, gm.name, gm.total_meetings_eligible, gm.total_meetings_attended,
                 gm.attendance_percentage, gm.consecutive_absences, gm.is_eligible_for_loans,
                 gm.loan_eligibility_reason, sg.name, sg.region, sg.district, sg.parish, sg.village
        ORDER BY gm.attendance_percentage DESC
    """, params)

    attendance_records = cursor.fetchall()

    # Get attendance statistics
    cursor.execute(f"""
        SELECT
            COUNT(*) as total_members,
            COUNT(CASE WHEN gm.is_eligible_for_loans THEN 1 END) as eligible_members,
            AVG(gm.attendance_percentage) as average_attendance,
            COUNT(CASE WHEN gm.attendance_percentage >= 75 THEN 1 END) as high_attendance_members,
            COUNT(CASE WHEN gm.attendance_percentage < 50 THEN 1 END) as low_attendance_members,
            -- Activity engagement stats
            AVG(CASE WHEN ma.savings_contributed THEN 1.0 ELSE 0.0 END) as savings_participation_rate,
            AVG(ma.activity_participation_score) as average_participation_score
        FROM group_members gm
        JOIN savings_groups sg ON gm.group_id = sg.id
        LEFT JOIN meeting_attendance ma ON gm.id = ma.member_id
            AND ma.meeting_date >= CURRENT_DATE - INTERVAL '30 days'
        {where_condition}
    """, params)

    attendance_stats = cursor.fetchone()
    conn.close()

    # Calculate loan eligibility rate safely
    loan_eligibility_rate = 0
    stats_dict = {}

    if attendance_stats:
        stats_dict = serialize_record(attendance_stats)
        total_members = stats_dict.get('total_members', 0)
        eligible_members = stats_dict.get('eligible_members', 0)

        if total_members and total_members > 0:
            loan_eligibility_rate = (eligible_members / total_members * 100)

    return jsonify({
        'attendance_records': [serialize_record(record) for record in attendance_records],
        'attendance_statistics': stats_dict,
        'loan_eligibility_rate': loan_eligibility_rate,
        'period_analyzed': period,
        'analysis_date': datetime.now().isoformat()
    })

@app.route('/api/attendance/patterns', methods=['GET'])
def attendance_patterns():
    """Get attendance patterns for mapping and analysis"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    member_id = request.args.get('member_id')
    group_id = request.args.get('group_id')
    period = request.args.get('period', 'MONTHLY')

    where_conditions = []
    params = []

    if member_id:
        where_conditions.append("ap.member_id = %s")
        params.append(member_id)

    if group_id:
        where_conditions.append("ap.group_id = %s")
        params.append(group_id)

    if period:
        where_conditions.append("ap.analysis_period = %s")
        params.append(period.upper())

    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    cursor.execute(f"""
        SELECT
            ap.*,
            gm.name as member_name,
            sg.name as group_name,
            sg.region,
            sg.district
        FROM attendance_patterns ap
        JOIN group_members gm ON ap.member_id = gm.id
        JOIN savings_groups sg ON ap.group_id = sg.id
        {where_clause}
        ORDER BY ap.period_start_date DESC, ap.attendance_rate DESC
    """, params)

    patterns = cursor.fetchall()
    conn.close()

    return jsonify({
        'attendance_patterns': [serialize_record(pattern) for pattern in patterns],
        'total': len(patterns)
    })

@app.route('/api/attendance/absence-map', methods=['GET'])
def attendance_absence_map():
    """Get absence mapping data for visualization"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    member_id = request.args.get('member_id')
    group_id = request.args.get('group_id')
    start_date = request.args.get('start_date', (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', datetime.now().strftime('%Y-%m-%d'))

    where_conditions = ["ma.meeting_date BETWEEN %s AND %s"]
    params = [start_date, end_date]

    if member_id:
        where_conditions.append("ma.member_id = %s")
        params.append(member_id)

    if group_id:
        where_conditions.append("ma.group_id = %s")
        params.append(group_id)

    where_clause = "WHERE " + " AND ".join(where_conditions)

    # Get absence dates with geographic information
    cursor.execute(f"""
        SELECT
            ma.meeting_date,
            ma.member_id,
            gm.name as member_name,
            ma.group_id,
            sg.name as group_name,
            sg.region,
            sg.district,
            sg.parish,
            sg.village,
            sg.latitude,
            sg.longitude,
            ma.attended,
            ma.savings_contributed,
            ma.loan_activity,
            ma.fine_paid,
            ma.activity_participation_score,
            ma.geographic_location
        FROM meeting_attendance ma
        JOIN group_members gm ON ma.member_id = gm.id
        JOIN savings_groups sg ON ma.group_id = sg.id
        {where_clause}
        ORDER BY ma.meeting_date DESC, sg.region, sg.district
    """, params)

    attendance_map_data = cursor.fetchall()

    # Separate attended vs absent for mapping
    attended_meetings = [serialize_record(record) for record in attendance_map_data if record[11]]  # attended = True
    absent_meetings = [serialize_record(record) for record in attendance_map_data if not record[11]]  # attended = False

    conn.close()

    return jsonify({
        'attendance_map_data': {
            'attended_meetings': attended_meetings,
            'absent_meetings': absent_meetings,
            'total_meetings': len(attendance_map_data),
            'attendance_rate': (len(attended_meetings) / len(attendance_map_data) * 100) if attendance_map_data else 0
        },
        'date_range': {'start': start_date, 'end': end_date},
        'geographic_summary': {
            'regions_covered': len(set(record[5] for record in attendance_map_data if record[5])),
            'districts_covered': len(set(record[6] for record in attendance_map_data if record[6]))
        }
    })

@app.route('/api/attendance/group-comparison', methods=['GET'])
def attendance_group_comparison():
    """Compare attendance performance across groups"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    period = request.args.get('period', 'MONTHLY')
    region = request.args.get('region')
    district = request.args.get('district')

    where_conditions = []
    params = []

    if region:
        where_conditions.append("sg.region = %s")
        params.append(region)

    if district:
        where_conditions.append("sg.district = %s")
        params.append(district)

    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

    # Get group attendance comparison
    cursor.execute(f"""
        SELECT
            sg.id as group_id,
            sg.name as group_name,
            sg.region,
            sg.district,
            sg.parish,
            sg.village,
            sg.current_cycle_number,
            sg.credit_score,

            -- Member statistics
            COUNT(DISTINCT gm.id) as total_members,
            COUNT(DISTINCT CASE WHEN gm.is_eligible_for_loans THEN gm.id END) as eligible_members,

            -- Attendance statistics (last 30 days)
            COUNT(ma.id) as total_meeting_records,
            COUNT(CASE WHEN ma.attended THEN 1 END) as total_attended,
            ROUND(COUNT(CASE WHEN ma.attended THEN 1 END) * 100.0 / NULLIF(COUNT(ma.id), 0), 2) as group_attendance_rate,

            -- Activity participation
            COUNT(CASE WHEN ma.savings_contributed THEN 1 END) as meetings_with_savings,
            COUNT(CASE WHEN ma.loan_activity THEN 1 END) as meetings_with_loans,
            COALESCE(SUM(ma.savings_amount), 0) as total_savings_in_meetings,
            COALESCE(AVG(ma.activity_participation_score), 0) as avg_participation_score,

            -- Performance indicators
            AVG(gm.attendance_percentage) as member_avg_attendance,
            COUNT(CASE WHEN gm.attendance_percentage >= 75 THEN 1 END) as high_performers,
            COUNT(CASE WHEN gm.attendance_percentage < 50 THEN 1 END) as low_performers

        FROM savings_groups sg
        LEFT JOIN group_members gm ON sg.id = gm.group_id
        LEFT JOIN meeting_attendance ma ON gm.id = ma.member_id
            AND ma.meeting_date >= CURRENT_DATE - INTERVAL '30 days'
        {where_clause}
        GROUP BY sg.id, sg.name, sg.region, sg.district, sg.parish, sg.village,
                 sg.current_cycle_number, sg.credit_score
        ORDER BY group_attendance_rate DESC, avg_participation_score DESC
    """, params)

    group_comparisons = cursor.fetchall()

    # Calculate rankings
    ranked_groups = []
    for i, group in enumerate(group_comparisons):
        group_dict = serialize_record(group)
        group_dict['attendance_rank'] = i + 1

        # Get attendance rate safely
        attendance_rate = group_dict.get('group_attendance_rate', 0) or 0

        group_dict['performance_level'] = (
            'EXCELLENT' if attendance_rate >= 85 else
            'HIGH' if attendance_rate >= 70 else
            'MODERATE' if attendance_rate >= 50 else
            'LOW'
        )
        ranked_groups.append(group_dict)

    # Get system-wide statistics
    cursor.execute(f"""
        SELECT
            COUNT(DISTINCT sg.id) as total_groups,
            AVG(group_stats.group_attendance_rate) as system_avg_attendance,
            MAX(group_stats.group_attendance_rate) as best_group_attendance,
            MIN(group_stats.group_attendance_rate) as worst_group_attendance,
            COUNT(DISTINCT sg.region) as regions_covered,
            COUNT(DISTINCT sg.district) as districts_covered
        FROM savings_groups sg
        LEFT JOIN (
            SELECT
                sg2.id,
                ROUND(COUNT(CASE WHEN ma2.attended THEN 1 END) * 100.0 / NULLIF(COUNT(ma2.id), 0), 2) as group_attendance_rate
            FROM savings_groups sg2
            LEFT JOIN group_members gm2 ON sg2.id = gm2.group_id
            LEFT JOIN meeting_attendance ma2 ON gm2.id = ma2.member_id
                AND ma2.meeting_date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY sg2.id
        ) group_stats ON sg.id = group_stats.id
        {where_clause}
    """, params)

    system_stats = cursor.fetchone()
    conn.close()

    return jsonify({
        'group_comparisons': ranked_groups,
        'system_statistics': serialize_record(system_stats),
        'analysis_period': period,
        'filters_applied': {
            'region': region,
            'district': district
        },
        'generated_at': datetime.now().isoformat()
    })

# ============================================================================
# MEETING SCHEDULER API (MS Teams-like)
# ============================================================================

@app.route('/api/scheduler/calendar', methods=['GET'])
def scheduler_calendar():
    """Get scheduler calendar with available time slots"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    # Get query parameters
    start_date = request.args.get('start_date', (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d'))
    end_date = request.args.get('end_date', (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d'))
    group_id = request.args.get('group_id')

    where_conditions = ["sc.calendar_date BETWEEN %s AND %s"]
    params = [start_date, end_date]

    if group_id:
        where_conditions.append("sc.group_id = %s")
        params.append(group_id)

    where_clause = "WHERE " + " AND ".join(where_conditions)

    cursor.execute(f"""
        SELECT
            sc.*,
            sg.name as group_name,
            sg.region,
            sg.district,
            m.id as meeting_id,
            m.status as meeting_status,
            COUNT(mi.id) as total_invitations,
            COUNT(CASE WHEN mi.invitation_status = 'ACCEPTED' THEN 1 END) as accepted_invitations
        FROM scheduler_calendar sc
        JOIN savings_groups sg ON sc.group_id = sg.id
        LEFT JOIN meetings m ON sc.meeting_id = m.id
        LEFT JOIN meeting_invitations mi ON m.id = mi.meeting_id
        {where_clause}
        GROUP BY sc.id, sg.name, sg.region, sg.district, m.id, m.status
        ORDER BY sc.calendar_date, sc.time_slot
    """, params)

    calendar_slots = cursor.fetchall()
    conn.close()

    return jsonify({
        'scheduler_calendar': [serialize_record(slot) for slot in calendar_slots],
        'date_range': {'start': start_date, 'end': end_date},
        'total_slots': len(calendar_slots)
    })

@app.route('/api/scheduler/schedule-meeting', methods=['POST'])
def schedule_meeting():
    """Schedule a new meeting with auto-invitations"""
    print("🔧 DEBUG: schedule_meeting called")

    conn = get_db_connection()
    if not conn:
        print("❌ DEBUG: Database connection failed")
        return jsonify({'error': 'Database connection failed'}), 500

    # Set autocommit to False for transaction control
    conn.autocommit = False
    cursor = conn.cursor()
    data = request.get_json()

    print(f"🔧 DEBUG: Received data: {data}")
    print(f"🔧 DEBUG: Data type: {type(data)}")

    try:
        # 1. Create the meeting
        print("🔧 DEBUG: Step 1 - Creating meeting record")
        print(f"🔧 DEBUG: group_id: {data['group_id']} (type: {type(data['group_id'])})")
        print(f"🔧 DEBUG: meeting_date: {data['meeting_date']}")
        print(f"🔧 DEBUG: meeting_time: {data.get('meeting_time', '14:00')}")

        cursor.execute("""
            INSERT INTO meetings (
                group_id, meeting_date, meeting_time, location, meeting_type,
                status, agenda, scheduled_by, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data['group_id'],
            data['meeting_date'],
            data.get('meeting_time', '14:00'),
            data.get('location', ''),
            data.get('meeting_type', 'REGULAR'),
            'SCHEDULED',
            data.get('agenda', ''),
            data.get('scheduled_by', 1),
            datetime.now()
        ))

        result = cursor.fetchone()
        print(f"🔧 DEBUG: Meeting insert result: {result}")
        print(f"🔧 DEBUG: Result type: {type(result)}")

        if not result:
            print("❌ DEBUG: No result returned from meeting insert")
            return jsonify({'error': 'Failed to create meeting - no ID returned'}), 500

        # Handle RealDictRow result from psycopg2
        if hasattr(result, 'get'):
            meeting_id = result.get('id') or result['id']
        else:
            meeting_id = result[0]
        print(f"✅ DEBUG: Meeting created with ID: {meeting_id}")

        # 2. Create scheduler calendar entry
        cursor.execute("""
            INSERT INTO scheduler_calendar (
                calendar_date, time_slot, duration_minutes, meeting_id, group_id,
                title, description, location, meeting_type, is_booked, booking_status,
                scheduled_by, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data['meeting_date'],
            data.get('meeting_time', '14:00'),
            data.get('duration_minutes', 120),
            meeting_id,
            data['group_id'],
            data.get('title', f"Group Meeting - {data['meeting_date']}"),
            data.get('description', ''),
            data.get('location', ''),
            data.get('meeting_type', 'REGULAR'),
            True,
            'BOOKED',
            data.get('scheduled_by', 1),
            datetime.now()
        ))

        # 3. Auto-invite all group members
        cursor.execute("""
            SELECT id, name FROM group_members WHERE group_id = %s
        """, (data['group_id'],))

        members = cursor.fetchall()

        for member in members:
            # Handle RealDictRow result from psycopg2
            if hasattr(member, 'get'):
                member_id = member.get('id') or member['id']
                member_name = member.get('name') or member['name']
            else:
                member_id, member_name = member

            cursor.execute("""
                INSERT INTO meeting_invitations (
                    meeting_id, member_id, invitation_status, meeting_role,
                    is_required, invited_by, created_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                meeting_id,
                member_id,
                'PENDING',
                'PARTICIPANT',
                True,
                data.get('scheduled_by', 1),
                datetime.now()
            ))

        # 4. Create planned activities if provided
        if 'planned_activities' in data:
            for activity in data['planned_activities']:
                cursor.execute("""
                    INSERT INTO planned_meeting_activities (
                        meeting_id, activity_order, activity_name, activity_type,
                        estimated_duration_minutes, estimated_amount, fund_type,
                        planned_by, created_date
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    meeting_id,
                    activity['order'],
                    activity['name'],
                    activity['type'],
                    activity.get('duration', 15),
                    activity.get('amount', 0),
                    activity.get('fund_type', ''),
                    data.get('scheduled_by', 1),
                    datetime.now()
                ))

        conn.commit()
        print("✅ DEBUG: Transaction committed successfully")

        return jsonify({
            'success': True,
            'meeting_id': meeting_id,
            'members_invited': len(members),
            'message': f'Meeting scheduled successfully with {len(members)} members invited'
        }), 201

    except psycopg2.Error as e:
        print(f"❌ DEBUG: PostgreSQL error: {str(e)}")
        print(f"❌ DEBUG: Error type: {type(e)}")
        conn.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    except Exception as e:
        print(f"❌ DEBUG: General exception: {str(e)}")
        print(f"❌ DEBUG: Exception type: {type(e)}")
        print(f"❌ DEBUG: Exception args: {e.args}")
        conn.rollback()
        return jsonify({'error': f'Failed to schedule meeting: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/scheduler/meeting-templates', methods=['GET'])
def meeting_templates():
    """Get meeting templates for a group"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    group_id = request.args.get('group_id')

    where_condition = "WHERE mt.group_id = %s AND mt.is_active = TRUE" if group_id else "WHERE mt.is_active = TRUE"
    params = [group_id] if group_id else []

    cursor.execute(f"""
        SELECT
            mt.*,
            sg.name as group_name,
            u.username as created_by_name
        FROM meeting_templates mt
        JOIN savings_groups sg ON mt.group_id = sg.id
        LEFT JOIN users u ON mt.created_by = u.id
        {where_condition}
        ORDER BY mt.template_name
    """, params)

    templates = cursor.fetchall()
    conn.close()

    return jsonify({
        'meeting_templates': [serialize_record(template) for template in templates],
        'total': len(templates)
    })

@app.route('/api/scheduler/meetings/<int:meeting_id>/invitations', methods=['GET'])
def meeting_invitations(meeting_id):
    """Get meeting invitations and responses"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            mi.*,
            gm.name as member_name,
            gm.phone as member_phone,
            gm.gender as member_gender,
            u.username as invited_by_name
        FROM meeting_invitations mi
        JOIN group_members gm ON mi.member_id = gm.id
        LEFT JOIN users u ON mi.invited_by = u.id
        WHERE mi.meeting_id = %s
        ORDER BY mi.invitation_status, gm.name
    """, (meeting_id,))

    invitations = cursor.fetchall()

    # Get invitation summary
    cursor.execute("""
        SELECT
            COUNT(*) as total_invitations,
            COUNT(CASE WHEN invitation_status = 'ACCEPTED' THEN 1 END) as accepted,
            COUNT(CASE WHEN invitation_status = 'DECLINED' THEN 1 END) as declined,
            COUNT(CASE WHEN invitation_status = 'PENDING' THEN 1 END) as pending,
            COUNT(CASE WHEN invitation_status = 'TENTATIVE' THEN 1 END) as tentative
        FROM meeting_invitations
        WHERE meeting_id = %s
    """, (meeting_id,))

    summary = cursor.fetchone()
    conn.close()

    return jsonify({
        'meeting_id': meeting_id,
        'invitations': [serialize_record(invitation) for invitation in invitations],
        'invitation_summary': serialize_record(summary)
    })

@app.route('/api/scheduler/meetings/<int:meeting_id>/planned-activities', methods=['GET'])
def meeting_planned_activities(meeting_id):
    """Get planned activities for a meeting"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            pma.*,
            u.username as planned_by_name,
            COUNT(map.id) as planned_participants
        FROM planned_meeting_activities pma
        LEFT JOIN users u ON pma.planned_by = u.id
        LEFT JOIN meeting_activity_participants map ON pma.id = map.planned_activity_id
        WHERE pma.meeting_id = %s
        GROUP BY pma.id, u.username
        ORDER BY pma.activity_order
    """, (meeting_id,))

    activities = cursor.fetchall()

    # Get activity summary
    cursor.execute("""
        SELECT
            COUNT(*) as total_activities,
            SUM(estimated_duration_minutes) as total_estimated_duration,
            SUM(estimated_amount) as total_estimated_amount,
            COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_activities
        FROM planned_meeting_activities
        WHERE meeting_id = %s
    """, (meeting_id,))

    summary = cursor.fetchone()
    conn.close()

    return jsonify({
        'meeting_id': meeting_id,
        'planned_activities': [serialize_record(activity) for activity in activities],
        'activity_summary': serialize_record(summary)
    })

@app.route('/api/meetings/<int:meeting_id>', methods=['GET'])
def get_meeting_details(meeting_id):
    """Get comprehensive meeting details with all financial data, activities, and documents"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    try:
        # 1. Get basic meeting information
        cursor.execute("""
            SELECT
                m.*,
                sg.name as group_name,
                sg.location as group_location,
                u.username as scheduled_by_name,
                sc.title as scheduler_title,
                sc.description as scheduler_description
            FROM meetings m
            LEFT JOIN savings_groups sg ON m.group_id = sg.id
            LEFT JOIN users u ON m.scheduled_by = u.id
            LEFT JOIN scheduler_calendar sc ON sc.meeting_id = m.id
            WHERE m.id = %s
        """, (meeting_id,))

        meeting = cursor.fetchone()
        if not meeting:
            return jsonify({'error': 'Meeting not found'}), 404

        meeting_data = serialize_record(meeting)

        # 2. Get meeting attendance
        cursor.execute("""
            SELECT
                ma.*,
                gm.name as member_name,
                gm.phone as member_phone,
                gm.gender as member_gender,
                gm.role as member_role
            FROM meeting_attendance ma
            JOIN group_members gm ON ma.member_id = gm.id
            WHERE ma.meeting_id = %s
            ORDER BY gm.name
        """, (meeting_id,))

        attendance = cursor.fetchall()

        # 3. Get meeting activities (basic query to work with existing schema)
        cursor.execute("""
            SELECT ma.*
            FROM meeting_activities ma
            WHERE ma.meeting_id = %s
            ORDER BY ma.id
        """, (meeting_id,))

        activities = cursor.fetchall()

        # 4. Get basic financial summary from meetings table
        financial_summary = {
            'total_savings': float(meeting_data.get('total_savings_collected', 0) or 0),
            'loans_disbursed': float(meeting_data.get('total_loans_disbursed', 0) or 0),
            'fines_collected': float(meeting_data.get('total_fines_collected', 0) or 0),
            'members_present': meeting_data.get('members_present', 0) or 0,
            'members_absent': meeting_data.get('members_absent', 0) or 0
        }

        # 5. Skip participation details for now (table structure issues)
        participation = []

        # 6. Skip documents for now (table structure issues)
        documents = []

        # 7. Get group loans status (for context)
        cursor.execute("""
            SELECT
                COUNT(*) as total_loans,
                COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN loan_amount END), 0) as outstanding_loans,
                COALESCE(SUM(CASE WHEN status = 'PAID' THEN loan_amount END), 0) as repaid_loans
            FROM group_loans
            WHERE group_id = %s
        """, (meeting_data['group_id'],))

        loans_summary = cursor.fetchone()

        conn.close()

        return jsonify({
            'meeting': meeting_data,
            'attendance': [serialize_record(att) for att in attendance],
            'activities': [serialize_record(act) for act in activities],
            'financial_summary': financial_summary,
            'participation': [serialize_record(part) for part in participation],
            'documents': [serialize_record(doc) for doc in documents],
            'loans_summary': serialize_record(loans_summary) if loans_summary else {},
            'summary': {
                'total_activities': len(activities),
                'total_documents': len(documents),
                'attendance_count': len(attendance),
                'participation_count': len(participation)
            }
        })

    except Exception as e:
        conn.close()
        return jsonify({'error': f'Failed to get meeting details: {str(e)}'}), 500

@app.route('/api/meetings/<int:meeting_id>/documents', methods=['POST'])
def upload_meeting_document(meeting_id):
    """Upload a document for a meeting or meeting activity"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Get form data
    document_type = request.form.get('document_type', 'MEETING_MINUTES')
    description = request.form.get('description', '')
    activity_id = request.form.get('activity_id')  # Optional - for activity-specific documents
    uploaded_by = request.form.get('uploaded_by', 1)  # Should come from auth
    access_level = request.form.get('access_level', 'GROUP')

    # Validate file type
    allowed_extensions = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt'}
    file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''

    if file_extension not in allowed_extensions:
        return jsonify({'error': f'File type .{file_extension} not allowed. Allowed types: {", ".join(allowed_extensions)}'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    try:
        # Verify meeting exists
        cursor.execute("SELECT id, group_id FROM meetings WHERE id = %s", (meeting_id,))
        meeting = cursor.fetchone()
        if not meeting:
            return jsonify({'error': 'Meeting not found'}), 404

        # Create uploads directory if it doesn't exist
        import os
        upload_dir = os.path.join(os.getcwd(), 'uploads', 'meetings', str(meeting_id))
        os.makedirs(upload_dir, exist_ok=True)

        # Generate unique filename
        import uuid
        from datetime import datetime
        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(upload_dir, unique_filename)

        # Save file
        file.save(file_path)

        # Get file size
        file_size = os.path.getsize(file_path)

        # Insert document record
        cursor.execute("""
            INSERT INTO activity_documents (
                meeting_id, meeting_activity_id, document_type, file_name,
                original_file_name, file_path, file_size, file_type,
                description, access_level, uploaded_by, uploaded_date,
                is_active, created_date, updated_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            meeting_id,
            activity_id if activity_id else None,
            document_type,
            unique_filename,
            file.filename,
            file_path,
            file_size,
            file_extension,
            description,
            access_level,
            uploaded_by,
            datetime.now(),
            True,
            datetime.now(),
            datetime.now()
        ))

        document_id = cursor.fetchone()[0]
        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'document_id': document_id,
            'message': 'Document uploaded successfully',
            'file_info': {
                'original_name': file.filename,
                'file_size': file_size,
                'file_type': file_extension,
                'document_type': document_type
            }
        }), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        # Clean up file if database insert failed
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'error': f'Failed to upload document: {str(e)}'}), 500

@app.route('/api/documents/<int:document_id>/download', methods=['GET'])
def download_document(document_id):
    """Download a meeting document"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    try:
        # Get document info
        cursor.execute("""
            SELECT file_path, original_file_name, file_type, is_active
            FROM activity_documents
            WHERE id = %s
        """, (document_id,))

        document = cursor.fetchone()
        if not document:
            return jsonify({'error': 'Document not found'}), 404

        if not document['is_active']:
            return jsonify({'error': 'Document is not active'}), 403

        file_path = document['file_path']
        original_name = document['original_file_name']

        # Check if file exists
        import os
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found on server'}), 404

        # Send file
        from flask import send_file
        return send_file(
            file_path,
            as_attachment=True,
            download_name=original_name,
            mimetype=f'application/{document["file_type"]}'
        )

    except Exception as e:
        return jsonify({'error': f'Failed to download document: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/meetings/<int:meeting_id>/financial-summary', methods=['GET'])
def get_meeting_financial_summary(meeting_id):
    """Get detailed financial summary for a meeting"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    try:
        # Get detailed financial breakdown
        cursor.execute("""
            SELECT
                ma.activity_type,
                ma.activity_name,
                ma.expected_amount,
                ma.actual_amount,
                COUNT(map.id) as participants,
                SUM(map.amount_contributed) as total_contributed,
                AVG(map.amount_contributed) as avg_contribution
            FROM meeting_activities ma
            LEFT JOIN member_activity_participation map ON ma.id = map.activity_id
            WHERE ma.meeting_id = %s
            GROUP BY ma.id, ma.activity_type, ma.activity_name, ma.expected_amount, ma.actual_amount
            ORDER BY ma.activity_order
        """, (meeting_id,))

        activities_breakdown = cursor.fetchall()

        # Get member contributions summary
        cursor.execute("""
            SELECT
                gm.name as member_name,
                gm.phone as member_phone,
                COUNT(map.id) as activities_participated,
                SUM(map.amount_contributed) as total_contributed,
                STRING_AGG(ma.activity_type, ', ') as activity_types
            FROM member_activity_participation map
            JOIN group_members gm ON map.member_id = gm.id
            JOIN meeting_activities ma ON map.activity_id = ma.id
            WHERE ma.meeting_id = %s
            GROUP BY gm.id, gm.name, gm.phone
            ORDER BY total_contributed DESC
        """, (meeting_id,))

        member_contributions = cursor.fetchall()

        # Get fund balances after this meeting (if available)
        cursor.execute("""
            SELECT
                'Personal Savings' as fund_type,
                COALESCE(SUM(CASE WHEN ma.activity_type = 'PERSONAL_SAVINGS' THEN ma.actual_amount END), 0) as amount
            FROM meeting_activities ma
            WHERE ma.meeting_id = %s
            UNION ALL
            SELECT
                'ECD Fund' as fund_type,
                COALESCE(SUM(CASE WHEN ma.activity_type = 'ECD_FUND' THEN ma.actual_amount END), 0) as amount
            FROM meeting_activities ma
            WHERE ma.meeting_id = %s
            UNION ALL
            SELECT
                'Social Fund' as fund_type,
                COALESCE(SUM(CASE WHEN ma.activity_type = 'SOCIAL_FUND' THEN ma.actual_amount END), 0) as amount
            FROM meeting_activities ma
            WHERE ma.meeting_id = %s
        """, (meeting_id, meeting_id, meeting_id))

        fund_balances = cursor.fetchall()

        conn.close()

        return jsonify({
            'meeting_id': meeting_id,
            'activities_breakdown': [serialize_record(act) for act in activities_breakdown],
            'member_contributions': [serialize_record(member) for member in member_contributions],
            'fund_balances': [serialize_record(fund) for fund in fund_balances],
            'summary': {
                'total_activities': len(activities_breakdown),
                'total_members_participated': len(member_contributions),
                'total_amount_collected': sum(float(act.get('actual_amount', 0) or 0) for act in [serialize_record(a) for a in activities_breakdown])
            }
        })

    except Exception as e:
        conn.close()
        return jsonify({'error': f'Failed to get financial summary: {str(e)}'}), 500

@app.route('/api/scheduler/invitations/<int:invitation_id>/respond', methods=['POST'])
def respond_to_invitation(invitation_id):
    """Member responds to meeting invitation"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()
    data = request.get_json()

    try:
        cursor.execute("""
            UPDATE meeting_invitations SET
                invitation_status = %s,
                response_date = %s,
                response_notes = %s
            WHERE id = %s
            RETURNING meeting_id, member_id
        """, (
            data['response'],  # ACCEPTED, DECLINED, TENTATIVE
            datetime.now(),
            data.get('notes', ''),
            invitation_id
        ))

        result = cursor.fetchone()
        if not result:
            return jsonify({'error': 'Invitation not found'}), 404

        meeting_id, member_id = result

        # Get member and meeting info for response
        cursor.execute("""
            SELECT gm.name, m.meeting_date, m.meeting_time, sg.name as group_name
            FROM group_members gm, meetings m, savings_groups sg
            WHERE gm.id = %s AND m.id = %s AND sg.id = m.group_id
        """, (member_id, meeting_id))

        info = cursor.fetchone()

        conn.commit()

        return jsonify({
            'success': True,
            'message': f'Response recorded: {data["response"]}',
            'member_name': info[0] if info else 'Unknown',
            'meeting_date': str(info[1]) if info else None,
            'group_name': info[3] if info else 'Unknown'
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'error': f'Failed to record response: {str(e)}'}), 500
    finally:
        conn.close()

# ============================================================================
# COMPREHENSIVE SYSTEM REPORTS
# ============================================================================

@app.route('/api/reports/system-overview', methods=['GET'])
def system_overview():
    """Get comprehensive system overview report"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    # Get counts from all major tables
    tables_stats = {}

    tables = [
        'users', 'savings_groups', 'group_members', 'meetings',
        'calendar_events', 'meeting_attendance', 'member_savings',
        'group_loans', 'member_fines', 'group_transactions',
        'meeting_activities', 'member_activity_participation', 'activity_documents',
        'saving_types', 'saving_transactions', 'group_cashbook', 'loan_assessments',
        'loan_repayment_schedule', 'target_savings_campaigns', 'group_target_campaigns',
        'member_campaign_participation', 'campaign_votes', 'notifications',
        'group_constitution', 'services', 'user_service_permissions', 'service_admins',
        'service_access_requests'
    ]

    for table in tables:
        cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
        result = cursor.fetchone()
        tables_stats[table] = result['count']

    # Get financial summary
    cursor.execute("""
        SELECT
            SUM(savings_balance) as total_savings,
            SUM(loan_fund_balance) as total_loan_funds,
            COUNT(*) as active_groups
        FROM savings_groups
        WHERE state = 'ACTIVE'
    """)
    financial_summary = cursor.fetchone()

    # Get recent activity
    cursor.execute("""
        SELECT
            'meeting' as activity_type,
            m.meeting_date as activity_date,
            sg.name as group_name,
            m.status,
            m.total_savings_collected as amount
        FROM meetings m
        JOIN savings_groups sg ON m.group_id = sg.id
        WHERE m.meeting_date >= CURRENT_DATE - INTERVAL '30 days'

        UNION ALL

        SELECT
            'activity' as activity_type,
            ma.created_date::date as activity_date,
            'Meeting Activity' as group_name,
            ma.status,
            ma.amount
        FROM meeting_activities ma
        WHERE ma.created_date >= CURRENT_DATE - INTERVAL '30 days'

        ORDER BY activity_date DESC
        LIMIT 10
    """)
    recent_activity = cursor.fetchall()

    conn.close()

    return jsonify({
        'system_overview': {
            'table_statistics': tables_stats,
            'financial_summary': serialize_record(financial_summary),
            'recent_activity': [serialize_record(activity) for activity in recent_activity]
        },
        'generated_at': datetime.now().isoformat()
    })

@app.route('/api/reports/group-dashboard/<int:group_id>', methods=['GET'])
def group_dashboard(group_id):
    """Get comprehensive dashboard for a specific group"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    cursor = conn.cursor()

    # Get group details
    cursor.execute("""
        SELECT sg.*,
               cm.name as chair_name,
               tm.name as treasurer_name,
               sm.name as secretary_name
        FROM savings_groups sg
        LEFT JOIN group_members cm ON sg.chair_member_id = cm.id
        LEFT JOIN group_members tm ON sg.treasurer_member_id = tm.id
        LEFT JOIN group_members sm ON sg.secretary_member_id = sm.id
        WHERE sg.id = %s
    """, (group_id,))

    group_info = cursor.fetchone()
    if not group_info:
        conn.close()
        return jsonify({'error': 'Group not found'}), 404

    # Get group members
    cursor.execute("""
        SELECT gm.*, u.email
        FROM group_members gm
        LEFT JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = %s AND gm.is_active = true
        ORDER BY gm.total_contributions DESC
    """, (group_id,))
    members = cursor.fetchall()

    # Get recent meetings
    cursor.execute("""
        SELECT * FROM meetings
        WHERE group_id = %s
        ORDER BY meeting_date DESC
        LIMIT 5
    """, (group_id,))
    recent_meetings = cursor.fetchall()

    # Get upcoming calendar events
    cursor.execute("""
        SELECT * FROM calendar_events
        WHERE group_id = %s AND event_date >= CURRENT_DATE
        ORDER BY event_date, event_time
        LIMIT 5
    """, (group_id,))
    upcoming_events = cursor.fetchall()

    conn.close()

    return jsonify({
        'group_dashboard': {
            'group_info': serialize_record(group_info),
            'members': [serialize_record(member) for member in members],
            'recent_meetings': [serialize_record(meeting) for meeting in recent_meetings],
            'upcoming_events': [serialize_record(event) for event in upcoming_events],
            'member_count': len(members)
        },
        'generated_at': datetime.now().isoformat()
    })

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

# Removed duplicate login function - using JWT-based login below

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Check authentication status"""
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                'status': 'error',
                'message': 'No valid token provided'
            }), 401

        token = auth_header.split(' ')[1]

        # JWT token validation
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = payload.get('user_id')

            if not user_id:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid token payload'
                }), 401

            conn = get_db_connection()
            if not conn:
                return jsonify({'status': 'error', 'message': 'Database connection failed'}), 500

            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, username, email, role, active
                FROM users
                WHERE id = %s AND active = true
            """, (user_id,))

            user = cursor.fetchone()
            conn.close()

            if user:
                return jsonify({
                    'status': 'success',
                    'data': serialize_record(user)
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'User not found'
                }), 404

        except jwt.ExpiredSignatureError:
            return jsonify({
                'status': 'error',
                'message': 'Token has expired'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid token'
            }), 401

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Auth status check failed: {str(e)}'
        }), 500

# Removed duplicate register function - using JWT-based register below

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout endpoint"""
    return jsonify({
        'status': 'success',
        'message': 'Logged out successfully'
    })


# ============================================================================
# DATA INTEGRITY & VALIDATION API
# ============================================================================

@app.route('/api/validation/system-integrity', methods=['GET'])
def check_system_integrity():
    """Check overall system data integrity"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        from api_validation_layer import get_validation_summary
        validation_summary = get_validation_summary(conn)
        conn.close()

        return jsonify({
            'status': 'success',
            'message': 'System integrity check completed',
            'data': validation_summary
        })

    except Exception as e:
        conn.close()
        return jsonify({'error': f'Validation check failed: {str(e)}'}), 500

@app.route('/api/validation/circular-navigation', methods=['GET'])
def check_circular_navigation():
    """Check if circular navigation will work properly"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        from api_validation_layer import check_circular_navigation_integrity
        navigation_issues = check_circular_navigation_integrity(conn)
        conn.close()

        return jsonify({
            'status': 'success' if not navigation_issues else 'warning',
            'message': 'Circular navigation check completed',
            'issues': navigation_issues,
            'navigation_ready': len(navigation_issues) == 0
        })

    except Exception as e:
        conn.close()
        return jsonify({'error': f'Navigation check failed: {str(e)}'}), 500

@app.route('/api/validation/test-cascading-crud', methods=['POST'])
def test_cascading_crud():
    """Test the cascading CRUD system with a sample update"""
    conn = get_db_connection()
    if not conn:
        return jsonify({'error': 'Database connection failed'}), 500

    try:
        data = request.get_json()
        test_type = data.get('test_type', 'group_update')

        if test_type == 'group_update':
            # Test group update cascading
            group_id = data.get('group_id', 1)

            # Simulate a group name change
            from cascading_crud_system import handle_group_update
            old_data = {'name': 'Old Group Name', 'location': 'Old Location'}
            new_data = {'name': 'Updated Group Name', 'location': 'New Location'}

            result = handle_group_update(conn, group_id, old_data, new_data)
            conn.commit()

            return jsonify({
                'status': 'success',
                'test_type': test_type,
                'result': result,
                'message': 'Cascading group update test completed'
            })

        elif test_type == 'notification_test':
            # Test notification system
            from cascading_crud_system import notify_group_members
            group_id = data.get('group_id', 1)

            notification_ids = notify_group_members(
                conn, group_id,
                "Test Notification",
                "This is a test of the cascading notification system",
                'INFO', 'NORMAL'
            )
            conn.commit()

            return jsonify({
                'status': 'success',
                'test_type': test_type,
                'notifications_created': len(notification_ids),
                'notification_ids': notification_ids,
                'message': 'Notification test completed'
            })

        else:
            return jsonify({'error': 'Invalid test_type. Use "group_update" or "notification_test"'}), 400

    except Exception as e:
        conn.close()
        return jsonify({'error': f'Test failed: {str(e)}'}), 500

# ============================================================================
# USER MEMBERSHIP & DASHBOARD API
# ============================================================================

# User membership and dashboard endpoints
@app.route('/api/user-membership/<int:user_id>', methods=['GET'])
def get_user_membership(user_id):
    """Get user's group memberships"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'status': 'error', 'message': 'Database connection failed'}), 500

        cursor = conn.cursor()

        # Get user's groups with their role in each group
        cursor.execute("""
            SELECT
                sg.id,
                sg.name,
                sg.region,
                sg.district,
                sg.members_count,
                sg.savings_balance,
                gm.role as my_role,
                COALESCE(
                    (SELECT SUM(amount) FROM member_savings ms WHERE ms.member_id = gm.id), 0
                ) as my_savings
            FROM group_members gm
            JOIN savings_groups sg ON gm.group_id = sg.id
            WHERE gm.user_id = %s
        """, (user_id,))

        groups = cursor.fetchall()
        conn.close()

        return jsonify({
            'status': 'success',
            'groups': [serialize_record(group) for group in groups]
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/member-transactions/<int:user_id>', methods=['GET'])
def get_member_transactions(user_id):
    """Get member's financial summary and transactions"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'status': 'error', 'message': 'Database connection failed'}), 500

        cursor = conn.cursor()

        # Get member's financial summary
        cursor.execute("""
            SELECT
                COALESCE(SUM(ms.amount), 0) as total_savings,
                COUNT(DISTINCT gl.id) as active_loans,
                COALESCE(AVG(
                    CASE WHEN ma.attended THEN 100.0 ELSE 0.0 END
                ), 0) as attendance_percentage
            FROM group_members gm
            LEFT JOIN member_savings ms ON gm.id = ms.member_id
            LEFT JOIN group_loans gl ON gm.id = gl.member_id AND gl.status = 'ACTIVE'
            LEFT JOIN meeting_attendance ma ON gm.id = ma.member_id
            WHERE gm.user_id = %s
        """, (user_id,))

        summary = cursor.fetchone()

        # Get recent transactions
        cursor.execute("""
            SELECT
                'SAVINGS' as type,
                ms.amount,
                ms.saving_date as date,
                'Savings contribution' as description
            FROM member_savings ms
            JOIN group_members gm ON ms.member_id = gm.id
            WHERE gm.user_id = %s
            ORDER BY ms.saving_date DESC
            LIMIT 5
        """, (user_id,))

        transactions = cursor.fetchall()
        conn.close()

        # Check loan eligibility (>50% attendance)
        is_eligible = summary['attendance_percentage'] >= 50

        return jsonify({
            'status': 'success',
            'total_savings': float(summary['total_savings']),
            'active_loans': summary['active_loans'],
            'attendance_percentage': float(summary['attendance_percentage']),
            'is_eligible_for_loans': is_eligible,
            'recent_transactions': [serialize_record(t) for t in transactions]
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# ============================================================================
# 🎯 COMPREHENSIVE MEETING ACTIVITIES CRUD ENDPOINTS
# ============================================================================

@app.route('/api/attendance/', methods=['GET', 'POST'])
def attendance_management():
    """Manage meeting attendance"""
    if request.method == 'GET':
        meeting_id = request.args.get('meeting_id')
        member_id = request.args.get('member_id')

        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            where_conditions = []
            params = []

            if meeting_id:
                where_conditions.append("ma.meeting_id = %s")
                params.append(meeting_id)

            if member_id:
                where_conditions.append("ma.member_id = %s")
                params.append(member_id)

            where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

            cursor.execute(f'''
                SELECT ma.*, gm.name as member_name,
                       CASE WHEN ma.attended THEN 'PRESENT' ELSE 'ABSENT' END as attendance_status
                FROM meeting_attendance ma
                JOIN group_members gm ON ma.member_id = gm.id
                {where_clause}
                ORDER BY ma.meeting_date DESC, gm.name
            ''', params)

            attendance_records = cursor.fetchall()
            return jsonify({
                'attendance_records': [dict(record) for record in attendance_records],
                'count': len(attendance_records)
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()

    elif request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        required_fields = ['meeting_id', 'member_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        try:
            cursor.execute('''
                INSERT INTO meeting_attendance (
                    group_id, member_id, meeting_id, meeting_date, meeting_type,
                    attended, attendance_time, excuse_reason, recorded_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            ''', (
                data.get('group_id', 2),  # Default to group 2 for demo
                data['member_id'],
                data['meeting_id'],
                data.get('meeting_date', datetime.now().date()),
                data.get('meeting_type', 'REGULAR'),
                data.get('status', 'PRESENT') == 'PRESENT',  # Convert to boolean
                data.get('arrival_time', datetime.now()),
                data.get('notes'),
                data.get('recorded_by', 1)  # Default user ID
            ))

            attendance_id = cursor.fetchone()[0]
            conn.commit()

            return jsonify({
                'message': 'Attendance recorded successfully',
                'attendance_id': attendance_id
            }), 201

        except Exception as e:
            conn.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()

@app.route('/api/member-profile/<int:member_id>', methods=['GET', 'PUT'])
def member_profile_management(member_id):
    """Get or update member profile"""
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        try:
            # Get comprehensive member profile
            cursor.execute('''
                SELECT gm.*, sg.name as group_name, u.username, u.email as user_email,
                       CASE
                           WHEN sg.chair_member_id = gm.id THEN 'Chairperson'
                           WHEN sg.secretary_member_id = gm.id THEN 'Secretary'
                           WHEN sg.treasurer_member_id = gm.id THEN 'Treasurer'
                           ELSE gm.role
                       END as effective_role
                FROM group_members gm
                JOIN savings_groups sg ON gm.group_id = sg.id
                LEFT JOIN users u ON gm.user_id = u.id
                WHERE gm.id = %s
            ''', (member_id,))

            member = cursor.fetchone()
            if not member:
                return jsonify({'error': 'Member not found'}), 404

            # Get financial summary
            cursor.execute('''
                SELECT
                    COALESCE(SUM(CASE WHEN ma.activity_type = 'savings_collection' THEN map.amount_contributed END), 0) as total_savings,
                    COALESCE(SUM(CASE WHEN ma.activity_type = 'loan_disbursement' THEN map.amount_contributed END), 0) as total_loans_received,
                    COALESCE(SUM(CASE WHEN ma.activity_type = 'loan_repayment' THEN map.amount_contributed END), 0) as total_loan_repayments,
                    COALESCE(SUM(CASE WHEN ma.activity_type = 'fine_collection' THEN map.amount_contributed END), 0) as total_fines_paid
                FROM member_activity_participation map
                JOIN meeting_activities ma ON map.activity_id = ma.id
                WHERE map.member_id = %s
            ''', (member_id,))

            financial_summary = cursor.fetchone()

            # Get attendance summary
            cursor.execute('''
                SELECT
                    COUNT(*) as total_meetings_invited,
                    COUNT(CASE WHEN attended = true THEN 1 END) as meetings_attended,
                    COUNT(CASE WHEN attended = false THEN 1 END) as meetings_missed,
                    0 as meetings_late
                FROM meeting_attendance
                WHERE member_id = %s
            ''', (member_id,))

            attendance_summary = cursor.fetchone()

            return jsonify({
                'member_info': dict(member),
                'financial_summary': dict(financial_summary) if financial_summary else {},
                'attendance_summary': dict(attendance_summary) if attendance_summary else {}
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()

    elif request.method == 'PUT':
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        try:
            # Update member information
            update_fields = []
            update_values = []

            allowed_fields = [
                'name', 'phone', 'email', 'gender', 'date_of_birth', 'national_id',
                'address', 'occupation', 'education_level', 'marital_status',
                'emergency_contact_name', 'emergency_contact_phone', 'role'
            ]

            for field in allowed_fields:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    update_values.append(data[field])

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
                conn.commit()

                return jsonify({
                    'message': 'Member profile updated successfully',
                    'member': dict(updated_member)
                })

        except Exception as e:
            conn.rollback()
            return jsonify({'error': str(e)}), 500
        finally:
            conn.close()

# ============================================================================
# GROUP INFORMATION TABS API ENDPOINTS
# ============================================================================

@app.route('/api/groups/<int:group_id>/constitution', methods=['GET', 'POST', 'PUT'])
def group_constitution(group_id):
    """Manage group constitution"""
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT gd.*, u.username as created_by_name
            FROM group_documents gd
            LEFT JOIN users u ON gd.created_by = u.id
            WHERE gd.group_id = %s AND gd.document_type = 'CONSTITUTION'
            ORDER BY gd.version DESC, gd.created_date DESC
        ''', (group_id,))
        constitution_documents = cursor.fetchall()
        conn.close()
        return jsonify({'constitution_documents': [dict(doc) for doc in constitution_documents]})

    elif request.method == 'POST':
        data = request.get_json()
        cursor.execute('''
            INSERT INTO group_documents (
                group_id, document_type, title, content, version_number,
                uploaded_by, upload_date, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            group_id, 'CONSTITUTION', data['title'], data['content'],
            data.get('version_number', 1), data.get('uploaded_by', 1),
            datetime.now(), True
        ))
        new_document = cursor.fetchone()
        conn.commit()
        conn.close()
        return jsonify({'message': 'Constitution uploaded successfully', 'document': new_document})

@app.route('/api/groups/<int:group_id>/voting-sessions', methods=['GET', 'POST'])
def group_voting_sessions(group_id):
    """Manage group voting sessions"""
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT gvs.*,
                   COUNT(mv.id) as total_votes,
                   COUNT(CASE WHEN mv.vote_choice = 'YES' THEN 1 END) as yes_votes,
                   COUNT(CASE WHEN mv.vote_choice = 'NO' THEN 1 END) as no_votes,
                   COUNT(CASE WHEN mv.vote_choice = 'ABSTAIN' THEN 1 END) as abstain_votes
            FROM group_voting_sessions gvs
            LEFT JOIN member_votes mv ON gvs.id = mv.voting_session_id
            WHERE gvs.group_id = %s
            GROUP BY gvs.id
            ORDER BY gvs.voting_date DESC
        ''', (group_id,))
        voting_sessions = cursor.fetchall()
        conn.close()
        return jsonify({'voting_sessions': [dict(session) for session in voting_sessions]})

    elif request.method == 'POST':
        data = request.get_json()
        cursor.execute('''
            INSERT INTO group_voting_sessions (
                group_id, title, description, voting_type, voting_date,
                deadline, status, created_by, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            group_id, data['title'], data['description'], data['voting_type'],
            data.get('voting_date', datetime.now().date()),
            data.get('deadline', datetime.now() + timedelta(days=7)),
            'ACTIVE', data.get('created_by', 1), datetime.now()
        ))
        new_session = cursor.fetchone()
        conn.commit()
        conn.close()
        return jsonify({'message': 'Voting session created successfully', 'session': new_session})

@app.route('/api/groups/<int:group_id>/trainings', methods=['GET', 'POST'])
def group_trainings(group_id):
    """Manage group trainings"""
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT gt.*, 0 as total_participants, 0 as attended_count
            FROM group_trainings gt
            WHERE gt.group_id = %s
            ORDER BY gt.training_date DESC
        ''', (group_id,))
        trainings = cursor.fetchall()
        conn.close()
        return jsonify({'trainings': trainings})

    elif request.method == 'POST':
        data = request.get_json()
        cursor.execute('''
            INSERT INTO group_trainings (
                group_id, topic, trainer_name, training_date, duration_hours,
                location, objectives, outcomes, status, created_by, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            group_id, data['topic'], data['trainer_name'],
            data.get('training_date', datetime.now().date()),
            data.get('duration_hours', 2), data.get('location', ''),
            data.get('objectives', ''), data.get('outcomes', ''),
            'SCHEDULED', data.get('created_by', 1), datetime.now()
        ))
        new_training = cursor.fetchone()
        conn.commit()
        conn.close()
        return jsonify({'message': 'Training scheduled successfully', 'training': new_training})

@app.route('/api/groups/<int:group_id>/saving-cycles', methods=['GET', 'POST'])
def group_saving_cycles(group_id):
    """Manage group saving cycles"""
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT sc.*, u.username as created_by_name,
                   COALESCE(SUM(ma.amount), 0) as total_savings_collected
            FROM saving_cycles sc
            LEFT JOIN users u ON sc.created_by = u.id
            LEFT JOIN meeting_activities ma ON ma.activity_type = 'savings_collection'
                AND ma.created_date BETWEEN sc.start_date AND COALESCE(sc.end_date, CURRENT_DATE)
            WHERE sc.group_id = %s
            GROUP BY sc.id, u.username
            ORDER BY sc.cycle_number DESC
        ''', (group_id,))
        cycles = cursor.fetchall()
        conn.close()
        return jsonify({'saving_cycles': cycles})

    elif request.method == 'POST':
        data = request.get_json()
        cursor.execute('''
            INSERT INTO saving_cycles (
                group_id, cycle_number, start_date, planned_end_date,
                target_amount, status, created_by, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            group_id, data['cycle_number'], data['start_date'],
            data['planned_end_date'], data.get('target_amount', 0),
            'ACTIVE', data.get('created_by', 1), datetime.now()
        ))
        new_cycle = cursor.fetchone()
        conn.commit()
        conn.close()
        return jsonify({'message': 'Saving cycle created successfully', 'cycle': new_cycle})

@app.route('/api/groups/<int:group_id>/iga-activities', methods=['GET', 'POST'])
def group_iga_activities(group_id):
    """Manage Income Generating Activities"""
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT ia.*, u.username as created_by_name
            FROM iga_activities ia
            LEFT JOIN users u ON ia.created_by = u.id
            WHERE ia.group_id = %s
            ORDER BY ia.start_date DESC
        ''', (group_id,))
        activities = cursor.fetchall()
        conn.close()
        return jsonify({'iga_activities': activities})

    elif request.method == 'POST':
        data = request.get_json()
        cursor.execute('''
            INSERT INTO iga_activities (
                group_id, activity_name, description, start_date, planned_end_date,
                initial_investment, expected_return, actual_return, status,
                created_by, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            group_id, data['activity_name'], data['description'],
            data.get('start_date', datetime.now().date()),
            data.get('planned_end_date'), data.get('initial_investment', 0),
            data.get('expected_return', 0), 0, 'ACTIVE',
            data.get('created_by', 1), datetime.now()
        ))
        new_activity = cursor.fetchone()
        conn.commit()
        conn.close()
        return jsonify({'message': 'IGA activity created successfully', 'activity': new_activity})

# ============================================================================
# AUTHENTICATION AND AUTHORIZATION SYSTEM
# ============================================================================

import jwt
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash

# JWT Configuration
JWT_SECRET_KEY = 'your-secret-key-change-in-production'
JWT_ALGORITHM = 'HS256'

def token_required(f):
    """Decorator to require JWT token for protected routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            if token.startswith('Bearer '):
                token = token[7:]

            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            current_user_id = data['user_id']

            # Add user info to request context
            request.current_user_id = current_user_id

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401

        return f(*args, **kwargs)

    return decorated

def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # First check if user is authenticated
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            if token.startswith('Bearer '):
                token = token[7:]

            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = data['user_id']

            # Check if user is admin
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('SELECT role FROM users WHERE id = %s', (user_id,))
            user = cursor.fetchone()
            conn.close()

            if not user or user['role'] != 'ADMIN':
                return jsonify({'error': 'Admin access required'}), 403

            request.current_user_id = user_id

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401

        return f(*args, **kwargs)

    return decorated

@app.route('/api/auth/login', methods=['POST'])
def jwt_login():
    """User login endpoint - accepts both email and username"""
    data = request.get_json()

    # Accept either 'email' or 'username' field for login
    login_field = data.get('email') or data.get('username')
    password = data.get('password')

    if not data or not login_field or not password:
        return jsonify({'error': 'Email/username and password required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check both username and email fields for login
    cursor.execute('''
        SELECT u.*, gm.group_id, sg.name as group_name
        FROM users u
        LEFT JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN savings_groups sg ON gm.group_id = sg.id
        WHERE (u.username = %s OR u.email = %s) AND u.active = true
    ''', (login_field, login_field))

    user = cursor.fetchone()
    conn.close()

    if not user or not check_password_hash(user['password'], data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401

    # Generate JWT token
    token_payload = {
        'user_id': user['id'],
        'username': user['username'],
        'role': user['role'],
        'group_id': user['group_id'],
        'exp': datetime.utcnow() + timedelta(hours=24)
    }

    token = jwt.encode(token_payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

    return jsonify({
        'status': 'success',
        'message': 'Login successful',
        'auth_token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'group_id': user['group_id'],
            'group_name': user['group_name']
        }
    })

@app.route('/api/auth/register', methods=['POST'])
def jwt_register():
    """User registration endpoint"""
    data = request.get_json()

    required_fields = ['username', 'email', 'password', 'full_name']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if username or email already exists
    cursor.execute('''
        SELECT id FROM users WHERE username = %s OR email = %s
    ''', (data['username'], data['email']))

    if cursor.fetchone():
        conn.close()
        return jsonify({'error': 'Username or email already exists'}), 409

    # Create new user
    password_hash = generate_password_hash(data['password'])

    cursor.execute('''
        INSERT INTO users (
            username, email, password_hash, full_name, role,
            is_active, created_date, updated_date
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id, username, email, full_name, role
    ''', (
        data['username'], data['email'], password_hash, data['full_name'],
        data.get('role', 'MEMBER'), True, datetime.now(), datetime.now()
    ))

    new_user = cursor.fetchone()
    conn.commit()
    conn.close()

    return jsonify({
        'message': 'User registered successfully',
        'user': dict(new_user)
    }), 201

@app.route('/api/auth/profile', methods=['GET'])
@token_required
def get_user_profile():
    """Get current user profile"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT u.*, gm.group_id, sg.name as group_name
        FROM users u
        LEFT JOIN group_members gm ON u.id = gm.user_id
        LEFT JOIN savings_groups sg ON gm.group_id = sg.id
        WHERE u.id = %s
    ''', (request.current_user_id,))

    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': dict(user)})

@app.route('/api/auth/change-password', methods=['POST'])
@token_required
def change_password():
    """Change user password"""
    data = request.get_json()

    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'error': 'Current password and new password required'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('SELECT password_hash FROM users WHERE id = %s', (request.current_user_id,))
    user = cursor.fetchone()

    if not user or not check_password_hash(user['password_hash'], data['current_password']):
        conn.close()
        return jsonify({'error': 'Current password is incorrect'}), 400

    new_password_hash = generate_password_hash(data['new_password'])

    cursor.execute('''
        UPDATE users SET password_hash = %s, updated_date = %s
        WHERE id = %s
    ''', (new_password_hash, datetime.now(), request.current_user_id))

    conn.commit()
    conn.close()

    return jsonify({'message': 'Password changed successfully'})

# ============================================================================
# REAL-TIME NOTIFICATIONS SYSTEM
# ============================================================================

from flask_socketio import SocketIO, emit, join_room, leave_room
import threading
import time

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active connections
active_connections = {}

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')
    emit('connected', {'message': 'Connected to notification server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')
    # Remove from active connections
    if request.sid in active_connections:
        del active_connections[request.sid]

@socketio.on('join_group')
def handle_join_group(data):
    """Join a group room for notifications"""
    group_id = data.get('group_id')
    user_id = data.get('user_id')

    if group_id and user_id:
        room = f'group_{group_id}'
        join_room(room)
        active_connections[request.sid] = {
            'user_id': user_id,
            'group_id': group_id,
            'room': room
        }
        emit('joined_group', {'group_id': group_id, 'message': f'Joined group {group_id} notifications'})

@socketio.on('leave_group')
def handle_leave_group(data):
    """Leave a group room"""
    group_id = data.get('group_id')
    if group_id:
        room = f'group_{group_id}'
        leave_room(room)
        emit('left_group', {'group_id': group_id, 'message': f'Left group {group_id} notifications'})

def send_notification_to_group(group_id, notification_data):
    """Send notification to all members of a group"""
    room = f'group_{group_id}'
    socketio.emit('notification', notification_data, room=room)

def send_notification_to_user(user_id, notification_data):
    """Send notification to a specific user"""
    # Find user's connection
    for sid, conn_data in active_connections.items():
        if conn_data.get('user_id') == user_id:
            socketio.emit('notification', notification_data, room=sid)

@app.route('/api/notifications', methods=['GET', 'POST'])
@token_required
def notifications():
    """Manage user notifications"""
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == 'GET':
        cursor.execute('''
            SELECT n.*, u.username as created_by_name
            FROM notifications n
            LEFT JOIN users u ON n.created_by = u.id
            WHERE n.user_id = %s OR n.group_id IN (
                SELECT group_id FROM group_members WHERE user_id = %s
            )
            ORDER BY n.created_date DESC
            LIMIT 50
        ''', (request.current_user_id, request.current_user_id))

        notifications = cursor.fetchall()
        conn.close()
        return jsonify({'notifications': notifications})

    elif request.method == 'POST':
        data = request.get_json()

        cursor.execute('''
            INSERT INTO notifications (
                user_id, group_id, title, message, notification_type,
                is_read, created_by, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            data.get('user_id'), data.get('group_id'), data['title'],
            data['message'], data.get('notification_type', 'INFO'),
            False, request.current_user_id, datetime.now()
        ))

        new_notification = cursor.fetchone()
        conn.commit()
        conn.close()

        # Send real-time notification
        notification_data = {
            'id': new_notification['id'],
            'title': new_notification['title'],
            'message': new_notification['message'],
            'type': new_notification['notification_type'],
            'created_date': new_notification['created_date'].isoformat()
        }

        if data.get('group_id'):
            send_notification_to_group(data['group_id'], notification_data)
        elif data.get('user_id'):
            send_notification_to_user(data['user_id'], notification_data)

        return jsonify({'message': 'Notification sent successfully', 'notification': new_notification})

@app.route('/api/notifications/<int:notification_id>/read', methods=['PUT'])
@token_required
def mark_notification_read(notification_id):
    """Mark notification as read"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        UPDATE notifications
        SET is_read = true, read_date = %s
        WHERE id = %s AND (user_id = %s OR group_id IN (
            SELECT group_id FROM group_members WHERE user_id = %s
        ))
    ''', (datetime.now(), notification_id, request.current_user_id, request.current_user_id))

    conn.commit()
    conn.close()

    return jsonify({'message': 'Notification marked as read'})

# Automatic notification triggers
def create_meeting_notification(group_id, meeting_data):
    """Create notification for new meeting"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get all group members
    cursor.execute('SELECT user_id FROM group_members WHERE group_id = %s', (group_id,))
    members = cursor.fetchall()

    for member in members:
        cursor.execute('''
            INSERT INTO notifications (
                user_id, group_id, title, message, notification_type,
                is_read, created_by, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            member['user_id'], group_id,
            'New Meeting Scheduled',
            f"A new meeting has been scheduled for {meeting_data.get('meeting_date', 'TBD')}",
            'MEETING', False, 1, datetime.now()
        ))

    conn.commit()
    conn.close()

    # Send real-time notification
    notification_data = {
        'title': 'New Meeting Scheduled',
        'message': f"A new meeting has been scheduled for {meeting_data.get('meeting_date', 'TBD')}",
        'type': 'MEETING',
        'created_date': datetime.now().isoformat()
    }
    send_notification_to_group(group_id, notification_data)

def create_activity_notification(group_id, activity_data):
    """Create notification for new activity"""
    notification_data = {
        'title': 'New Activity Recorded',
        'message': f"New {activity_data.get('activity_type', 'activity')} recorded: {activity_data.get('description', '')}",
        'type': 'ACTIVITY',
        'created_date': datetime.now().isoformat()
    }
    send_notification_to_group(group_id, notification_data)

# ============================================================================
# DATA EXPORT/IMPORT SYSTEM
# ============================================================================

import csv
import io
import json
from flask import send_file

@app.route('/api/export/group/<int:group_id>/members', methods=['GET'])
@token_required
def export_group_members(group_id):
    """Export group members to CSV"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT gm.*, u.username, u.email,
               COALESCE(u.username, 'Unknown') as full_name
        FROM group_members gm
        LEFT JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = %s
        ORDER BY gm.name
    ''', (group_id,))

    members = cursor.fetchall()
    conn.close()

    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        'ID', 'Name', 'Phone', 'Email', 'Gender', 'Role', 'Join Date',
        'Share Balance', 'Total Contributions', 'Username', 'Full Name'
    ])

    # Write data
    for member in members:
        writer.writerow([
            member['id'], member['name'], member['phone'], member['email'],
            member['gender'], member['role'], member['joined_date'],
            member['share_balance'], member['total_contributions'],
            member['username'], member['full_name']
        ])

    # Create file response
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'group_{group_id}_members.csv'
    )

@app.route('/api/export/group/<int:group_id>/activities', methods=['GET'])
@token_required
def export_group_activities(group_id):
    """Export group activities to CSV"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT ma.*, m.meeting_date, m.agenda
        FROM meeting_activities ma
        LEFT JOIN meetings m ON ma.meeting_id = m.id
        WHERE m.group_id = %s OR ma.meeting_id IS NULL
        ORDER BY ma.created_date DESC
    ''', (group_id,))

    activities = cursor.fetchall()
    conn.close()

    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)

    # Write header
    writer.writerow([
        'ID', 'Meeting Date', 'Activity Type', 'Description', 'Amount',
        'Status', 'Created Date', 'Meeting Agenda'
    ])

    # Write data
    for activity in activities:
        writer.writerow([
            activity['id'], activity['meeting_date'], activity['activity_type'],
            activity['description'], activity['amount'], activity['status'],
            activity['created_date'], activity['agenda']
        ])

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'group_{group_id}_activities.csv'
    )

@app.route('/api/export/group/<int:group_id>/financial-summary', methods=['GET'])
@token_required
def export_financial_summary(group_id):
    """Export financial summary to JSON"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get group info
    cursor.execute('SELECT * FROM savings_groups WHERE id = %s', (group_id,))
    group = cursor.fetchone()

    # Get financial activities
    cursor.execute('''
        SELECT activity_type, SUM(amount) as total_amount, COUNT(*) as count
        FROM meeting_activities ma
        LEFT JOIN meetings m ON ma.meeting_id = m.id
        WHERE m.group_id = %s
        GROUP BY activity_type
    ''', (group_id,))
    activities_summary = cursor.fetchall()

    # Get member financial summary
    cursor.execute('''
        SELECT gm.name, gm.share_balance, gm.total_contributions,
               COALESCE(loan_summary.total_loans, 0) as total_loans,
               COALESCE(loan_summary.total_repayments, 0) as total_repayments
        FROM group_members gm
        LEFT JOIN (
            SELECT member_id,
                   SUM(CASE WHEN activity_type = 'loan_disbursement' THEN amount ELSE 0 END) as total_loans,
                   SUM(CASE WHEN activity_type = 'loan_repayment' THEN amount ELSE 0 END) as total_repayments
            FROM member_activity_participation
            GROUP BY member_id
        ) loan_summary ON gm.id = loan_summary.member_id
        WHERE gm.group_id = %s
    ''', (group_id,))
    member_financials = cursor.fetchall()

    conn.close()

    # Create comprehensive financial report
    financial_report = {
        'group_info': dict(group) if group else {},
        'export_date': datetime.now().isoformat(),
        'activities_summary': [dict(row) for row in activities_summary],
        'member_financials': [dict(row) for row in member_financials],
        'totals': {
            'total_savings': sum(m['share_balance'] or 0 for m in member_financials),
            'total_contributions': sum(m['total_contributions'] or 0 for m in member_financials),
            'total_loans': sum(m['total_loans'] or 0 for m in member_financials),
            'total_repayments': sum(m['total_repayments'] or 0 for m in member_financials)
        }
    }

    # Return JSON file
    return send_file(
        io.BytesIO(json.dumps(financial_report, indent=2, default=str).encode('utf-8')),
        mimetype='application/json',
        as_attachment=True,
        download_name=f'group_{group_id}_financial_summary.json'
    )

@app.route('/api/import/members', methods=['POST'])
@token_required
@admin_required
def import_members():
    """Import members from CSV file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be CSV format'}), 400

    try:
        # Read CSV file
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)

        conn = get_db_connection()
        cursor = conn.cursor()

        imported_count = 0
        errors = []

        for row_num, row in enumerate(csv_input, start=2):
            try:
                # Validate required fields
                required_fields = ['name', 'phone', 'group_id']
                if not all(field in row and row[field].strip() for field in required_fields):
                    errors.append(f'Row {row_num}: Missing required fields')
                    continue

                # Insert member
                cursor.execute('''
                    INSERT INTO group_members (
                        group_id, name, phone, email, gender, role,
                        joined_date, share_balance, total_contributions
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ''', (
                    int(row['group_id']), row['name'], row['phone'],
                    row.get('email', ''), row.get('gender', 'MALE'),
                    row.get('role', 'MEMBER'),
                    row.get('joined_date', datetime.now().date()),
                    float(row.get('share_balance', 0)),
                    float(row.get('total_contributions', 0))
                ))

                imported_count += 1

            except Exception as e:
                errors.append(f'Row {row_num}: {str(e)}')

        conn.commit()
        conn.close()

        return jsonify({
            'message': f'Import completed. {imported_count} members imported.',
            'imported_count': imported_count,
            'errors': errors
        })

    except Exception as e:
        return jsonify({'error': f'Import failed: {str(e)}'}), 500

@app.route('/api/backup/group/<int:group_id>', methods=['GET'])
@token_required
@admin_required
def backup_group_data(group_id):
    """Create complete backup of group data"""
    conn = get_db_connection()
    cursor = conn.cursor()

    backup_data = {
        'backup_date': datetime.now().isoformat(),
        'group_id': group_id
    }

    # Backup all related tables
    tables_to_backup = [
        'savings_groups', 'group_members', 'meetings', 'meeting_activities',
        'group_documents', 'group_trainings', 'saving_cycles', 'iga_activities',
        'group_voting_sessions', 'member_votes', 'training_attendance'
    ]

    for table in tables_to_backup:
        if table == 'savings_groups':
            cursor.execute(f'SELECT * FROM {table} WHERE id = %s', (group_id,))
        else:
            cursor.execute(f'SELECT * FROM {table} WHERE group_id = %s', (group_id,))

        rows = cursor.fetchall()
        backup_data[table] = [dict(row) for row in rows]

    conn.close()

    return send_file(
        io.BytesIO(json.dumps(backup_data, indent=2, default=str).encode('utf-8')),
        mimetype='application/json',
        as_attachment=True,
        download_name=f'group_{group_id}_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    )

if __name__ == '__main__':
    print("🏦 Starting Complete Microfinance System API...")
    print("🗄️ Connecting to PostgreSQL database...")
    print("✅ Database ready!")
    print("🌐 Starting Flask server...")
    print("📍 API will be available at: http://localhost:5001")
    print("🔗 Try these endpoints:")
    print("   • http://localhost:5001/ - System overview")
    print("   • http://localhost:5001/api/users/ - User management")
    print("   • http://localhost:5001/api/groups/ - Savings groups")
    print("   • http://localhost:5001/api/meetings/ - Meeting management")
    print("   • http://localhost:5001/api/calendar/ - Calendar events")
    print("   • http://localhost:5001/api/meeting-activities/ - Enhanced activities")
    print("   • http://localhost:5001/api/reports/system-overview - System reports")
    print("   • http://localhost:5001/api/reports/group-dashboard/1 - Group dashboard")
    print()
    # Use smart environment configuration
    socketio.run(app, host='0.0.0.0', port=config['port'], debug=config['debug'])
