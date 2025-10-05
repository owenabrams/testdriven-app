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

# Import existing models to avoid duplication
# GroupConstitution is already defined in models.py


# Meeting model is already defined in models.py

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


class MeetingActivity(db.Model):
    """Enhanced individual activities within meetings with detailed member participation tracking"""

    __tablename__ = "meeting_activities"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False)

    # Activity identification
    activity_type = db.Column(db.String(50), nullable=False)  # PERSONAL_SAVINGS, ECD_FUND, SOCIAL_FUND, TARGET_SAVINGS, LOAN_APPLICATION, LOAN_DISBURSEMENT, LOAN_REPAYMENT, FINES, AOB
    activity_name = db.Column(db.String(200), nullable=False)
    activity_order = db.Column(db.Integer, nullable=False)

    # Activity execution
    status = db.Column(db.String(20), nullable=False, default='PENDING')  # PENDING, IN_PROGRESS, COMPLETED, SKIPPED
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)

    # Activity details
    description = db.Column(db.Text, nullable=True)
    responsible_member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=True)

    # Activity outcomes
    total_amount = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    members_participated = db.Column(db.Integer, default=0, nullable=False)
    members_expected = db.Column(db.Integer, default=0, nullable=False)
    participation_rate = db.Column(db.Numeric(5, 2), default=0.00, nullable=False)  # Percentage

    # Activity notes and outcomes
    outcome_notes = db.Column(db.Text, nullable=True)
    challenges_faced = db.Column(db.Text, nullable=True)
    success_factors = db.Column(db.Text, nullable=True)

    # Document attachments for proof of activity
    has_attachments = db.Column(db.Boolean, default=False, nullable=False)
    attachment_count = db.Column(db.Integer, default=0, nullable=False)

    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    meeting = db.relationship('Meeting', backref='activities')
    responsible_member = db.relationship('GroupMember', backref='responsible_activities')
    creator = db.relationship('User', backref='created_activities')

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('meeting_id', 'activity_order', name='unique_meeting_activity_order'),
        db.CheckConstraint("status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')", name='check_valid_activity_status'),
        db.CheckConstraint("activity_type IN ('PERSONAL_SAVINGS', 'ECD_FUND', 'SOCIAL_FUND', 'TARGET_SAVINGS', 'LOAN_APPLICATION', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FINES', 'AOB', 'ATTENDANCE', 'MINUTES_REVIEW')", name='check_valid_activity_type'),
        db.CheckConstraint('members_participated <= members_expected', name='check_participation_logic'),
    )

    def __init__(self, meeting_id, activity_type, activity_name, activity_order, responsible_member_id, created_by):
        self.meeting_id = meeting_id
        self.activity_type = activity_type
        self.activity_name = activity_name
        self.activity_order = activity_order
        self.responsible_member_id = responsible_member_id
        self.created_by = created_by

    def start_activity(self):
        """Mark activity as started"""
        self.status = 'IN_PROGRESS'
        self.started_at = datetime.now()

    def complete_activity(self, outcome_notes=None, total_amount=0.00):
        """Mark activity as completed"""
        self.status = 'COMPLETED'
        self.completed_at = datetime.now()
        if self.started_at:
            duration = self.completed_at - self.started_at
            self.duration_minutes = int(duration.total_seconds() / 60)
        if outcome_notes:
            self.outcome_notes = outcome_notes
        self.total_amount = total_amount

        # Calculate participation rate
        if self.members_expected > 0:
            self.participation_rate = (self.members_participated / self.members_expected) * 100

    def to_json(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "activity_type": self.activity_type,
            "activity_name": self.activity_name,
            "activity_order": self.activity_order,
            "status": self.status,
            "timing": {
                "started_at": self.started_at.isoformat() if self.started_at else None,
                "completed_at": self.completed_at.isoformat() if self.completed_at else None,
                "duration_minutes": self.duration_minutes
            },
            "responsible_member": self.responsible_member.name if self.responsible_member else None,
            "outcomes": {
                "total_amount": float(self.total_amount),
                "members_participated": self.members_participated,
                "members_expected": self.members_expected,
                "participation_rate": float(self.participation_rate)
            },
            "notes": {
                "description": self.description,
                "outcome_notes": self.outcome_notes,
                "challenges_faced": self.challenges_faced,
                "success_factors": self.success_factors
            },
            "attachments": {
                "has_attachments": self.has_attachments,
                "attachment_count": self.attachment_count
            },
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "updated_date": self.updated_date.isoformat() if self.updated_date else None
        }


