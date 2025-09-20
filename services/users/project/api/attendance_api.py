"""
Professional Attendance Management API
World-class attendance tracking with multiple verification methods
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from decimal import Decimal
import json
import base64
import os

from project import db
from project.api.auth import authenticate
from project.api.models import Meeting, GroupMember, User, AttendanceSession, AttendanceRecord
from project.api.business_rules_models import GroupBusinessRules


attendance_blueprint = Blueprint('attendance', __name__)


@attendance_blueprint.route('/api/meetings/<int:meeting_id>/attendance/session', methods=['POST'])
@authenticate
def create_attendance_session(user_id, meeting_id):
    """Create professional attendance session for a meeting"""
    try:
        data = request.get_json()
        
        meeting = Meeting.query.get(meeting_id)
        if not meeting:
            return jsonify({'status': 'error', 'message': 'Meeting not found'}), 404

        # Check if session already exists
        existing_session = AttendanceSession.query.filter_by(meeting_id=meeting_id).first()
        if existing_session:
            return jsonify({'status': 'error', 'message': 'Attendance session already exists for this meeting'}), 400

        # Get group business rules to determine attendance configuration
        business_rules = GroupBusinessRules.query.filter_by(group_id=meeting.group_id).first()
        attendance_config = business_rules.get_attendance_configuration() if business_rules else {
            "mode": "MANUAL",
            "requires_physical_presence": True,
            "allows_remote_attendance": False,
            "features": {"manual_checkin": True}
        }
        
        # Create attendance session
        session = AttendanceSession(
            meeting_id=meeting_id,
            created_by=user_id,
            meeting_latitude=Decimal(str(data.get('latitude'))) if data.get('latitude') else None,
            meeting_longitude=Decimal(str(data.get('longitude'))) if data.get('longitude') else None
        )
        
        # Configure session settings based on business rules and data
        session.geofence_radius_meters = data.get('geofence_radius_meters', 100)
        session.late_threshold_minutes = data.get('late_threshold_minutes', 15)

        # Apply business rules for verification requirements
        session.requires_photo_verification = (
            data.get('requires_photo_verification', attendance_config["features"].get("photo_verification", False))
        )
        session.requires_location_verification = (
            data.get('requires_location_verification', attendance_config["features"].get("gps_verification", False))
        )
        session.allows_remote_attendance = (
            data.get('allows_remote_attendance', attendance_config.get("allows_remote_attendance", False))
        )
        
        # Set expected attendees count
        session.total_expected_attendees = GroupMember.query.filter_by(
            group_id=meeting.group_id, 
            is_active=True
        ).count()
        
        db.session.add(session)
        db.session.flush()  # Get session ID
        
        # Update QR code data with session ID
        qr_data = json.loads(session.qr_code_data)
        qr_data['session_id'] = session.id
        session.qr_code_data = json.dumps(qr_data)
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': session.to_json(),
            'message': 'Attendance session created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@attendance_blueprint.route('/api/meetings/<int:meeting_id>/attendance/session', methods=['GET'])
@authenticate
def get_attendance_session(user_id, meeting_id):
    """Get attendance session details"""
    try:
        session = AttendanceSession.query.filter_by(meeting_id=meeting_id).first()
        if not session:
            return jsonify({'status': 'error', 'message': 'No attendance session found for this meeting'}), 404
        
        return jsonify({
            'status': 'success',
            'data': session.to_json()
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@attendance_blueprint.route('/api/attendance/check-in', methods=['POST'])
@authenticate
def check_in_member(user_id):
    """Professional member check-in with multiple verification methods"""
    try:
        data = request.get_json()
        
        # Validate required fields
        session_id = data.get('session_id')
        member_id = data.get('member_id')
        check_in_method = data.get('check_in_method', 'MANUAL')
        
        if not session_id or not member_id:
            return jsonify({'status': 'error', 'message': 'Session ID and Member ID are required'}), 400
        
        # Get session and validate
        session = AttendanceSession.query.get(session_id)
        if not session:
            return jsonify({'status': 'error', 'message': 'Attendance session not found'}), 404
        
        if not session.is_check_in_open():
            return jsonify({'status': 'error', 'message': 'Check-in is not currently open for this session'}), 400
        
        # Check if member already checked in
        existing_record = AttendanceRecord.query.filter_by(
            session_id=session_id, 
            member_id=member_id
        ).first()
        
        if existing_record:
            return jsonify({'status': 'error', 'message': 'Member already checked in'}), 400
        
        # Validate member exists and belongs to group
        member = GroupMember.query.get(member_id)
        if not member or member.group_id != session.meeting.group_id:
            return jsonify({'status': 'error', 'message': 'Invalid member for this meeting'}), 400
        
        # Create attendance record
        attendance_record = AttendanceRecord(
            session_id=session_id,
            member_id=member_id,
            check_in_method=check_in_method,
            recorded_by=user_id
        )
        
        # Process verification data
        verification_errors = []
        
        # Location verification
        if session.requires_location_verification and not session.allows_remote_attendance:
            latitude = data.get('latitude')
            longitude = data.get('longitude')
            
            if not latitude or not longitude:
                verification_errors.append('Location verification required but coordinates not provided')
            else:
                attendance_record.location_latitude = Decimal(str(latitude))
                attendance_record.location_longitude = Decimal(str(longitude))
                attendance_record.location_accuracy_meters = data.get('location_accuracy_meters')
                
                # Verify location is within geofence
                if session.meeting_latitude and session.meeting_longitude:
                    if not attendance_record.is_location_verified(
                        session.meeting_latitude, 
                        session.meeting_longitude, 
                        session.geofence_radius_meters
                    ):
                        verification_errors.append('Location verification failed - outside meeting area')
        
        # Photo verification
        if session.requires_photo_verification:
            photo_data = data.get('photo_verification')
            if not photo_data:
                verification_errors.append('Photo verification required but not provided')
            else:
                # In a real implementation, you would:
                # 1. Validate the photo
                # 2. Store it securely (AWS S3, etc.)
                # 3. Optionally run face recognition
                attendance_record.photo_verification_url = f"photos/attendance/{session_id}_{member_id}.jpg"
        
        # Device information
        if data.get('device_info'):
            attendance_record.device_info = json.dumps(data['device_info'])
        
        # Handle verification errors
        if verification_errors:
            return jsonify({
                'status': 'error', 
                'message': 'Verification failed',
                'verification_errors': verification_errors
            }), 400
        
        # Set participation flags if provided
        attendance_record.participated_in_discussions = data.get('participated_in_discussions', False)
        attendance_record.contributed_to_savings = data.get('contributed_to_savings', False)
        attendance_record.voted_on_decisions = data.get('voted_on_decisions', False)
        
        # Calculate participation score
        attendance_record.calculate_participation_score()
        
        # Add notes if provided
        if data.get('notes'):
            attendance_record.notes = data['notes']
        
        # Save attendance record
        db.session.add(attendance_record)
        
        # Update session statistics
        session.total_checked_in += 1
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': attendance_record.to_json(),
            'message': 'Check-in successful'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@attendance_blueprint.route('/api/attendance/qr-check-in', methods=['POST'])
@authenticate
def qr_code_check_in(user_id):
    """QR code-based check-in"""
    try:
        data = request.get_json()
        
        # Decode QR code data
        qr_code_data = data.get('qr_code_data')
        if not qr_code_data:
            return jsonify({'status': 'error', 'message': 'QR code data required'}), 400
        
        try:
            qr_info = json.loads(qr_code_data)
        except json.JSONDecodeError:
            return jsonify({'status': 'error', 'message': 'Invalid QR code format'}), 400
        
        # Validate QR code
        session_id = qr_info.get('session_id')
        session_code = qr_info.get('session_code')
        
        session = AttendanceSession.query.get(session_id)
        if not session or session.session_code != session_code:
            return jsonify({'status': 'error', 'message': 'Invalid or expired QR code'}), 400
        
        # Add QR-specific data to check-in request
        check_in_data = data.copy()
        check_in_data['session_id'] = session_id
        check_in_data['check_in_method'] = 'QR_CODE'
        
        # Use the regular check-in process
        return check_in_member_internal(user_id, check_in_data)
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@attendance_blueprint.route('/api/attendance/sessions/<int:session_id>/records', methods=['GET'])
@authenticate
def get_attendance_records(user_id, session_id):
    """Get all attendance records for a session"""
    try:
        session = AttendanceSession.query.get(session_id)
        if not session:
            return jsonify({'status': 'error', 'message': 'Attendance session not found'}), 404
        
        records = AttendanceRecord.query.filter_by(session_id=session_id).all()
        
        return jsonify({
            'status': 'success',
            'data': {
                'session': session.to_json(),
                'records': [record.to_json() for record in records],
                'summary': {
                    'total_expected': session.total_expected_attendees,
                    'total_checked_in': len(records),
                    'present_count': len([r for r in records if r.attendance_status == 'PRESENT']),
                    'late_count': len([r for r in records if r.attendance_status == 'LATE']),
                    'absent_count': session.total_expected_attendees - len(records),
                    'average_participation_score': sum([r.participation_score for r in records]) / len(records) if records else 0
                }
            }
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@attendance_blueprint.route('/api/attendance/records/<int:record_id>/excuse', methods=['POST'])
@authenticate
def submit_excuse(user_id, record_id):
    """Submit excuse for absence or late arrival"""
    try:
        data = request.get_json()
        
        record = AttendanceRecord.query.get(record_id)
        if not record:
            return jsonify({'status': 'error', 'message': 'Attendance record not found'}), 404
        
        # Update excuse information
        record.excuse_reason = data.get('excuse_reason')
        record.excuse_details = data.get('excuse_details')
        
        # If excuse is being approved by an admin
        if data.get('approve_excuse') and user_id != record.member.user_id:
            record.excuse_approved_by = user_id
            record.excuse_approved_date = datetime.now()
            record.attendance_status = 'EXCUSED'
            
            # Recalculate participation score for excused absence
            record.calculate_participation_score()
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': record.to_json(),
            'message': 'Excuse submitted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


def check_in_member_internal(user_id, data):
    """Internal check-in function for reuse"""
    # This is the same logic as check_in_member but without the @authenticate decorator
    # Used by QR code check-in and other internal processes
    pass  # Implementation would be the same as check_in_member
