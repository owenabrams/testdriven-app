"""
Governance and Decision Making Models
Enhanced models for group governance including:
- Loan Applications and Approvals
- Voting and Decision Making
- Leadership Elections
- Rule Violations and Disciplinary Actions
"""

from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import func
from project import db


class LoanApplication(db.Model):
    """Formal loan applications with approval workflow"""
    
    __tablename__ = "loan_applications"
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    applicant_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=False)
    
    # Application details
    application_date = db.Column(db.Date, default=func.current_date(), nullable=False)
    requested_amount = db.Column(db.Numeric(12, 2), nullable=False)
    requested_term_months = db.Column(db.Integer, nullable=False)
    purpose = db.Column(db.Text, nullable=False)
    business_plan = db.Column(db.Text, nullable=True)
    
    # Guarantors (required for loans)
    guarantor1_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=True)
    guarantor2_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=True)
    guarantor1_amount = db.Column(db.Numeric(12, 2), nullable=True)
    guarantor2_amount = db.Column(db.Numeric(12, 2), nullable=True)
    
    # Assessment and eligibility
    assessment_id = db.Column(db.Integer, db.ForeignKey('loan_assessments.id'), nullable=True)
    eligibility_score = db.Column(db.Numeric(5, 2), nullable=True)
    recommended_amount = db.Column(db.Numeric(12, 2), nullable=True)
    recommended_term = db.Column(db.Integer, nullable=True)
    
    # Application status
    status = db.Column(db.String(20), nullable=False, default='SUBMITTED')  # SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN
    review_date = db.Column(db.Date, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=True)
    
    # Approval workflow
    chairperson_approval = db.Column(db.Boolean, default=False, nullable=False)
    treasurer_approval = db.Column(db.Boolean, default=False, nullable=False)
    committee_approval = db.Column(db.Boolean, default=False, nullable=False)
    member_votes_for = db.Column(db.Integer, default=0, nullable=False)
    member_votes_against = db.Column(db.Integer, default=0, nullable=False)
    
    # Final decision
    approved_amount = db.Column(db.Numeric(12, 2), nullable=True)
    approved_term_months = db.Column(db.Integer, nullable=True)
    interest_rate = db.Column(db.Numeric(5, 2), nullable=True)
    approval_conditions = db.Column(db.Text, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    
    # Meeting tracking
    meeting_presented_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=True)
    meeting_decided_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=True)
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    updated_date = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    group = db.relationship('SavingsGroup', backref='loan_applications')
    applicant = db.relationship('GroupMember', foreign_keys=[applicant_id], backref='loan_applications')
    guarantor1 = db.relationship('GroupMember', foreign_keys=[guarantor1_id], backref='guaranteed_loans_1')
    guarantor2 = db.relationship('GroupMember', foreign_keys=[guarantor2_id], backref='guaranteed_loans_2')
    reviewer = db.relationship('GroupMember', foreign_keys=[reviewed_by], backref='reviewed_loan_applications')
    assessment = db.relationship('LoanAssessment', backref='loan_applications')
    meeting_presented = db.relationship('Meeting', foreign_keys=[meeting_presented_id], backref='loan_applications_presented')
    meeting_decided = db.relationship('Meeting', foreign_keys=[meeting_decided_id], backref='loan_applications_decided')
    creator = db.relationship('User', backref='created_loan_applications')
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint("status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN')", name='check_valid_application_status'),
        db.CheckConstraint('requested_amount > 0', name='check_positive_requested_amount'),
        db.CheckConstraint('requested_term_months > 0', name='check_positive_term'),
    )
    
    def __init__(self, group_id, applicant_id, requested_amount, requested_term_months, purpose, created_by):
        self.group_id = group_id
        self.applicant_id = applicant_id
        self.requested_amount = requested_amount
        self.requested_term_months = requested_term_months
        self.purpose = purpose
        self.created_by = created_by
    
    def calculate_approval_percentage(self):
        """Calculate percentage of members who voted for approval"""
        total_votes = self.member_votes_for + self.member_votes_against
        if total_votes == 0:
            return 0.0
        return round((self.member_votes_for / total_votes) * 100, 2)
    
    def is_fully_approved(self):
        """Check if application has all required approvals"""
        return (self.chairperson_approval and 
                self.treasurer_approval and 
                self.committee_approval and 
                self.calculate_approval_percentage() >= 50.0)
    
    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "applicant": self.applicant.name if self.applicant else None,
            "application_date": self.application_date.isoformat() if self.application_date else None,
            "requested_amount": float(self.requested_amount),
            "requested_term_months": self.requested_term_months,
            "purpose": self.purpose,
            "guarantors": {
                "guarantor1": self.guarantor1.name if self.guarantor1 else None,
                "guarantor2": self.guarantor2.name if self.guarantor2 else None,
                "guarantor1_amount": float(self.guarantor1_amount) if self.guarantor1_amount else None,
                "guarantor2_amount": float(self.guarantor2_amount) if self.guarantor2_amount else None
            },
            "assessment": {
                "eligibility_score": float(self.eligibility_score) if self.eligibility_score else None,
                "recommended_amount": float(self.recommended_amount) if self.recommended_amount else None,
                "recommended_term": self.recommended_term
            },
            "status": self.status,
            "approval_workflow": {
                "chairperson_approval": self.chairperson_approval,
                "treasurer_approval": self.treasurer_approval,
                "committee_approval": self.committee_approval,
                "member_votes_for": self.member_votes_for,
                "member_votes_against": self.member_votes_against,
                "approval_percentage": self.calculate_approval_percentage(),
                "is_fully_approved": self.is_fully_approved()
            },
            "final_decision": {
                "approved_amount": float(self.approved_amount) if self.approved_amount else None,
                "approved_term_months": self.approved_term_months,
                "interest_rate": float(self.interest_rate) if self.interest_rate else None,
                "approval_conditions": self.approval_conditions,
                "rejection_reason": self.rejection_reason
            },
            "created_date": self.created_date.isoformat() if self.created_date else None
        }


