"""
Enhanced Meeting Workflow Models
Comprehensive models for savings group meeting management including:
- Group Constitution and Governance
- Meeting Agendas and Minutes
- Meeting Workflow Steps
- Leadership Roles and Responsibilities
- Voting and Decision Making
"""

from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import func
from project import db


class GroupConstitution(db.Model):
    """Group constitution and governance rules"""
    
    __tablename__ = "group_constitutions"
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False, unique=True)
    
    # Constitution details
    version = db.Column(db.String(20), nullable=False, default='1.0')
    title = db.Column(db.String(200), nullable=False)
    preamble = db.Column(db.Text, nullable=True)
    
    # Governance rules
    meeting_frequency = db.Column(db.String(20), nullable=False, default='WEEKLY')  # WEEKLY, BIWEEKLY, MONTHLY
    quorum_percentage = db.Column(db.Numeric(5, 2), nullable=False, default=60.00)  # Minimum attendance for valid meeting
    voting_threshold = db.Column(db.Numeric(5, 2), nullable=False, default=50.00)  # Percentage needed for decisions
    
    # Savings rules
    minimum_personal_savings = db.Column(db.Numeric(10, 2), nullable=False, default=5000.00)
    minimum_ecd_contribution = db.Column(db.Numeric(10, 2), nullable=False, default=2000.00)
    minimum_social_contribution = db.Column(db.Numeric(10, 2), nullable=False, default=1000.00)
    
    # Loan rules
    max_loan_multiplier = db.Column(db.Numeric(5, 2), nullable=False, default=3.00)  # Times savings balance
    loan_interest_rate = db.Column(db.Numeric(5, 2), nullable=False, default=10.00)  # Monthly percentage
    max_loan_term_months = db.Column(db.Integer, nullable=False, default=12)
    
    # Fine rules
    absence_fine = db.Column(db.Numeric(10, 2), nullable=False, default=1000.00)
    late_payment_fine = db.Column(db.Numeric(10, 2), nullable=False, default=500.00)
    misconduct_fine_range = db.Column(db.String(50), nullable=False, default='1000-10000')
    
    # Leadership rules
    leadership_term_months = db.Column(db.Integer, nullable=False, default=12)
    min_savings_for_leadership = db.Column(db.Numeric(10, 2), nullable=False, default=50000.00)
    
    # Document management
    document_url = db.Column(db.String(500), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    
    # Approval tracking
    approved_by_members = db.Column(db.Integer, default=0, nullable=False)
    total_eligible_voters = db.Column(db.Integer, default=0, nullable=False)
    approval_percentage = db.Column(db.Numeric(5, 2), default=0.00, nullable=False)
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    approved_date = db.Column(db.DateTime, nullable=True)
    last_amended_date = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    group = db.relationship('SavingsGroup', backref=db.backref('constitution', uselist=False))
    creator = db.relationship('User', backref='created_constitutions')
    
    def __init__(self, group_id, title, created_by, **kwargs):
        self.group_id = group_id
        self.title = title
        self.created_by = created_by
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def is_approved(self):
        """Check if constitution is approved by required majority"""
        if self.total_eligible_voters == 0:
            return False
        return self.approval_percentage >= self.voting_threshold
    
    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "version": self.version,
            "title": self.title,
            "meeting_frequency": self.meeting_frequency,
            "quorum_percentage": float(self.quorum_percentage),
            "voting_threshold": float(self.voting_threshold),
            "savings_rules": {
                "minimum_personal_savings": float(self.minimum_personal_savings),
                "minimum_ecd_contribution": float(self.minimum_ecd_contribution),
                "minimum_social_contribution": float(self.minimum_social_contribution)
            },
            "loan_rules": {
                "max_loan_multiplier": float(self.max_loan_multiplier),
                "loan_interest_rate": float(self.loan_interest_rate),
                "max_loan_term_months": self.max_loan_term_months
            },
            "fine_rules": {
                "absence_fine": float(self.absence_fine),
                "late_payment_fine": float(self.late_payment_fine),
                "misconduct_fine_range": self.misconduct_fine_range
            },
            "is_approved": self.is_approved(),
            "approval_percentage": float(self.approval_percentage),
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "approved_date": self.approved_date.isoformat() if self.approved_date else None
        }


