# 🏢 COMPREHENSIVE GROUP INFORMATION TABS CRUD SYSTEM
# Handles all group tabs: overview, constitution, registration, trainings, voting history, etc.

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
# GROUP OVERVIEW TAB CRUD
# ============================================================================

def update_group_overview(group_id, overview_data):
    """Update group overview information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update main group information
        update_fields = []
        update_values = []
        
        allowed_fields = [
            'name', 'description', 'location', 'meeting_day', 'meeting_time',
            'meeting_frequency', 'max_members', 'region', 'district', 'parish', 'village'
        ]
        
        for field in allowed_fields:
            if field in overview_data:
                update_fields.append(f"{field} = %s")
                update_values.append(overview_data[field])
        
        if update_fields:
            update_fields.append("updated_date = %s")
            update_values.append(datetime.now())
            update_values.append(group_id)
            
            cursor.execute(f'''
                UPDATE savings_groups 
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            ''', update_values)
            
            updated_group = cursor.fetchone()
            conn.commit()
            
            # Trigger cascading updates
            from cascading_crud_system import handle_group_update
            handle_group_update(conn, group_id, {}, overview_data)
            
            return updated_group
        
        return None
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# ============================================================================
# GROUP CONSTITUTION TAB CRUD
# ============================================================================

def create_constitution_document(group_id, constitution_data):
    """Create or update group constitution"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if constitution already exists
        cursor.execute('''
            SELECT id FROM group_documents 
            WHERE group_id = %s AND document_type = 'CONSTITUTION'
        ''', (group_id,))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing constitution
            cursor.execute('''
                UPDATE group_documents 
                SET document_content = %s, version = version + 1, updated_date = %s
                WHERE id = %s
                RETURNING *
            ''', (
                json.dumps(constitution_data),
                datetime.now(),
                existing['id']
            ))
        else:
            # Create new constitution
            cursor.execute('''
                INSERT INTO group_documents (
                    group_id, document_type, document_name, document_content,
                    version, created_date
                ) VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
            ''', (
                group_id, 'CONSTITUTION', 'Group Constitution',
                json.dumps(constitution_data), 1, datetime.now()
            ))
        
        constitution = cursor.fetchone()
        conn.commit()
        return constitution
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_constitution(group_id):
    """Get group constitution"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT * FROM group_documents 
            WHERE group_id = %s AND document_type = 'CONSTITUTION'
            ORDER BY version DESC LIMIT 1
        ''', (group_id,))
        
        constitution = cursor.fetchone()
        if constitution:
            constitution['document_content'] = json.loads(constitution['document_content'])
        
        return constitution
        
    except Exception as e:
        raise e
    finally:
        conn.close()

# ============================================================================
# GROUP REGISTRATION TAB CRUD
# ============================================================================

def update_registration_info(group_id, registration_data):
    """Update group registration information"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update registration fields in savings_groups table
        registration_fields = [
            'registration_number', 'formation_date', 'registration_date',
            'registration_authority', 'certificate_number'
        ]
        
        update_fields = []
        update_values = []
        
        for field in registration_fields:
            if field in registration_data:
                update_fields.append(f"{field} = %s")
                update_values.append(registration_data[field])
        
        if update_fields:
            update_fields.append("updated_date = %s")
            update_values.append(datetime.now())
            update_values.append(group_id)
            
            cursor.execute(f'''
                UPDATE savings_groups 
                SET {', '.join(update_fields)}
                WHERE id = %s
                RETURNING *
            ''', update_values)
            
            updated_group = cursor.fetchone()
            
            # Store detailed registration documents
            if 'registration_documents' in registration_data:
                cursor.execute('''
                    INSERT INTO group_documents (
                        group_id, document_type, document_name, document_content,
                        version, created_date
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (group_id, document_type) 
                    DO UPDATE SET 
                        document_content = EXCLUDED.document_content,
                        version = group_documents.version + 1,
                        updated_date = EXCLUDED.created_date
                    RETURNING *
                ''', (
                    group_id, 'REGISTRATION', 'Registration Documents',
                    json.dumps(registration_data['registration_documents']),
                    1, datetime.now()
                ))
            
            conn.commit()
            return updated_group
        
        return None
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# ============================================================================
# TRAININGS TAB CRUD
# ============================================================================

