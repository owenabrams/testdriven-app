# 🔄 CASCADING CRUD SYSTEM WITH NOTIFICATIONS
# This module handles cascading updates and notifications across the system

import psycopg2
from datetime import datetime
from flask import jsonify

def create_notification(conn, user_id, title, message, notification_type='INFO', group_id=None, priority='NORMAL'):
    """Create a notification for system changes"""
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO notifications (
            user_id, title, message, notification_type, group_id, 
            priority, is_read, created_date
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        user_id, title, message, notification_type, group_id,
        priority, False, datetime.now()
    ))
    
    notification_id = cursor.fetchone()[0]
    return notification_id

def notify_group_members(conn, group_id, title, message, notification_type='INFO', priority='NORMAL'):
    """Send notification to all members of a group"""
    cursor = conn.cursor()
    
    # Get all active group members with user accounts
    cursor.execute("""
        SELECT DISTINCT gm.user_id 
        FROM group_members gm 
        WHERE gm.group_id = %s AND gm.is_active = true AND gm.user_id IS NOT NULL
    """, (group_id,))
    
    user_ids = cursor.fetchall()
    notification_ids = []
    
    for (user_id,) in user_ids:
        notification_id = create_notification(
            conn, user_id, title, message, notification_type, group_id, priority
        )
        notification_ids.append(notification_id)
    
    return notification_ids

def handle_group_update(conn, group_id, old_data, new_data, updated_by=None):
    """Handle cascading updates when group information changes"""
    cursor = conn.cursor()
    changes = []
    
    # Track what changed
    for field in ['name', 'location', 'meeting_day', 'meeting_time', 'state']:
        if field in new_data and old_data.get(field) != new_data[field]:
            changes.append(f"{field}: '{old_data.get(field)}' → '{new_data[field]}'")
    
    if changes:
        # Update related calendar events
        cursor.execute("""
            UPDATE calendar_events 
            SET title = CONCAT('Meeting - ', %s),
                location = %s
            WHERE group_id = %s AND event_type = 'MEETING'
        """, (new_data.get('name', old_data.get('name')), 
              new_data.get('location', old_data.get('location')), 
              group_id))
        
        # Update scheduler calendar
        cursor.execute("""
            UPDATE scheduler_calendar 
            SET title = CONCAT('Meeting - ', %s),
                location = %s
            WHERE group_id = %s
        """, (new_data.get('name', old_data.get('name')), 
              new_data.get('location', old_data.get('location')), 
              group_id))
        
        # Notify group members
        change_summary = ', '.join(changes)
        notify_group_members(
            conn, group_id,
            f"Group Information Updated",
            f"Your group information has been updated: {change_summary}",
            'UPDATE', 'NORMAL'
        )
        
        return {
            'changes_made': changes,
            'calendar_events_updated': cursor.rowcount,
            'notifications_sent': True
        }
    
    return {'changes_made': [], 'notifications_sent': False}