class MemberActivityParticipation(db.Model):
    """Track individual member participation in each meeting activity"""

    __tablename__ = "member_activity_participation"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    meeting_activity_id = db.Column(db.Integer, db.ForeignKey('meeting_activities.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)

    # Participation details
    participation_type = db.Column(db.String(50), nullable=False)  # CONTRIBUTED, RECEIVED, VOTED, DISCUSSED, ATTENDED, ABSENT
    amount = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='PENDING')  # PENDING, COMPLETED, PARTIAL, SKIPPED

    # Participation notes
    notes = db.Column(db.Text, nullable=True)
    challenges = db.Column(db.Text, nullable=True)

    # Timing
    participation_time = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Quality metrics
    participation_score = db.Column(db.Numeric(3, 1), default=0.0, nullable=False)  # 0.0 to 10.0
    engagement_level = db.Column(db.String(20), default='MODERATE', nullable=False)  # LOW, MODERATE, HIGH, EXCELLENT

    # Document proof for this member's participation
    has_proof_document = db.Column(db.Boolean, default=False, nullable=False)

    # Audit fields
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recorded_date = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Relationships
    activity = db.relationship('MeetingActivity', backref='member_participations')
    member = db.relationship('GroupMember', backref='activity_participations')
    recorder = db.relationship('User', backref='recorded_participations')

    # Constraints
    __table_args__ = (
        db.UniqueConstraint('meeting_activity_id', 'member_id', name='unique_member_activity_participation'),
        db.CheckConstraint("status IN ('PENDING', 'COMPLETED', 'PARTIAL', 'SKIPPED')", name='check_valid_participation_status'),
        db.CheckConstraint("participation_type IN ('CONTRIBUTED', 'RECEIVED', 'VOTED', 'DISCUSSED', 'ATTENDED', 'ABSENT', 'LATE')", name='check_valid_participation_type'),
        db.CheckConstraint("engagement_level IN ('LOW', 'MODERATE', 'HIGH', 'EXCELLENT')", name='check_valid_engagement_level'),
        db.CheckConstraint('participation_score >= 0.0 AND participation_score <= 10.0', name='check_participation_score_range'),
    )

    def __init__(self, meeting_activity_id, member_id, participation_type, recorded_by, amount=0.00):
        self.meeting_activity_id = meeting_activity_id
        self.member_id = member_id
        self.participation_type = participation_type
        self.recorded_by = recorded_by
        self.amount = amount

    def calculate_participation_score(self):
        """Calculate participation score based on various factors"""
        base_score = 5.0  # Base score for participation

        # Adjust based on participation type
        type_scores = {
            'CONTRIBUTED': 2.0,
            'RECEIVED': 1.0,
            'VOTED': 1.5,
            'DISCUSSED': 1.0,
            'ATTENDED': 1.0,
            'LATE': -0.5,
            'ABSENT': -2.0
        }

        base_score += type_scores.get(self.participation_type, 0)

        # Adjust based on amount (for financial activities)
        if self.amount > 0:
            base_score += min(2.0, self.amount / 10000)  # Up to 2 points for amount

        # Ensure score is within bounds
        self.participation_score = max(0.0, min(10.0, base_score))

        # Set engagement level based on score
        if self.participation_score >= 8.0:
            self.engagement_level = 'EXCELLENT'
        elif self.participation_score >= 6.0:
            self.engagement_level = 'HIGH'
        elif self.participation_score >= 4.0:
            self.engagement_level = 'MODERATE'
        else:
            self.engagement_level = 'LOW'

    def to_json(self):
        return {
            "id": self.id,
            "meeting_activity_id": self.meeting_activity_id,
            "member": {
                "id": self.member.id if self.member else None,
                "name": self.member.name if self.member else None
            },
            "participation_type": self.participation_type,
            "amount": float(self.amount),
            "status": self.status,
            "notes": self.notes,
            "challenges": self.challenges,
            "participation_time": self.participation_time.isoformat() if self.participation_time else None,
            "quality_metrics": {
                "participation_score": float(self.participation_score),
                "engagement_level": self.engagement_level
            },
            "has_proof_document": self.has_proof_document,
            "recorded_by": self.recorder.username if self.recorder else None,
            "recorded_date": self.recorded_date.isoformat() if self.recorded_date else None
        }


class ActivityDocument(db.Model):
    """Document attachments for meeting activities and member participation proof"""

    __tablename__ = "activity_documents"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    # Document can be attached to either an activity or member participation
    meeting_activity_id = db.Column(db.Integer, db.ForeignKey('meeting_activities.id'), nullable=True)
    member_participation_id = db.Column(db.Integer, db.ForeignKey('member_activity_participation.id'), nullable=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False)  # Always link to meeting for organization

    # Document details
    document_type = db.Column(db.String(50), nullable=False)  # HANDWRITTEN_RECORD, ATTENDANCE_SHEET, SAVINGS_RECEIPT, LOAN_DOCUMENT, PHOTO_PROOF, SIGNATURE_SHEET
    file_name = db.Column(db.String(255), nullable=False)
    original_file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # Size in bytes
    file_type = db.Column(db.String(50), nullable=False)  # pdf, docx, pptx, jpg, png, etc.
    mime_type = db.Column(db.String(100), nullable=False)

    # Document metadata
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)

    # Document verification
    is_verified = db.Column(db.Boolean, default=False, nullable=False)
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    verified_date = db.Column(db.DateTime, nullable=True)
    verification_notes = db.Column(db.Text, nullable=True)

    # Access control
    is_public = db.Column(db.Boolean, default=False, nullable=False)  # Can all group members see this?
    access_level = db.Column(db.String(20), default='GROUP', nullable=False)  # GROUP, LEADERSHIP, ADMIN

    # Audit fields
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    upload_date = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Relationships
    activity = db.relationship('MeetingActivity', backref='documents')
    member_participation = db.relationship('MemberActivityParticipation', backref='documents')
    meeting = db.relationship('Meeting', backref='activity_documents')
    uploader = db.relationship('User', foreign_keys=[uploaded_by], backref='uploaded_activity_documents')
    verifier = db.relationship('User', foreign_keys=[verified_by], backref='verified_activity_documents')

    # Constraints
    __table_args__ = (
        db.CheckConstraint("document_type IN ('HANDWRITTEN_RECORD', 'ATTENDANCE_SHEET', 'SAVINGS_RECEIPT', 'LOAN_DOCUMENT', 'PHOTO_PROOF', 'SIGNATURE_SHEET', 'MEETING_MINUTES', 'CONSTITUTION', 'OTHER')", name='check_valid_document_type'),
        db.CheckConstraint("access_level IN ('GROUP', 'LEADERSHIP', 'ADMIN')", name='check_valid_access_level'),
        db.CheckConstraint("file_type IN ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'bmp')", name='check_valid_file_type'),
        db.CheckConstraint('file_size > 0', name='check_positive_file_size'),
        # At least one of activity or member participation must be specified
        db.CheckConstraint('meeting_activity_id IS NOT NULL OR member_participation_id IS NOT NULL', name='check_document_attachment'),
    )

    def __init__(self, meeting_id, document_type, file_name, original_file_name, file_path, file_size, file_type, mime_type, title, uploaded_by):
        self.meeting_id = meeting_id
        self.document_type = document_type
        self.file_name = file_name
        self.original_file_name = original_file_name
        self.file_path = file_path
        self.file_size = file_size
        self.file_type = file_type
        self.mime_type = mime_type
        self.title = title
        self.uploaded_by = uploaded_by

    def get_file_size_formatted(self):
        """Return human-readable file size"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"

    def to_json(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "meeting_activity_id": self.meeting_activity_id,
            "member_participation_id": self.member_participation_id,
            "document_type": self.document_type,
            "file_info": {
                "file_name": self.file_name,
                "original_file_name": self.original_file_name,
                "file_path": self.file_path,
                "file_size": self.file_size,
                "file_size_formatted": self.get_file_size_formatted(),
                "file_type": self.file_type,
                "mime_type": self.mime_type
            },
            "metadata": {
                "title": self.title,
                "description": self.description
            },
            "verification": {
                "is_verified": self.is_verified,
                "verified_by": self.verifier.username if self.verifier else None,
                "verified_date": self.verified_date.isoformat() if self.verified_date else None,
                "verification_notes": self.verification_notes
            },
            "access": {
                "is_public": self.is_public,
                "access_level": self.access_level
            },
            "uploaded_by": self.uploader.username if self.uploader else None,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None
        }


class ActivityTransaction(db.Model):
    """Link meeting activities to actual financial transactions"""

    __tablename__ = "activity_transactions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    meeting_activity_id = db.Column(db.Integer, db.ForeignKey('meeting_activities.id'), nullable=False)

    # Transaction details - we'll link to existing transaction models
    transaction_type = db.Column(db.String(50), nullable=False)  # SAVINGS_CONTRIBUTION, LOAN_DISBURSEMENT, LOAN_REPAYMENT, FINE_PAYMENT
    amount = db.Column(db.Numeric(12, 2), nullable=False)

    # Links to existing transaction tables
    group_transaction_id = db.Column(db.Integer, nullable=True)  # Link to GroupTransaction if applicable
    member_saving_id = db.Column(db.Integer, nullable=True)     # Link to MemberSaving if applicable
    group_loan_id = db.Column(db.Integer, nullable=True)        # Link to GroupLoan if applicable
    member_fine_id = db.Column(db.Integer, nullable=True)       # Link to MemberFine if applicable

    # Transaction metadata
    description = db.Column(db.Text, nullable=True)
    reference_number = db.Column(db.String(100), nullable=True)

    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)

    # Relationships
    activity = db.relationship('MeetingActivity', backref='transactions')
    creator = db.relationship('User', backref='created_activity_transactions')

    # Constraints
    __table_args__ = (
        db.CheckConstraint("transaction_type IN ('SAVINGS_CONTRIBUTION', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FINE_PAYMENT', 'WITHDRAWAL', 'OTHER')", name='check_valid_transaction_type'),
        db.CheckConstraint('amount > 0', name='check_positive_amount'),
        # At least one transaction link must be specified
        db.CheckConstraint('group_transaction_id IS NOT NULL OR member_saving_id IS NOT NULL OR group_loan_id IS NOT NULL OR member_fine_id IS NOT NULL', name='check_transaction_link'),
    )

    def __init__(self, meeting_activity_id, transaction_type, amount, created_by):
        self.meeting_activity_id = meeting_activity_id
        self.transaction_type = transaction_type
        self.amount = amount
        self.created_by = created_by

    def to_json(self):
        return {
            "id": self.id,
            "meeting_activity_id": self.meeting_activity_id,
            "transaction_type": self.transaction_type,
            "amount": float(self.amount),
            "description": self.description,
            "reference_number": self.reference_number,
            "linked_records": {
                "group_transaction_id": self.group_transaction_id,
                "member_saving_id": self.member_saving_id,
                "group_loan_id": self.group_loan_id,
                "member_fine_id": self.member_fine_id
            },
            "created_by": self.creator.username if self.creator else None,
            "created_date": self.created_date.isoformat() if self.created_date else None
        }