def create_training_record(group_id, training_data):
    """Create training record for the group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO group_trainings (
                group_id, training_topic, trainer_name, training_date,
                duration_hours, participants_count, training_materials,
                training_outcomes, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            group_id,
            training_data['training_topic'],
            training_data.get('trainer_name'),
            training_data['training_date'],
            training_data.get('duration_hours', 2),
            training_data.get('participants_count', 0),
            json.dumps(training_data.get('training_materials', [])),
            training_data.get('training_outcomes'),
            datetime.now()
        ))
        
        training = cursor.fetchone()
        
        # Record individual participant attendance if provided
        if 'participants' in training_data:
            for member_id in training_data['participants']:
                cursor.execute('''
                    INSERT INTO training_attendance (
                        training_id, member_id, attendance_status, created_date
                    ) VALUES (%s, %s, %s, %s)
                ''', (training['id'], member_id, 'ATTENDED', datetime.now()))
        
        conn.commit()
        return training
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_group_trainings(group_id):
    """Get all trainings for a group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT gt.*, 
                   COUNT(ta.member_id) as actual_participants
            FROM group_trainings gt
            LEFT JOIN training_attendance ta ON gt.id = ta.training_id
            WHERE gt.group_id = %s
            GROUP BY gt.id
            ORDER BY gt.training_date DESC
        ''', (group_id,))
        
        trainings = cursor.fetchall()
        
        # Parse JSON fields
        for training in trainings:
            if training['training_materials']:
                training['training_materials'] = json.loads(training['training_materials'])
        
        return trainings
        
    except Exception as e:
        raise e
    finally:
        conn.close()

# ============================================================================
# VOTING HISTORY TAB CRUD
# ============================================================================

def create_voting_session(group_id, voting_data):
    """Create a voting session record"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO group_voting_sessions (
                group_id, voting_topic, voting_date, voting_type,
                total_eligible_voters, description, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            group_id,
            voting_data['voting_topic'],
            voting_data['voting_date'],
            voting_data.get('voting_type', 'SIMPLE_MAJORITY'),
            voting_data.get('total_eligible_voters', 0),
            voting_data.get('description'),
            datetime.now()
        ))
        
        voting_session = cursor.fetchone()
        
        # Record individual votes if provided
        if 'votes' in voting_data:
            for vote in voting_data['votes']:
                cursor.execute('''
                    INSERT INTO member_votes (
                        voting_session_id, member_id, vote_choice, 
                        vote_date, created_date
                    ) VALUES (%s, %s, %s, %s, %s)
                ''', (
                    voting_session['id'],
                    vote['member_id'],
                    vote['vote_choice'],
                    voting_data['voting_date'],
                    datetime.now()
                ))
        
        conn.commit()
        return voting_session
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_voting_history(group_id):
    """Get voting history for a group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT gvs.*,
                   COUNT(mv.member_id) as total_votes,
                   COUNT(CASE WHEN mv.vote_choice = 'YES' THEN 1 END) as yes_votes,
                   COUNT(CASE WHEN mv.vote_choice = 'NO' THEN 1 END) as no_votes,
                   COUNT(CASE WHEN mv.vote_choice = 'ABSTAIN' THEN 1 END) as abstain_votes
            FROM group_voting_sessions gvs
            LEFT JOIN member_votes mv ON gvs.id = mv.voting_session_id
            WHERE gvs.group_id = %s
            GROUP BY gvs.id
            ORDER BY gvs.voting_date DESC
        ''', (group_id,))
        
        return cursor.fetchall()
        
    except Exception as e:
        raise e
    finally:
        conn.close()

# ============================================================================
# FINANCIAL RECORDS TAB CRUD
# ============================================================================