class Meeting(db.Model):
    """Individual meeting instances with complete workflow tracking"""
    
    __tablename__ = "meetings"
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    
    # Meeting identification
    meeting_number = db.Column(db.Integer, nullable=False)  # Sequential meeting number for group
    meeting_date = db.Column(db.Date, nullable=False)
    meeting_type = db.Column(db.String(20), nullable=False, default='REGULAR')  # REGULAR, SPECIAL, ANNUAL, EMERGENCY
    
    # Meeting status and workflow
    status = db.Column(db.String(20), nullable=False, default='SCHEDULED')  # SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    start_time = db.Column(db.DateTime, nullable=True)
    end_time = db.Column(db.DateTime, nullable=True)
    
    # Leadership
    chairperson_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    secretary_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    treasurer_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    
    # Attendance tracking
    total_members = db.Column(db.Integer, nullable=False, default=0)
    members_present = db.Column(db.Integer, nullable=False, default=0)
    quorum_met = db.Column(db.Boolean, default=False, nullable=False)
    
    # Meeting outcomes
    total_savings_collected = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    loans_disbursed_count = db.Column(db.Integer, default=0, nullable=False)
    loans_disbursed_amount = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    fines_imposed_count = db.Column(db.Integer, default=0, nullable=False)
    fines_imposed_amount = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    
    # Meeting notes
    general_notes = db.Column(db.Text, nullable=True)
    action_items = db.Column(db.Text, nullable=True)  # JSON array of action items
    next_meeting_date = db.Column(db.Date, nullable=True)
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    group = db.relationship('SavingsGroup', backref='meetings')
    chairperson = db.relationship('GroupMember', foreign_keys=[chairperson_id], backref='chaired_meetings')
    secretary = db.relationship('GroupMember', foreign_keys=[secretary_id], backref='recorded_meetings')
    treasurer = db.relationship('GroupMember', foreign_keys=[treasurer_id], backref='treasured_meetings')
    creator = db.relationship('User', backref='created_meetings')
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('group_id', 'meeting_number', name='unique_group_meeting_number'),
        db.CheckConstraint("status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')", name='check_valid_meeting_status'),
        db.CheckConstraint("meeting_type IN ('REGULAR', 'SPECIAL', 'ANNUAL', 'EMERGENCY')", name='check_valid_meeting_type'),
        db.CheckConstraint('members_present <= total_members', name='check_attendance_logic'),
    )
    
    def __init__(self, group_id, meeting_date, chairperson_id, secretary_id, treasurer_id, created_by, meeting_type='REGULAR'):
        self.group_id = group_id
        self.meeting_date = meeting_date
        self.chairperson_id = chairperson_id
        self.secretary_id = secretary_id
        self.treasurer_id = treasurer_id
        self.created_by = created_by
        self.meeting_type = meeting_type
        
        # Auto-generate meeting number
        last_meeting = Meeting.query.filter_by(group_id=group_id).order_by(Meeting.meeting_number.desc()).first()
        self.meeting_number = (last_meeting.meeting_number + 1) if last_meeting else 1
    
    def calculate_quorum(self):
        """Calculate if quorum is met based on group constitution"""
        if self.total_members == 0:
            return False
        
        constitution = self.group.constitution
        if not constitution:
            # Default quorum of 60%
            required_percentage = 60.00
        else:
            required_percentage = constitution.quorum_percentage
        
        attendance_percentage = (self.members_present / self.total_members) * 100
        self.quorum_met = attendance_percentage >= required_percentage
        return self.quorum_met
    
    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "meeting_number": self.meeting_number,
            "meeting_date": self.meeting_date.isoformat() if self.meeting_date else None,
            "meeting_type": self.meeting_type,
            "status": self.status,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "leadership": {
                "chairperson": self.chairperson.name if self.chairperson else None,
                "secretary": self.secretary.name if self.secretary else None,
                "treasurer": self.treasurer.name if self.treasurer else None
            },
            "attendance": {
                "total_members": self.total_members,
                "members_present": self.members_present,
                "quorum_met": self.quorum_met,
                "attendance_percentage": round((self.members_present / self.total_members * 100), 2) if self.total_members > 0 else 0
            },
            "financial_summary": {
                "total_savings_collected": float(self.total_savings_collected),
                "loans_disbursed_count": self.loans_disbursed_count,
                "loans_disbursed_amount": float(self.loans_disbursed_amount),
                "fines_imposed_count": self.fines_imposed_count,
                "fines_imposed_amount": float(self.fines_imposed_amount)
            },
            "next_meeting_date": self.next_meeting_date.isoformat() if self.next_meeting_date else None,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class MeetingAgenda(db.Model):
    """Meeting agenda with structured workflow steps"""

    __tablename__ = "meeting_agendas"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False, unique=True)

    # Agenda metadata
    title = db.Column(db.String(200), nullable=False)
    prepared_by = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    preparation_date = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Standard agenda items (following the workflow you described)
    call_to_order_time = db.Column(db.DateTime, nullable=True)
    previous_minutes_read = db.Column(db.Boolean, default=False, nullable=False)
    previous_minutes_approved = db.Column(db.Boolean, default=False, nullable=False)

    # Savings collection workflow
    personal_savings_collected = db.Column(db.Boolean, default=False, nullable=False)
    ecd_fund_collected = db.Column(db.Boolean, default=False, nullable=False)
    social_fund_collected = db.Column(db.Boolean, default=False, nullable=False)
    target_savings_collected = db.Column(db.Boolean, default=False, nullable=False)

    # Loan workflow
    loan_applications_reviewed = db.Column(db.Boolean, default=False, nullable=False)
    loans_disbursed = db.Column(db.Boolean, default=False, nullable=False)
    loan_repayments_received = db.Column(db.Boolean, default=False, nullable=False)
    loan_defaulters_reviewed = db.Column(db.Boolean, default=False, nullable=False)

    # Discipline and fines
    fines_imposed = db.Column(db.Boolean, default=False, nullable=False)
    rule_violations_addressed = db.Column(db.Boolean, default=False, nullable=False)

    # Any Other Business (AOB)
    aob_items_discussed = db.Column(db.Boolean, default=False, nullable=False)
    aob_notes = db.Column(db.Text, nullable=True)

    # Meeting closure
    next_meeting_scheduled = db.Column(db.Boolean, default=False, nullable=False)
    meeting_closed_time = db.Column(db.DateTime, nullable=True)

    # Custom agenda items
    custom_items = db.Column(db.Text, nullable=True)  # JSON array of custom agenda items

    # Relationships
    meeting = db.relationship('Meeting', backref=db.backref('agenda', uselist=False))
    preparer = db.relationship('GroupMember', backref='prepared_agendas')

    def __init__(self, meeting_id, title, prepared_by):
        self.meeting_id = meeting_id
        self.title = title
        self.prepared_by = prepared_by

    def get_completion_percentage(self):
        """Calculate agenda completion percentage"""
        total_items = 12  # Standard agenda items
        completed_items = sum([
            self.previous_minutes_read,
            self.previous_minutes_approved,
            self.personal_savings_collected,
            self.ecd_fund_collected,
            self.social_fund_collected,
            self.target_savings_collected,
            self.loan_applications_reviewed,
            self.loans_disbursed,
            self.loan_repayments_received,
            self.fines_imposed,
            self.aob_items_discussed,
            self.next_meeting_scheduled
        ])
        return round((completed_items / total_items) * 100, 2)

    def to_json(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "title": self.title,
            "prepared_by": self.preparer.name if self.preparer else None,
            "preparation_date": self.preparation_date.isoformat() if self.preparation_date else None,
            "workflow_status": {
                "call_to_order_time": self.call_to_order_time.isoformat() if self.call_to_order_time else None,
                "previous_minutes_read": self.previous_minutes_read,
                "previous_minutes_approved": self.previous_minutes_approved,
                "savings_collection": {
                    "personal_savings_collected": self.personal_savings_collected,
                    "ecd_fund_collected": self.ecd_fund_collected,
                    "social_fund_collected": self.social_fund_collected,
                    "target_savings_collected": self.target_savings_collected
                },
                "loan_management": {
                    "loan_applications_reviewed": self.loan_applications_reviewed,
                    "loans_disbursed": self.loans_disbursed,
                    "loan_repayments_received": self.loan_repayments_received,
                    "loan_defaulters_reviewed": self.loan_defaulters_reviewed
                },
                "discipline": {
                    "fines_imposed": self.fines_imposed,
                    "rule_violations_addressed": self.rule_violations_addressed
                },
                "aob_items_discussed": self.aob_items_discussed,
                "next_meeting_scheduled": self.next_meeting_scheduled,
                "meeting_closed_time": self.meeting_closed_time.isoformat() if self.meeting_closed_time else None
            },
            "completion_percentage": self.get_completion_percentage(),
            "aob_notes": self.aob_notes,
            "custom_items": self.custom_items
        }