def handle_member_update(conn, member_id, old_data, new_data, updated_by=None):
    """Handle cascading updates when member information changes"""
    cursor = conn.cursor()
    changes = []
    
    # Get member and group info
    cursor.execute("""
        SELECT gm.*, sg.name as group_name 
        FROM group_members gm 
        JOIN savings_groups sg ON gm.group_id = sg.id 
        WHERE gm.id = %s
    """, (member_id,))
    
    member_info = cursor.fetchone()
    if not member_info:
        return {'error': 'Member not found'}
    
    group_id = member_info['group_id']
    
    # Track what changed
    for field in ['name', 'phone', 'role']:
        if field in new_data and old_data.get(field) != new_data[field]:
            changes.append(f"{field}: '{old_data.get(field)}' → '{new_data[field]}'")
    
    if changes:
        # If role changed, update officer assignments if necessary
        if 'role' in new_data and old_data.get('role') != new_data['role']:
            # Check if this member is an officer
            cursor.execute("""
                SELECT chair_member_id, secretary_member_id, treasurer_member_id 
                FROM savings_groups WHERE id = %s
            """, (group_id,))
            
            group_officers = cursor.fetchone()
            is_officer = member_id in [group_officers['chair_member_id'], 
                                     group_officers['secretary_member_id'], 
                                     group_officers['treasurer_member_id']]
            
            if is_officer and new_data['role'] != 'OFFICER':
                changes.append("⚠️ Officer role change may require reassignment")
        
        # Update meeting invitations and attendance records
        cursor.execute("""
            UPDATE meeting_invitations 
            SET meeting_role = CASE 
                WHEN %s = 'OFFICER' THEN 'OFFICER'
                ELSE 'PARTICIPANT'
            END
            WHERE member_id = %s
        """, (new_data.get('role', old_data.get('role')), member_id))
        
        # Notify the member if they have a user account
        if member_info['user_id']:
            change_summary = ', '.join(changes)
            create_notification(
                conn, member_info['user_id'],
                "Your Profile Updated",
                f"Your profile information has been updated: {change_summary}",
                'UPDATE', group_id, 'NORMAL'
            )
        
        # Notify group officers about member changes
        cursor.execute("""
            SELECT DISTINCT gm.user_id 
            FROM group_members gm 
            JOIN savings_groups sg ON (
                gm.id = sg.chair_member_id OR 
                gm.id = sg.secretary_member_id OR 
                gm.id = sg.treasurer_member_id
            )
            WHERE sg.id = %s AND gm.user_id IS NOT NULL AND gm.id != %s
        """, (group_id, member_id))
        
        officer_user_ids = cursor.fetchall()
        for (user_id,) in officer_user_ids:
            create_notification(
                conn, user_id,
                "Member Profile Updated",
                f"Member {member_info['name']} profile has been updated in your group",
                'INFO', group_id, 'LOW'
            )
        
        return {
            'changes_made': changes,
            'invitations_updated': cursor.rowcount,
            'notifications_sent': True
        }
    
    return {'changes_made': [], 'notifications_sent': False}

def handle_meeting_update(conn, meeting_id, old_data, new_data, updated_by=None):
    """Handle cascading updates when meeting information changes"""
    cursor = conn.cursor()
    changes = []
    
    # Get meeting info
    cursor.execute("""
        SELECT m.*, sg.name as group_name 
        FROM meetings m 
        JOIN savings_groups sg ON m.group_id = sg.id 
        WHERE m.id = %s
    """, (meeting_id,))
    
    meeting_info = cursor.fetchone()
    if not meeting_info:
        return {'error': 'Meeting not found'}
    
    group_id = meeting_info['group_id']
    
    # Track what changed
    for field in ['meeting_date', 'meeting_time', 'location', 'status', 'agenda']:
        if field in new_data and old_data.get(field) != new_data[field]:
            changes.append(f"{field}: '{old_data.get(field)}' → '{new_data[field]}'")
    
    if changes:
        # Update related calendar events
        cursor.execute("""
            UPDATE calendar_events 
            SET event_date = %s,
                event_time = %s,
                location = %s,
                description = %s
            WHERE meeting_id = %s
        """, (
            new_data.get('meeting_date', old_data.get('meeting_date')),
            new_data.get('meeting_time', old_data.get('meeting_time')),
            new_data.get('location', old_data.get('location')),
            new_data.get('agenda', old_data.get('agenda')),
            meeting_id
        ))
        
        # Update scheduler calendar
        cursor.execute("""
            UPDATE scheduler_calendar 
            SET calendar_date = %s,
                time_slot = %s,
                location = %s,
                description = %s
            WHERE meeting_id = %s
        """, (
            new_data.get('meeting_date', old_data.get('meeting_date')),
            new_data.get('meeting_time', old_data.get('meeting_time')),
            new_data.get('location', old_data.get('location')),
            new_data.get('agenda', old_data.get('agenda')),
            meeting_id
        ))
        
        # Notify all invited members
        change_summary = ', '.join(changes)
        priority = 'HIGH' if 'meeting_date' in new_data or 'meeting_time' in new_data else 'NORMAL'
        
        cursor.execute("""
            SELECT DISTINCT gm.user_id 
            FROM meeting_invitations mi
            JOIN group_members gm ON mi.member_id = gm.id
            WHERE mi.meeting_id = %s AND gm.user_id IS NOT NULL
        """, (meeting_id,))
        
        invited_user_ids = cursor.fetchall()
        for (user_id,) in invited_user_ids:
            create_notification(
                conn, user_id,
                "Meeting Updated",
                f"Meeting on {meeting_info['meeting_date']} has been updated: {change_summary}",
                'UPDATE', group_id, priority
            )
        
        return {
            'changes_made': changes,
            'calendar_events_updated': cursor.rowcount,
            'notifications_sent': len(invited_user_ids)
        }
    
    return {'changes_made': [], 'notifications_sent': False}