def get_financial_summary(group_id, start_date=None, end_date=None):
    """Get comprehensive financial summary for a group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        date_filter = ""
        params = [group_id]
        
        if start_date and end_date:
            date_filter = "AND m.meeting_date BETWEEN %s AND %s"
            params.extend([start_date, end_date])
        
        # Get financial activities summary
        cursor.execute(f'''
            SELECT 
                ma.activity_type,
                COUNT(*) as transaction_count,
                SUM(ma.amount) as total_amount,
                AVG(ma.amount) as average_amount
            FROM meeting_activities ma
            JOIN meetings m ON ma.meeting_id = m.id
            WHERE m.group_id = %s {date_filter}
            GROUP BY ma.activity_type
            ORDER BY total_amount DESC
        ''', params)
        
        financial_summary = cursor.fetchall()
        
        # Get current balances
        cursor.execute('''
            SELECT savings_balance, loan_fund_balance, 
                   total_cycles_completed, current_cycle_number
            FROM savings_groups 
            WHERE id = %s
        ''', (group_id,))
        
        current_balances = cursor.fetchone()
        
        return {
            'financial_summary': financial_summary,
            'current_balances': current_balances
        }
        
    except Exception as e:
        raise e
    finally:
        conn.close()

# ============================================================================
# SAVING CYCLES TAB CRUD
# ============================================================================

def create_saving_cycle(group_id, cycle_data):
    """Create a new saving cycle"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO saving_cycles (
                group_id, cycle_number, start_date, end_date,
                target_amount, cycle_duration_months, status, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            group_id,
            cycle_data['cycle_number'],
            cycle_data['start_date'],
            cycle_data['end_date'],
            cycle_data.get('target_amount', 0),
            cycle_data.get('cycle_duration_months', 12),
            cycle_data.get('status', 'ACTIVE'),
            datetime.now()
        ))
        
        cycle = cursor.fetchone()
        
        # Update group's current cycle information
        cursor.execute('''
            UPDATE savings_groups 
            SET current_cycle_number = %s,
                current_cycle_start_date = %s,
                current_cycle_end_date = %s,
                cycle_duration_months = %s
            WHERE id = %s
        ''', (
            cycle_data['cycle_number'],
            cycle_data['start_date'],
            cycle_data['end_date'],
            cycle_data.get('cycle_duration_months', 12),
            group_id
        ))
        
        conn.commit()
        return cycle
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_saving_cycles(group_id):
    """Get all saving cycles for a group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT sc.*,
                   COALESCE(SUM(ma.amount), 0) as total_collected
            FROM saving_cycles sc
            LEFT JOIN meetings m ON m.group_id = sc.group_id 
                AND m.meeting_date BETWEEN sc.start_date AND sc.end_date
            LEFT JOIN meeting_activities ma ON ma.meeting_id = m.id 
                AND ma.activity_type = 'savings_collection'
            WHERE sc.group_id = %s
            GROUP BY sc.id
            ORDER BY sc.cycle_number DESC
        ''', (group_id,))
        
        return cursor.fetchall()
        
    except Exception as e:
        raise e
    finally:
        conn.close()

# ============================================================================
# IGA ACTIVITIES TAB CRUD
# ============================================================================

def create_iga_activity(group_id, iga_data):
    """Create Income Generating Activity record"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO iga_activities (
                group_id, activity_name, activity_type, start_date,
                initial_investment, expected_returns, status,
                participants, description, created_date
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        ''', (
            group_id,
            iga_data['activity_name'],
            iga_data['activity_type'],
            iga_data.get('start_date'),
            iga_data.get('initial_investment', 0),
            iga_data.get('expected_returns', 0),
            iga_data.get('status', 'PLANNED'),
            json.dumps(iga_data.get('participants', [])),
            iga_data.get('description'),
            datetime.now()
        ))
        
        iga_activity = cursor.fetchone()
        conn.commit()
        return iga_activity
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_iga_activities(group_id):
    """Get all IGA activities for a group"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT * FROM iga_activities 
            WHERE group_id = %s
            ORDER BY start_date DESC
        ''', (group_id,))
        
        activities = cursor.fetchall()
        
        # Parse JSON fields
        for activity in activities:
            if activity['participants']:
                activity['participants'] = json.loads(activity['participants'])
        
        return activities
        
    except Exception as e:
        raise e
    finally:
        conn.close()
