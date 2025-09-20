"""
Meeting Management API Endpoints
Professional API for comprehensive meeting workflow management
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, date, timedelta
from decimal import Decimal
import json

from project import db
from project.api.auth import authenticate
from project.api.models import SavingsGroup, GroupMember, User
from project.api.models import (
    GroupConstitution, Meeting, SavingsGroup, GroupMember, User
)


meeting_blueprint = Blueprint('meetings', __name__)


@meeting_blueprint.route('/api/groups/<int:group_id>/constitution', methods=['GET'])
@authenticate
def get_group_constitution(user_id, group_id):
    """Get group constitution and governance rules"""
    try:
        group = SavingsGroup.query.get(group_id)
        if not group:
            return jsonify({'status': 'error', 'message': 'Group not found'}), 404
        
        constitution = GroupConstitution.query.filter_by(group_id=group_id).first()
        if not constitution:
            return jsonify({
                'status': 'success',
                'data': None,
                'message': 'No constitution found for this group'
            })
        
        return jsonify({
            'status': 'success',
            'data': constitution.to_json()
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_blueprint.route('/api/groups/<int:group_id>/constitution', methods=['POST'])
@authenticate
def create_group_constitution(user_id, group_id):
    """Create or update group constitution"""
    try:
        data = request.get_json()
        
        group = SavingsGroup.query.get(group_id)
        if not group:
            return jsonify({'status': 'error', 'message': 'Group not found'}), 404
        
        # Check if constitution already exists
        existing_constitution = GroupConstitution.query.filter_by(group_id=group_id).first()
        if existing_constitution:
            return jsonify({'status': 'error', 'message': 'Constitution already exists. Use PUT to update.'}), 400
        
        constitution = GroupConstitution(
            group_id=group_id,
            title=data.get('title', f'{group.name} Constitution'),
            created_by=user_id,
            preamble=data.get('preamble'),
            meeting_frequency=data.get('meeting_frequency', 'WEEKLY'),
            quorum_percentage=Decimal(str(data.get('quorum_percentage', 60.00))),
            voting_threshold=Decimal(str(data.get('voting_threshold', 50.00))),
            minimum_personal_savings=Decimal(str(data.get('minimum_personal_savings', 5000.00))),
            minimum_ecd_contribution=Decimal(str(data.get('minimum_ecd_contribution', 2000.00))),
            minimum_social_contribution=Decimal(str(data.get('minimum_social_contribution', 1000.00))),
            max_loan_multiplier=Decimal(str(data.get('max_loan_multiplier', 3.00))),
            loan_interest_rate=Decimal(str(data.get('loan_interest_rate', 10.00))),
            max_loan_term_months=data.get('max_loan_term_months', 12),
            absence_fine=Decimal(str(data.get('absence_fine', 1000.00))),
            late_payment_fine=Decimal(str(data.get('late_payment_fine', 500.00))),
            leadership_term_months=data.get('leadership_term_months', 12)
        )
        
        db.session.add(constitution)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': constitution.to_json(),
            'message': 'Constitution created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_blueprint.route('/api/groups/<int:group_id>/meetings', methods=['GET'])
@authenticate
def get_group_meetings(user_id, group_id):
    """Get all meetings for a group with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        meeting_type = request.args.get('meeting_type')
        
        query = Meeting.query.filter_by(group_id=group_id)
        
        if status:
            query = query.filter_by(status=status)
        if meeting_type:
            query = query.filter_by(meeting_type=meeting_type)
        
        meetings = query.order_by(Meeting.meeting_date.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'status': 'success',
            'data': {
                'meetings': [meeting.to_json() for meeting in meetings.items],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': meetings.total,
                    'pages': meetings.pages,
                    'has_next': meetings.has_next,
                    'has_prev': meetings.has_prev
                }
            }
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_blueprint.route('/api/groups/<int:group_id>/meetings', methods=['POST'])
@authenticate
def create_meeting(user_id, group_id):
    """Create a new meeting"""
    try:
        data = request.get_json()
        
        group = SavingsGroup.query.get(group_id)
        if not group:
            return jsonify({'status': 'error', 'message': 'Group not found'}), 404
        
        # Validate leadership roles
        chairperson = GroupMember.query.get(data.get('chairperson_id'))
        secretary = GroupMember.query.get(data.get('secretary_id'))
        treasurer = GroupMember.query.get(data.get('treasurer_id'))
        
        if not all([chairperson, secretary, treasurer]):
            return jsonify({'status': 'error', 'message': 'Invalid leadership member IDs'}), 400
        
        meeting_date = datetime.strptime(data['meeting_date'], '%Y-%m-%d').date()
        
        meeting = Meeting(
            group_id=group_id,
            meeting_date=meeting_date,
            chairperson_id=data['chairperson_id'],
            secretary_id=data['secretary_id'],
            treasurer_id=data['treasurer_id'],
            created_by=user_id,
            meeting_type=data.get('meeting_type', 'REGULAR')
        )
        
        # Set total members count
        meeting.total_members = GroupMember.query.filter_by(group_id=group_id, is_active=True).count()
        
        db.session.add(meeting)
        db.session.flush()  # Get meeting ID
        
        # Create default agenda
        agenda_title = f"{group.name} - Meeting #{meeting.meeting_number}"
        agenda = MeetingAgenda(
            meeting_id=meeting.id,
            title=agenda_title,
            prepared_by=data['chairperson_id']
        )
        
        # Create default workflow steps
        default_steps = [
            (1, "Call to Order", "OPENING", data['chairperson_id']),
            (2, "Reading of Previous Minutes", "MINUTES", data['secretary_id']),
            (3, "Personal Savings Collection", "SAVINGS", data['treasurer_id']),
            (4, "ECD Fund Collection", "SAVINGS", data['treasurer_id']),
            (5, "Social Fund Collection", "SAVINGS", data['treasurer_id']),
            (6, "Loan Applications Review", "LOANS", data['chairperson_id']),
            (7, "Loan Disbursements", "LOANS", data['treasurer_id']),
            (8, "Loan Repayments", "LOANS", data['treasurer_id']),
            (9, "Fines and Discipline", "FINES", data['chairperson_id']),
            (10, "Any Other Business", "AOB", data['chairperson_id']),
            (11, "Next Meeting Planning", "CLOSING", data['secretary_id']),
            (12, "Meeting Closure", "CLOSING", data['chairperson_id'])
        ]
        
        workflow_steps = []
        for step_order, step_name, step_type, responsible_id in default_steps:
            step = MeetingWorkflowStep(
                meeting_id=meeting.id,
                step_order=step_order,
                step_name=step_name,
                step_type=step_type,
                responsible_member_id=responsible_id
            )
            workflow_steps.append(step)
        
        db.session.add(agenda)
        db.session.add_all(workflow_steps)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': meeting.to_json(),
            'message': 'Meeting created successfully with default agenda and workflow'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_blueprint.route('/api/meetings/<int:meeting_id>', methods=['GET'])