class MeetingMinutes(db.Model):
    """Detailed meeting minutes with secretary notes"""

    __tablename__ = "meeting_minutes"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False, unique=True)

    # Minutes metadata
    recorded_by = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    recording_date = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Meeting summary
    meeting_summary = db.Column(db.Text, nullable=True)
    key_decisions = db.Column(db.Text, nullable=True)  # JSON array of key decisions
    action_items = db.Column(db.Text, nullable=True)  # JSON array of action items with assignees

    # Detailed workflow notes
    opening_remarks = db.Column(db.Text, nullable=True)
    previous_minutes_discussion = db.Column(db.Text, nullable=True)

    # Savings collection notes
    savings_collection_notes = db.Column(db.Text, nullable=True)
    members_with_savings_issues = db.Column(db.Text, nullable=True)  # JSON array

    # Loan management notes
    loan_applications_discussion = db.Column(db.Text, nullable=True)
    loan_disbursement_notes = db.Column(db.Text, nullable=True)
    loan_repayment_issues = db.Column(db.Text, nullable=True)
    defaulter_discussion = db.Column(db.Text, nullable=True)

    # Discipline and fines notes
    fines_discussion = db.Column(db.Text, nullable=True)
    rule_violations_notes = db.Column(db.Text, nullable=True)

    # AOB and closing
    aob_discussion = db.Column(db.Text, nullable=True)
    closing_remarks = db.Column(db.Text, nullable=True)

    # Approval tracking
    is_approved = db.Column(db.Boolean, default=False, nullable=False)
    approved_by_count = db.Column(db.Integer, default=0, nullable=False)
    approval_date = db.Column(db.DateTime, nullable=True)

    # Document management
    document_url = db.Column(db.String(500), nullable=True)

    # Relationships
    meeting = db.relationship('Meeting', backref=db.backref('minutes', uselist=False))
    recorder = db.relationship('GroupMember', backref='recorded_minutes')

    def __init__(self, meeting_id, recorded_by):
        self.meeting_id = meeting_id
        self.recorded_by = recorded_by

    def to_json(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "recorded_by": self.recorder.name if self.recorder else None,
            "recording_date": self.recording_date.isoformat() if self.recording_date else None,
            "meeting_summary": self.meeting_summary,
            "key_decisions": self.key_decisions,
            "action_items": self.action_items,
            "workflow_notes": {
                "opening_remarks": self.opening_remarks,
                "previous_minutes_discussion": self.previous_minutes_discussion,
                "savings_collection_notes": self.savings_collection_notes,
                "loan_applications_discussion": self.loan_applications_discussion,
                "loan_disbursement_notes": self.loan_disbursement_notes,
                "loan_repayment_issues": self.loan_repayment_issues,
                "fines_discussion": self.fines_discussion,
                "aob_discussion": self.aob_discussion,
                "closing_remarks": self.closing_remarks
            },
            "approval_status": {
                "is_approved": self.is_approved,
                "approved_by_count": self.approved_by_count,
                "approval_date": self.approval_date.isoformat() if self.approval_date else None
            },
            "document_url": self.document_url
        }


