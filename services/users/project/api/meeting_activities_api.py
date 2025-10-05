# services/users/project/api/meeting_activities_api.py

import os
import uuid
from flask import Blueprint, jsonify, request, current_app
from sqlalchemy import exc, desc, func, and_, or_
from datetime import datetime, date, timedelta
from decimal import Decimal
from werkzeug.utils import secure_filename

from project import db
from project.api.models import User, SavingsGroup, GroupMember, Meeting
from project.api.meeting_models import (
    MeetingActivity, MemberActivityParticipation,
    ActivityDocument, ActivityTransaction
)
from project.api.utils import authenticate, admin_required
from project.api.notifications import create_system_notification

meeting_activities_blueprint = Blueprint('meeting_activities', __name__, url_prefix='/api/meeting-activities')

# Configuration for file uploads
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'bmp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_upload_path():
    """Get the base path for file uploads"""
    upload_path = current_app.config.get('UPLOAD_FOLDER', '/tmp/uploads')
    if not os.path.exists(upload_path):
        os.makedirs(upload_path)
    return upload_path


@meeting_activities_blueprint.route('/meetings/<int:meeting_id>/activities', methods=['GET'])
@authenticate
def get_meeting_activities(user_id, meeting_id):
    """Get all activities for a meeting"""
    try:
        meeting = Meeting.query.get(meeting_id)
        if not meeting:
            return jsonify({'status': 'error', 'message': 'Meeting not found'}), 404
        
        activities = MeetingActivity.query.filter_by(meeting_id=meeting_id)\
                                         .order_by(MeetingActivity.activity_order)\
                                         .all()
        
        activities_data = []
        for activity in activities:
            activity_data = activity.to_json()
            
            # Add participation summary
            participations = MemberActivityParticipation.query.filter_by(
                meeting_activity_id=activity.id
            ).all()
            
            activity_data['participation_summary'] = {
                'total_participants': len(participations),
                'completed': len([p for p in participations if p.status == 'COMPLETED']),
                'pending': len([p for p in participations if p.status == 'PENDING']),
                'average_score': sum([p.participation_score for p in participations]) / len(participations) if participations else 0
            }
            
            # Add document summary
            documents = ActivityDocument.query.filter_by(meeting_activity_id=activity.id).all()
            activity_data['documents_summary'] = {
                'total_documents': len(documents),
                'verified_documents': len([d for d in documents if d.is_verified])
            }
            
            activities_data.append(activity_data)
        
        return jsonify({
            'status': 'success',
            'data': {
                'meeting_id': meeting_id,
                'activities': activities_data,
                'summary': {
                    'total_activities': len(activities),
                    'completed_activities': len([a for a in activities if a.status == 'COMPLETED']),
                    'in_progress_activities': len([a for a in activities if a.status == 'IN_PROGRESS']),
                    'pending_activities': len([a for a in activities if a.status == 'PENDING'])
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/meetings/<int:meeting_id>/activities', methods=['POST'])
@authenticate
def create_meeting_activity(user_id, meeting_id):
    """Create a new activity for a meeting"""
    try:
        data = request.get_json()
        
        meeting = Meeting.query.get(meeting_id)
        if not meeting:
            return jsonify({'status': 'error', 'message': 'Meeting not found'}), 404
        
        # Validate required fields
        required_fields = ['activity_type', 'activity_name', 'responsible_member_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'status': 'error', 'message': f'Missing required field: {field}'}), 400
        
        # Validate responsible member
        responsible_member = GroupMember.query.get(data['responsible_member_id'])
        if not responsible_member or responsible_member.group_id != meeting.group_id:
            return jsonify({'status': 'error', 'message': 'Invalid responsible member'}), 400
        
        # Get next activity order
        last_activity = MeetingActivity.query.filter_by(meeting_id=meeting_id)\
                                           .order_by(MeetingActivity.activity_order.desc())\
                                           .first()
        activity_order = (last_activity.activity_order + 1) if last_activity else 1
        
        # Create activity
        activity = MeetingActivity(
            meeting_id=meeting_id,
            activity_type=data['activity_type'],
            activity_name=data['activity_name'],
            activity_order=activity_order,
            responsible_member_id=data['responsible_member_id'],
            created_by=user_id
        )
        
        if 'description' in data:
            activity.description = data['description']
        
        # Set expected members count
        total_members = GroupMember.query.filter_by(group_id=meeting.group_id, is_active=True).count()
        activity.members_expected = total_members
        
        db.session.add(activity)
        db.session.flush()  # Get activity ID
        
        # Create participation records for all active members
        active_members = GroupMember.query.filter_by(group_id=meeting.group_id, is_active=True).all()
        for member in active_members:
            participation = MemberActivityParticipation(
                meeting_activity_id=activity.id,
                member_id=member.id,
                participation_type='PENDING',
                recorded_by=user_id
            )
            db.session.add(participation)
        
        db.session.commit()
        
        # Create notification
        create_system_notification(
            user_id=user_id,
            title=f"New Activity Created",
            message=f"Activity '{activity.activity_name}' has been created for meeting #{meeting.meeting_number}",
            notification_type="MEETING_ACTIVITY",
            related_id=activity.id
        )
        
        return jsonify({
            'status': 'success',
            'data': activity.to_json(),
            'message': 'Activity created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/activities/<int:activity_id>/start', methods=['POST'])
@authenticate
def start_activity(user_id, activity_id):
    """Start an activity"""
    try:
        activity = MeetingActivity.query.get(activity_id)
        if not activity:
            return jsonify({'status': 'error', 'message': 'Activity not found'}), 404
        
        if activity.status != 'PENDING':
            return jsonify({'status': 'error', 'message': 'Activity cannot be started'}), 400
        
        activity.start_activity()
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': activity.to_json(),
            'message': 'Activity started successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/activities/<int:activity_id>/complete', methods=['POST'])
@authenticate
def complete_activity(user_id, activity_id):
    """Complete an activity"""
    try:
        data = request.get_json() or {}
        
        activity = MeetingActivity.query.get(activity_id)
        if not activity:
            return jsonify({'status': 'error', 'message': 'Activity not found'}), 404
        
        if activity.status not in ['IN_PROGRESS', 'PENDING']:
            return jsonify({'status': 'error', 'message': 'Activity cannot be completed'}), 400
        
        # Calculate totals from participations
        participations = MemberActivityParticipation.query.filter_by(
            meeting_activity_id=activity_id
        ).all()
        
        total_amount = sum([p.amount for p in participations if p.status == 'COMPLETED'])
        members_participated = len([p for p in participations if p.status == 'COMPLETED'])
        
        activity.complete_activity(
            outcome_notes=data.get('outcome_notes'),
            total_amount=total_amount
        )
        
        activity.members_participated = members_participated
        
        # Add optional fields
        if 'challenges_faced' in data:
            activity.challenges_faced = data['challenges_faced']
        if 'success_factors' in data:
            activity.success_factors = data['success_factors']
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': activity.to_json(),
            'message': 'Activity completed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/activities/<int:activity_id>/participation', methods=['GET'])
@authenticate
def get_activity_participation(user_id, activity_id):
    """Get participation records for an activity"""
    try:
        activity = MeetingActivity.query.get(activity_id)
        if not activity:
            return jsonify({'status': 'error', 'message': 'Activity not found'}), 404
        
        participations = MemberActivityParticipation.query.filter_by(
            meeting_activity_id=activity_id
        ).all()
        
        participation_data = [p.to_json() for p in participations]
        
        return jsonify({
            'status': 'success',
            'data': {
                'activity_id': activity_id,
                'participations': participation_data,
                'summary': {
                    'total_members': len(participations),
                    'completed': len([p for p in participations if p.status == 'COMPLETED']),
                    'pending': len([p for p in participations if p.status == 'PENDING']),
                    'total_amount': sum([p.amount for p in participations if p.status == 'COMPLETED'])
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/activities/<int:activity_id>/participation', methods=['POST'])
@authenticate
def record_member_participation(user_id, activity_id):
    """Record or update member participation in an activity"""
    try:
        data = request.get_json()

        activity = MeetingActivity.query.get(activity_id)
        if not activity:
            return jsonify({'status': 'error', 'message': 'Activity not found'}), 404

        # Validate required fields
        required_fields = ['member_id', 'participation_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'status': 'error', 'message': f'Missing required field: {field}'}), 400

        # Validate member
        member = GroupMember.query.get(data['member_id'])
        if not member or member.group_id != activity.meeting.group_id:
            return jsonify({'status': 'error', 'message': 'Invalid member'}), 400

        # Find or create participation record
        participation = MemberActivityParticipation.query.filter_by(
            meeting_activity_id=activity_id,
            member_id=data['member_id']
        ).first()

        if not participation:
            participation = MemberActivityParticipation(
                meeting_activity_id=activity_id,
                member_id=data['member_id'],
                participation_type=data['participation_type'],
                recorded_by=user_id
            )
            db.session.add(participation)
        else:
            participation.participation_type = data['participation_type']
            participation.recorded_by = user_id
            participation.participation_time = datetime.now()

        # Update participation details
        if 'amount' in data:
            participation.amount = Decimal(str(data['amount']))
        if 'status' in data:
            participation.status = data['status']
        if 'notes' in data:
            participation.notes = data['notes']
        if 'challenges' in data:
            participation.challenges = data['challenges']

        # Calculate participation score
        participation.calculate_participation_score()

        db.session.commit()

        return jsonify({
            'status': 'success',
            'data': participation.to_json(),
            'message': 'Participation recorded successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/activities/<int:activity_id>/participation/<int:member_id>', methods=['PUT'])
@authenticate
def update_member_participation(user_id, activity_id, member_id):
    """Update specific member participation"""
    try:
        data = request.get_json()

        participation = MemberActivityParticipation.query.filter_by(
            meeting_activity_id=activity_id,
            member_id=member_id
        ).first()

        if not participation:
            return jsonify({'status': 'error', 'message': 'Participation record not found'}), 404

        # Update fields
        if 'participation_type' in data:
            participation.participation_type = data['participation_type']
        if 'amount' in data:
            participation.amount = Decimal(str(data['amount']))
        if 'status' in data:
            participation.status = data['status']
        if 'notes' in data:
            participation.notes = data['notes']
        if 'challenges' in data:
            participation.challenges = data['challenges']

        participation.recorded_by = user_id
        participation.participation_time = datetime.now()

        # Recalculate participation score
        participation.calculate_participation_score()

        db.session.commit()

        return jsonify({
            'status': 'success',
            'data': participation.to_json(),
            'message': 'Participation updated successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/activities/<int:activity_id>/documents', methods=['GET'])
@authenticate
def get_activity_documents(user_id, activity_id):
    """Get all documents for an activity"""
    try:
        activity = MeetingActivity.query.get(activity_id)
        if not activity:
            return jsonify({'status': 'error', 'message': 'Activity not found'}), 404

        documents = ActivityDocument.query.filter_by(meeting_activity_id=activity_id).all()
        documents_data = [doc.to_json() for doc in documents]

        return jsonify({
            'status': 'success',
            'data': {
                'activity_id': activity_id,
                'documents': documents_data,
                'summary': {
                    'total_documents': len(documents),
                    'verified_documents': len([d for d in documents if d.is_verified]),
                    'document_types': list(set([d.document_type for d in documents]))
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/activities/<int:activity_id>/documents/upload', methods=['POST'])
@authenticate
def upload_activity_document(user_id, activity_id):
    """Upload a document for an activity"""
    try:
        activity = MeetingActivity.query.get(activity_id)
        if not activity:
            return jsonify({'status': 'error', 'message': 'Activity not found'}), 404

        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'status': 'error', 'message': 'File type not allowed'}), 400

        # Get form data
        document_type = request.form.get('document_type', 'OTHER')
        title = request.form.get('title', file.filename)
        description = request.form.get('description', '')
        access_level = request.form.get('access_level', 'GROUP')

        # Generate unique filename
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"

        # Create directory structure
        upload_base = get_file_upload_path()
        meeting_dir = os.path.join(upload_base, 'meetings', str(activity.meeting_id))
        activity_dir = os.path.join(meeting_dir, 'activities', str(activity_id))

        os.makedirs(activity_dir, exist_ok=True)

        # Save file
        file_path = os.path.join(activity_dir, unique_filename)
        file.save(file_path)

        # Get file info
        file_size = os.path.getsize(file_path)

        # Create document record
        document = ActivityDocument(
            meeting_id=activity.meeting_id,
            document_type=document_type,
            file_name=unique_filename,
            original_file_name=original_filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file_extension,
            mime_type=file.mimetype or 'application/octet-stream',
            title=title,
            uploaded_by=user_id
        )

        document.meeting_activity_id = activity_id
        document.description = description
        document.access_level = access_level

        db.session.add(document)

        # Update activity attachment count
        activity.has_attachments = True
        activity.attachment_count = ActivityDocument.query.filter_by(meeting_activity_id=activity_id).count() + 1

        db.session.commit()

        return jsonify({
            'status': 'success',
            'data': document.to_json(),
            'message': 'Document uploaded successfully'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/meetings/<int:meeting_id>/documents/upload', methods=['POST'])
@authenticate
def upload_meeting_document(user_id, meeting_id):
    """Upload a general document for a meeting (not tied to specific activity)"""
    try:
        meeting = Meeting.query.get(meeting_id)
        if not meeting:
            return jsonify({'status': 'error', 'message': 'Meeting not found'}), 404

        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'status': 'error', 'message': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'status': 'error', 'message': 'File type not allowed'}), 400

        # Get form data
        document_type = request.form.get('document_type', 'OTHER')
        title = request.form.get('title', file.filename)
        description = request.form.get('description', '')
        access_level = request.form.get('access_level', 'GROUP')

        # Generate unique filename
        original_filename = secure_filename(file.filename)
        file_extension = original_filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"

        # Create directory structure
        upload_base = get_file_upload_path()
        meeting_dir = os.path.join(upload_base, 'meetings', str(meeting_id))
        general_dir = os.path.join(meeting_dir, 'general')

        os.makedirs(general_dir, exist_ok=True)

        # Save file
        file_path = os.path.join(general_dir, unique_filename)
        file.save(file_path)

        # Get file info
        file_size = os.path.getsize(file_path)

        # Create document record
        document = ActivityDocument(
            meeting_id=meeting_id,
            document_type=document_type,
            file_name=unique_filename,
            original_file_name=original_filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file_extension,
            mime_type=file.mimetype or 'application/octet-stream',
            title=title,
            uploaded_by=user_id
        )

        document.description = description
        document.access_level = access_level

        db.session.add(document)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'data': document.to_json(),
            'message': 'Document uploaded successfully'
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/groups/<int:group_id>/activities/analytics', methods=['GET'])
@authenticate
def get_group_activity_analytics(group_id):
    """Get comprehensive analytics for group activities"""
    try:
        # Get time range parameter
        time_range = request.args.get('time_range', '3months')

        # Calculate date range
        end_date = datetime.now()
        if time_range == '1month':
            start_date = end_date - timedelta(days=30)
        elif time_range == '3months':
            start_date = end_date - timedelta(days=90)
        elif time_range == '6months':
            start_date = end_date - timedelta(days=180)
        elif time_range == '1year':
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=90)  # Default to 3 months

        # Get previous period for comparison
        period_length = (end_date - start_date).days
        prev_start_date = start_date - timedelta(days=period_length)
        prev_end_date = start_date

        # Base query for meetings in the group
        meetings_query = Meeting.query.filter(
            Meeting.group_id == group_id,
            Meeting.meeting_date >= start_date,
            Meeting.meeting_date <= end_date
        )

        prev_meetings_query = Meeting.query.filter(
            Meeting.group_id == group_id,
            Meeting.meeting_date >= prev_start_date,
            Meeting.meeting_date < prev_end_date
        )

        # Overall statistics
        total_meetings = meetings_query.count()
        prev_total_meetings = prev_meetings_query.count()
        meetings_trend = ((total_meetings - prev_total_meetings) / max(prev_total_meetings, 1)) * 100

        # Activity statistics
        activities_query = db.session.query(MeetingActivity).join(Meeting).filter(
            Meeting.group_id == group_id,
            Meeting.meeting_date >= start_date,
            Meeting.meeting_date <= end_date
        )

        prev_activities_query = db.session.query(MeetingActivity).join(Meeting).filter(
            Meeting.group_id == group_id,
            Meeting.meeting_date >= prev_start_date,
            Meeting.meeting_date < prev_end_date
        )

        total_activities = activities_query.count()
        prev_total_activities = prev_activities_query.count()
        activities_trend = ((total_activities - prev_total_activities) / max(prev_total_activities, 1)) * 100

        completed_activities = activities_query.filter(MeetingActivity.status == 'COMPLETED').count()
        completion_rate = (completed_activities / max(total_activities, 1)) * 100

        # Financial statistics
        total_amount = db.session.query(func.sum(ActivityTransaction.amount)).join(MeetingActivity).join(Meeting).filter(
            Meeting.group_id == group_id,
            Meeting.meeting_date >= start_date,
            Meeting.meeting_date <= end_date
        ).scalar() or 0

        prev_total_amount = db.session.query(func.sum(ActivityTransaction.amount)).join(MeetingActivity).join(Meeting).filter(
            Meeting.group_id == group_id,
            Meeting.meeting_date >= prev_start_date,
            Meeting.meeting_date < prev_end_date
        ).scalar() or 0

        amount_trend = ((total_amount - prev_total_amount) / max(prev_total_amount, 1)) * 100

        # Activity type performance
        activity_type_stats = db.session.query(
            MeetingActivity.activity_type,
            func.count(MeetingActivity.id).label('total_count'),
            func.sum(func.case([(MeetingActivity.status == 'COMPLETED', 1)], else_=0)).label('completed_count'),
            func.avg(func.coalesce(MeetingActivity.participation_rate, 0)).label('avg_participation'),
            func.sum(func.coalesce(ActivityTransaction.amount, 0)).label('total_amount'),
            func.avg(func.coalesce(MeetingActivity.duration_minutes, 0)).label('avg_duration')
        ).outerjoin(ActivityTransaction).join(Meeting).filter(
            Meeting.group_id == group_id,
            Meeting.meeting_date >= start_date,
            Meeting.meeting_date <= end_date
        ).group_by(MeetingActivity.activity_type).all()

        activity_types = []
        for stat in activity_type_stats:
            completion_rate_type = (stat.completed_count / max(stat.total_count, 1)) * 100
            activity_types.append({
                'activity_type': stat.activity_type,
                'total_count': stat.total_count,
                'completion_rate': completion_rate_type,
                'avg_participation': float(stat.avg_participation or 0),
                'total_amount': float(stat.total_amount or 0),
                'avg_duration': int(stat.avg_duration or 0)
            })

        # Top performing members
        member_stats = db.session.query(
            GroupMember.id.label('member_id'),
            GroupMember.name.label('member_name'),
            func.count(MemberActivityParticipation.id).label('total_participations'),
            func.avg(MemberActivityParticipation.participation_score).label('avg_score'),
            func.sum(func.case([(MemberActivityParticipation.status == 'COMPLETED', 1)], else_=0)).label('completed_participations')
        ).join(MemberActivityParticipation).join(MeetingActivity).join(Meeting).filter(
            Meeting.group_id == group_id,
            Meeting.meeting_date >= start_date,
            Meeting.meeting_date <= end_date
        ).group_by(GroupMember.id, GroupMember.name).order_by(
            desc(func.avg(MemberActivityParticipation.participation_score))
        ).limit(10).all()

        top_members = []
        for member in member_stats:
            participation_rate = (member.completed_participations / max(member.total_participations, 1)) * 100
            top_members.append({
                'member_id': member.member_id,
                'member_name': member.member_name,
                'participation_rate': participation_rate,
                'avg_score': float(member.avg_score or 0),
                'total_participations': member.total_participations
            })

        # Financial summary by activity type
        financial_summary = db.session.query(
            MeetingActivity.activity_type,
            func.sum(ActivityTransaction.amount).label('total_amount'),
            func.count(ActivityTransaction.id).label('transaction_count')
        ).join(ActivityTransaction).join(Meeting).filter(
            Meeting.group_id == group_id,
            Meeting.meeting_date >= start_date,
            Meeting.meeting_date <= end_date,
            ActivityTransaction.amount > 0
        ).group_by(MeetingActivity.activity_type).order_by(
            desc(func.sum(ActivityTransaction.amount))
        ).all()

        financial_data = []
        for item in financial_summary:
            financial_data.append({
                'activity_type': item.activity_type,
                'total_amount': float(item.total_amount or 0),
                'transaction_count': item.transaction_count
            })

        return jsonify({
            'status': 'success',
            'data': {
                'overview': {
                    'total_meetings': total_meetings,
                    'meetings_trend': round(meetings_trend, 1),
                    'total_activities': total_activities,
                    'activities_trend': round(activities_trend, 1),
                    'completion_rate': round(completion_rate, 1),
                    'total_amount': float(total_amount),
                    'amount_trend': round(amount_trend, 1)
                },
                'activity_types': activity_types,
                'top_members': top_members,
                'financial_summary': financial_data,
                'time_range': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'period': time_range
                }
            }
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_activities_blueprint.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for meeting activities API"""
    return jsonify({
        'status': 'success',
        'message': 'Meeting Activities API is healthy',
        'service': 'meeting-activities',
        'version': '1.0.0'
    })


@meeting_activities_blueprint.route('/demo/create-meeting', methods=['POST'])
@authenticate
def create_demo_meeting(user_id):
    """Create a demo meeting for testing file upload functionality"""
    try:
        data = request.get_json()

        # Create meeting using raw SQL to avoid session issues
        from project import db

        from sqlalchemy import text
        meeting_id = db.session.execute(
            text('''INSERT INTO meetings (group_id, meeting_date, chairperson_id, secretary_id, treasurer_id, created_by, meeting_type, meeting_number, status, created_date, updated_date)
               VALUES (:group_id, :meeting_date, :chairperson_id, :secretary_id, :treasurer_id, :created_by, :meeting_type, 1, 'SCHEDULED', NOW(), NOW())
               RETURNING id'''),
            {
                'group_id': data.get('group_id', 7),
                'meeting_date': data.get('meeting_date', '2025-09-22'),
                'chairperson_id': data.get('chairperson_id', 19),
                'secretary_id': data.get('secretary_id', 20),
                'treasurer_id': data.get('treasurer_id', 21),
                'created_by': user_id,
                'meeting_type': 'REGULAR'
            }
        ).fetchone()[0]

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Demo meeting created successfully',
            'meeting_id': meeting_id,
            'group_id': data.get('group_id', 7),
            'meeting_date': data.get('meeting_date', '2025-09-22')
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to create demo meeting: {str(e)}'
        }), 500


@meeting_activities_blueprint.route('/demo/create-activity', methods=['POST'])
@authenticate
def create_demo_activity(user_id):
    """Create a demo activity for testing file upload functionality"""
    try:
        data = request.get_json()

        # Create activity using raw SQL
        from project import db

        from sqlalchemy import text
        activity_id = db.session.execute(
            text('''INSERT INTO meeting_activities (meeting_id, activity_type, title, description, sequence_order, expected_duration_minutes, created_by, status, created_date, updated_date)
               VALUES (:meeting_id, :activity_type, :title, :description, 1, 30, :created_by, 'PLANNED', NOW(), NOW())
               RETURNING id'''),
            {
                'meeting_id': data.get('meeting_id', 1),
                'activity_type': data.get('activity_type', 'SAVINGS_COLLECTION'),
                'title': data.get('title', 'Weekly Savings Collection'),
                'description': data.get('description', 'Collect weekly savings contributions from all members'),
                'created_by': user_id
            }
        ).fetchone()[0]

        db.session.commit()

        return jsonify({
            'status': 'success',
            'message': 'Demo activity created successfully',
            'activity_id': activity_id,
            'meeting_id': data.get('meeting_id', 1),
            'activity_type': data.get('activity_type', 'SAVINGS_COLLECTION'),
            'title': data.get('title', 'Weekly Savings Collection')
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to create demo activity: {str(e)}'
        }), 500