@authenticate
def get_meeting_details(user_id, meeting_id):
    """Get detailed meeting information including agenda and workflow"""
    try:
        meeting = Meeting.query.get(meeting_id)
        if not meeting:
            return jsonify({'status': 'error', 'message': 'Meeting not found'}), 404
        
        meeting_data = meeting.to_json()
        
        # Add agenda information
        if meeting.agenda:
            meeting_data['agenda'] = meeting.agenda.to_json()
        
        # Add workflow steps
        workflow_steps = MeetingWorkflowStep.query.filter_by(meeting_id=meeting_id).order_by(MeetingWorkflowStep.step_order).all()
        meeting_data['workflow_steps'] = [step.to_json() for step in workflow_steps]
        
        # Add minutes if available
        if meeting.minutes:
            meeting_data['minutes'] = meeting.minutes.to_json()
        
        return jsonify({
            'status': 'success',
            'data': meeting_data
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_blueprint.route('/api/meetings/<int:meeting_id>/start', methods=['POST'])
@authenticate
def start_meeting(user_id, meeting_id):
    """Start a meeting and begin workflow tracking"""
    try:
        meeting = Meeting.query.get(meeting_id)
        if not meeting:
            return jsonify({'status': 'error', 'message': 'Meeting not found'}), 404
        
        if meeting.status != 'SCHEDULED':
            return jsonify({'status': 'error', 'message': 'Meeting cannot be started'}), 400
        
        meeting.status = 'IN_PROGRESS'
        meeting.start_time = datetime.now()
        
        # Start first workflow step
        first_step = MeetingWorkflowStep.query.filter_by(meeting_id=meeting_id, step_order=1).first()
        if first_step:
            first_step.start_step()
        
        # Update agenda
        if meeting.agenda:
            meeting.agenda.call_to_order_time = datetime.now()
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': meeting.to_json(),
            'message': 'Meeting started successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@meeting_blueprint.route('/api/meetings/<int:meeting_id>/workflow/<int:step_id>/complete', methods=['POST'])
@authenticate
def complete_workflow_step(user_id, meeting_id, step_id):
    """Complete a workflow step and move to next"""
    try:
        data = request.get_json()
        
        step = MeetingWorkflowStep.query.get(step_id)
        if not step or step.meeting_id != meeting_id:
            return jsonify({'status': 'error', 'message': 'Workflow step not found'}), 404
        
        if step.status != 'IN_PROGRESS':
            return jsonify({'status': 'error', 'message': 'Step is not in progress'}), 400
        
        # Complete current step
        step.complete_step(
            outcome_notes=data.get('outcome_notes'),
            financial_impact=Decimal(str(data.get('financial_impact', 0.00)))
        )
        
        # Update related agenda items
        if step.step_type == 'SAVINGS' and meeting.agenda:
            if 'Personal' in step.step_name:
                meeting.agenda.personal_savings_collected = True
            elif 'ECD' in step.step_name:
                meeting.agenda.ecd_fund_collected = True
            elif 'Social' in step.step_name:
                meeting.agenda.social_fund_collected = True
        
        # Start next step if available
        next_step = MeetingWorkflowStep.query.filter_by(
            meeting_id=meeting_id, 
            step_order=step.step_order + 1
        ).first()
        
        if next_step and next_step.status == 'PENDING':
            next_step.start_step()
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'data': {
                'completed_step': step.to_json(),
                'next_step': next_step.to_json() if next_step else None
            },
            'message': 'Workflow step completed successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'status': 'error', 'message': str(e)}), 500