class MeetingWorkflowStep(db.Model):
    """Individual workflow steps within a meeting with detailed tracking"""

    __tablename__ = "meeting_workflow_steps"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False)

    # Step identification
    step_order = db.Column(db.Integer, nullable=False)
    step_name = db.Column(db.String(100), nullable=False)
    step_type = db.Column(db.String(50), nullable=False)  # OPENING, MINUTES, SAVINGS, LOANS, FINES, AOB, CLOSING

    # Step execution
    status = db.Column(db.String(20), nullable=False, default='PENDING')  # PENDING, IN_PROGRESS, COMPLETED, SKIPPED
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)

    # Step details
    description = db.Column(db.Text, nullable=True)
    responsible_member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=True)

    # Step outcomes
    outcome_notes = db.Column(db.Text, nullable=True)
    financial_impact = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    members_affected = db.Column(db.Text, nullable=True)  # JSON array of member IDs

    # Related records
    related_transactions = db.Column(db.Text, nullable=True)  # JSON array of transaction IDs
    related_loans = db.Column(db.Text, nullable=True)  # JSON array of loan IDs
    related_fines = db.Column(db.Text, nullable=True)  # JSON array of fine IDs

    # Relationships
    meeting = db.relationship('Meeting', backref='workflow_steps')
    responsible_member = db.relationship('GroupMember', backref='responsible_workflow_steps')

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('meeting_id', 'step_order', name='unique_meeting_step_order'),
        db.CheckConstraint("status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')", name='check_valid_step_status'),
        db.CheckConstraint("step_type IN ('OPENING', 'MINUTES', 'SAVINGS', 'LOANS', 'FINES', 'AOB', 'CLOSING')", name='check_valid_step_type'),
    )

    def __init__(self, meeting_id, step_order, step_name, step_type, responsible_member_id=None):
        self.meeting_id = meeting_id
        self.step_order = step_order
        self.step_name = step_name
        self.step_type = step_type
        self.responsible_member_id = responsible_member_id

    def start_step(self):
        """Mark step as started"""
        self.status = 'IN_PROGRESS'
        self.started_at = datetime.now()

    def complete_step(self, outcome_notes=None, financial_impact=0.00):
        """Mark step as completed"""
        self.status = 'COMPLETED'
        self.completed_at = datetime.now()
        if self.started_at:
            duration = self.completed_at - self.started_at
            self.duration_minutes = int(duration.total_seconds() / 60)
        if outcome_notes:
            self.outcome_notes = outcome_notes
        self.financial_impact = financial_impact

    def to_json(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "step_order": self.step_order,
            "step_name": self.step_name,
            "step_type": self.step_type,
            "status": self.status,
            "timing": {
                "started_at": self.started_at.isoformat() if self.started_at else None,
                "completed_at": self.completed_at.isoformat() if self.completed_at else None,
                "duration_minutes": self.duration_minutes
            },
            "responsible_member": self.responsible_member.name if self.responsible_member else None,
            "outcome_notes": self.outcome_notes,
            "financial_impact": float(self.financial_impact),
            "members_affected": self.members_affected,
            "related_records": {
                "transactions": self.related_transactions,
                "loans": self.related_loans,
                "fines": self.related_fines
            }
        }