class GroupVote(db.Model):
    """Voting system for group decisions"""
    
    __tablename__ = "group_votes"
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id = db.Column(db.Integer, db.ForeignKey('savings_groups.id'), nullable=False)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=True)
    
    # Vote details
    vote_title = db.Column(db.String(200), nullable=False)
    vote_description = db.Column(db.Text, nullable=False)
    vote_type = db.Column(db.String(50), nullable=False)  # LOAN_APPROVAL, CONSTITUTION_CHANGE, LEADERSHIP_ELECTION, MEMBER_DISCIPLINE, GENERAL
    
    # Vote options
    vote_options = db.Column(db.Text, nullable=False)  # JSON array of options
    allows_multiple_choice = db.Column(db.Boolean, default=False, nullable=False)
    
    # Vote timing
    created_date = db.Column(db.DateTime, default=func.now(), nullable=False)
    voting_start_date = db.Column(db.DateTime, nullable=False)
    voting_end_date = db.Column(db.DateTime, nullable=False)
    
    # Vote status
    status = db.Column(db.String(20), nullable=False, default='ACTIVE')  # ACTIVE, CLOSED, CANCELLED
    total_eligible_voters = db.Column(db.Integer, nullable=False, default=0)
    total_votes_cast = db.Column(db.Integer, nullable=False, default=0)
    
    # Results
    results = db.Column(db.Text, nullable=True)  # JSON object with vote counts per option
    winning_option = db.Column(db.String(200), nullable=True)
    is_passed = db.Column(db.Boolean, default=False, nullable=False)
    
    # Related records
    related_loan_application_id = db.Column(db.Integer, db.ForeignKey('loan_applications.id'), nullable=True)
    related_member_id = db.Column(db.Integer, db.ForeignKey('group_members.id'), nullable=True)
    
    # Audit fields
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Relationships
    group = db.relationship('SavingsGroup', backref='votes')
    meeting = db.relationship('Meeting', backref='votes')
    related_loan_application = db.relationship('LoanApplication', backref='votes')
    related_member = db.relationship('GroupMember', backref='votes_about_member')
    creator = db.relationship('User', backref='created_votes')
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint("status IN ('ACTIVE', 'CLOSED', 'CANCELLED')", name='check_valid_vote_status'),
        db.CheckConstraint("vote_type IN ('LOAN_APPROVAL', 'CONSTITUTION_CHANGE', 'LEADERSHIP_ELECTION', 'MEMBER_DISCIPLINE', 'GENERAL')", name='check_valid_vote_type'),
        db.CheckConstraint('voting_end_date > voting_start_date', name='check_valid_voting_period'),
    )
    
    def __init__(self, group_id, vote_title, vote_description, vote_type, vote_options, voting_start_date, voting_end_date, created_by):
        self.group_id = group_id
        self.vote_title = vote_title
        self.vote_description = vote_description
        self.vote_type = vote_type
        self.vote_options = vote_options
        self.voting_start_date = voting_start_date
        self.voting_end_date = voting_end_date
        self.created_by = created_by
    
    def calculate_turnout_percentage(self):
        """Calculate voter turnout percentage"""
        if self.total_eligible_voters == 0:
            return 0.0
        return round((self.total_votes_cast / self.total_eligible_voters) * 100, 2)
    
    def is_quorum_met(self):
        """Check if voting quorum is met (60% turnout)"""
        return self.calculate_turnout_percentage() >= 60.0
    
    def to_json(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "meeting_id": self.meeting_id,
            "vote_title": self.vote_title,
            "vote_description": self.vote_description,
            "vote_type": self.vote_type,
            "vote_options": self.vote_options,
            "allows_multiple_choice": self.allows_multiple_choice,
            "timing": {
                "created_date": self.created_date.isoformat() if self.created_date else None,
                "voting_start_date": self.voting_start_date.isoformat() if self.voting_start_date else None,
                "voting_end_date": self.voting_end_date.isoformat() if self.voting_end_date else None
            },
            "status": self.status,
            "participation": {
                "total_eligible_voters": self.total_eligible_voters,
                "total_votes_cast": self.total_votes_cast,
                "turnout_percentage": self.calculate_turnout_percentage(),
                "quorum_met": self.is_quorum_met()
            },
            "results": {
                "results": self.results,
                "winning_option": self.winning_option,
                "is_passed": self.is_passed
            },
            "related_records": {
                "loan_application_id": self.related_loan_application_id,
                "member_id": self.related_member_id
            }
        }