def handle_deletion_cascade(conn, entity_type, entity_id, deleted_by=None):
    """Handle cascading effects when entities are deleted"""
    cursor = conn.cursor()
    cascade_effects = []
    
    if entity_type == 'group':
        # Get group info before deletion
        cursor.execute("SELECT * FROM savings_groups WHERE id = %s", (entity_id,))
        group_info = cursor.fetchone()
        
        if group_info:
            # Notify all group members
            notify_group_members(
                conn, entity_id,
                "Group Deleted",
                f"The group '{group_info['name']}' has been deleted. All related data will be removed.",
                'WARNING', 'HIGH'
            )
            
            # The database foreign key constraints will handle the actual cascading deletes
            cascade_effects.append(f"Group '{group_info['name']}' and all related data will be deleted")
    
    elif entity_type == 'meeting':
        # Get meeting info before deletion
        cursor.execute("""
            SELECT m.*, sg.name as group_name 
            FROM meetings m 
            JOIN savings_groups sg ON m.group_id = sg.id 
            WHERE m.id = %s
        """, (entity_id,))
        
        meeting_info = cursor.fetchone()
        
        if meeting_info:
            # Notify invited members
            cursor.execute("""
                SELECT DISTINCT gm.user_id 
                FROM meeting_invitations mi
                JOIN group_members gm ON mi.member_id = gm.id
                WHERE mi.meeting_id = %s AND gm.user_id IS NOT NULL
            """, (entity_id,))
            
            invited_user_ids = cursor.fetchall()
            for (user_id,) in invited_user_ids:
                create_notification(
                    conn, user_id,
                    "Meeting Cancelled",
                    f"The meeting scheduled for {meeting_info['meeting_date']} has been cancelled.",
                    'WARNING', meeting_info['group_id'], 'HIGH'
                )
            
            cascade_effects.append(f"Meeting on {meeting_info['meeting_date']} cancelled, {len(invited_user_ids)} members notified")
    
    elif entity_type == 'member':
        # Get member info before deletion
        cursor.execute("""
            SELECT gm.*, sg.name as group_name 
            FROM group_members gm 
            JOIN savings_groups sg ON gm.group_id = sg.id 
            WHERE gm.id = %s
        """, (entity_id,))
        
        member_info = cursor.fetchone()
        
        if member_info:
            # Check if member is an officer
            cursor.execute("""
                SELECT 
                    CASE WHEN chair_member_id = %s THEN 'Chairperson'
                         WHEN secretary_member_id = %s THEN 'Secretary'
                         WHEN treasurer_member_id = %s THEN 'Treasurer'
                         ELSE NULL END as officer_role
                FROM savings_groups WHERE id = %s
            """, (entity_id, entity_id, entity_id, member_info['group_id']))
            
            officer_role = cursor.fetchone()
            
            if officer_role and officer_role['officer_role']:
                # Notify group about officer removal
                notify_group_members(
                    conn, member_info['group_id'],
                    "Officer Removed",
                    f"{officer_role['officer_role']} {member_info['name']} has been removed. A new officer must be assigned.",
                    'WARNING', 'HIGH'
                )
                cascade_effects.append(f"Officer {member_info['name']} removed - reassignment needed")
            else:
                # Notify group about member removal
                notify_group_members(
                    conn, member_info['group_id'],
                    "Member Removed",
                    f"Member {member_info['name']} has been removed from the group.",
                    'INFO', 'NORMAL'
                )
                cascade_effects.append(f"Member {member_info['name']} removed from group")
    
    return cascade_effects
