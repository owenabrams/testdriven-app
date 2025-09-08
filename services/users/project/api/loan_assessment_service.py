"""
Loan assessment service for evaluating member loan eligibility
"""

from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy import func, and_, or_
from project import db
from project.api.models import (
    LoanAssessment, GroupMember, MemberSaving, SavingTransaction,
    MeetingAttendance, MemberFine, GroupLoan, LoanRepaymentSchedule
)


class LoanAssessmentService:
    """Service for assessing member loan eligibility"""

    @staticmethod
    def calculate_member_metrics(member_id, assessment_date=None):
        """
        Calculate key metrics for loan assessment
        
        Returns:
            dict: Dictionary containing assessment metrics
        """
        if not assessment_date:
            assessment_date = date.today()
        
        member = GroupMember.query.get(member_id)
        if not member:
            raise ValueError("Member not found")
        
        # Calculate months active
        months_active = (assessment_date - member.joined_date).days / 30.44
        
        # Calculate total savings across all saving types
        total_savings = db.session.query(func.sum(MemberSaving.current_balance)).filter(
            MemberSaving.member_id == member_id,
            MemberSaving.is_active == True
        ).scalar() or Decimal('0.00')
        
        # Calculate attendance rate (last 6 months)
        six_months_ago = assessment_date - timedelta(days=180)
        total_meetings = MeetingAttendance.query.filter(
            MeetingAttendance.member_id == member_id,
            MeetingAttendance.meeting_date >= six_months_ago,
            MeetingAttendance.meeting_date <= assessment_date
        ).count()
        
        attended_meetings = MeetingAttendance.query.filter(
            MeetingAttendance.member_id == member_id,
            MeetingAttendance.meeting_date >= six_months_ago,
            MeetingAttendance.meeting_date <= assessment_date,
            MeetingAttendance.attended == True
        ).count()
        
        attendance_rate = (attended_meetings / total_meetings * 100) if total_meetings > 0 else 0
        
        # Calculate payment consistency (regular savings deposits)
        expected_payments = max(1, int(months_active))  # At least 1 expected payment
        actual_payments = SavingTransaction.query.join(MemberSaving).filter(
            MemberSaving.member_id == member_id,
            SavingTransaction.transaction_type == 'DEPOSIT',
            SavingTransaction.status == 'VERIFIED'
        ).count()
        
        payment_consistency = min(100, (actual_payments / expected_payments * 100))
        
        # Calculate outstanding fines
        outstanding_fines = db.session.query(func.sum(MemberFine.amount)).filter(
            MemberFine.member_id == member_id,
            MemberFine.status == 'PENDING'
        ).scalar() or Decimal('0.00')
        
        return {
            'member_id': member_id,
            'months_active': int(months_active),
            'total_savings': total_savings,
            'attendance_rate': Decimal(str(attendance_rate)),
            'payment_consistency': Decimal(str(payment_consistency)),
            'outstanding_fines': outstanding_fines,
            'assessment_date': assessment_date
        }

    @staticmethod
    def create_assessment(member_id, assessed_by, assessment_date=None):
        """
        Create a new loan assessment for a member
        """
        if not assessment_date:
            assessment_date = date.today()
        
        # Get member metrics
        metrics = LoanAssessmentService.calculate_member_metrics(member_id, assessment_date)
        
        # Create assessment
        assessment = LoanAssessment(
            member_id=member_id,
            total_savings=metrics['total_savings'],
            months_active=metrics['months_active'],
            attendance_rate=metrics['attendance_rate'],
            payment_consistency=metrics['payment_consistency'],
            outstanding_fines=metrics['outstanding_fines'],
            assessed_by=assessed_by
        )
        
        # Mark previous assessments as not current
        LoanAssessment.query.filter_by(
            member_id=member_id,
            is_current=True
        ).update({'is_current': False})
        
        db.session.add(assessment)
        db.session.commit()
        
        return assessment

    @staticmethod
    def get_current_assessment(member_id):
        """
        Get the current valid assessment for a member
        """
        return LoanAssessment.query.filter_by(
            member_id=member_id,
            is_current=True
        ).filter(
            LoanAssessment.valid_until >= date.today()
        ).first()

    @staticmethod
    def assess_loan_eligibility(member_id, loan_amount, assessed_by):
        """
        Assess if a member is eligible for a specific loan amount
        
        Returns:
            dict: Assessment result with eligibility and recommendations
        """
        # Get or create current assessment
        assessment = LoanAssessmentService.get_current_assessment(member_id)
        
        if not assessment:
            assessment = LoanAssessmentService.create_assessment(member_id, assessed_by)
        
        loan_amount = Decimal(str(loan_amount))
        
        # Check basic eligibility
        if not assessment.is_eligible:
            return {
                'eligible': False,
                'assessment': assessment.to_json(),
                'reasons': ['Member does not meet minimum eligibility criteria'],
                'recommendations': ['Improve savings consistency', 'Increase meeting attendance', 'Pay outstanding fines']
            }
        
        # Check if requested amount is within limit
        if loan_amount > assessment.max_loan_amount:
            return {
                'eligible': False,
                'assessment': assessment.to_json(),
                'reasons': [f'Requested amount ({loan_amount}) exceeds maximum eligible amount ({assessment.max_loan_amount})'],
                'recommendations': [f'Consider requesting up to {assessment.max_loan_amount}', 'Increase savings to qualify for larger loans']
            }
        
        # Check for existing active loans
        member = GroupMember.query.get(member_id)
        active_loan = GroupLoan.query.filter(
            GroupLoan.group_id == member.group_id,
            GroupLoan.requested_by == member_id,
            GroupLoan.status.in_(['APPROVED', 'DISBURSED', 'PARTIALLY_REPAID'])
        ).first()
        
        if active_loan:
            return {
                'eligible': False,
                'assessment': assessment.to_json(),
                'reasons': ['Member has an active loan'],
                'recommendations': ['Complete repayment of existing loan before applying for new loan']
            }
        
        # Calculate recommended terms based on risk level
        if assessment.risk_level == 'LOW':
            max_term = 12
            interest_rate = 15.0  # Annual percentage
        elif assessment.risk_level == 'MEDIUM':
            max_term = 8
            interest_rate = 18.0
        else:  # HIGH
            max_term = 6
            interest_rate = 22.0
        
        recommended_term = min(max_term, assessment.recommended_term_months or max_term)
        
        return {
            'eligible': True,
            'assessment': assessment.to_json(),
            'loan_terms': {
                'max_amount': float(assessment.max_loan_amount),
                'recommended_amount': float(min(loan_amount, assessment.max_loan_amount)),
                'max_term_months': max_term,
                'recommended_term_months': recommended_term,
                'interest_rate_annual': interest_rate,
                'risk_level': assessment.risk_level
            },
            'reasons': ['Member meets all eligibility criteria'],
            'recommendations': []
        }

    @staticmethod
    def generate_repayment_schedule(loan_amount, term_months, interest_rate_annual, start_date=None):
        """
        Generate a repayment schedule for a loan
        
        Returns:
            list: List of repayment schedule items
        """
        if not start_date:
            start_date = date.today()
        
        loan_amount = Decimal(str(loan_amount))
        interest_rate = Decimal(str(interest_rate_annual)) / 100
        
        # Calculate total interest (simple interest)
        total_interest = loan_amount * interest_rate * (Decimal(str(term_months)) / 12)
        total_amount = loan_amount + total_interest
        
        # Calculate monthly payment
        monthly_payment = total_amount / term_months
        
        # Generate schedule
        schedule = []
        remaining_principal = loan_amount
        remaining_interest = total_interest
        
        for i in range(1, term_months + 1):
            # Calculate due date (monthly intervals)
            due_date = start_date + timedelta(days=30 * i)
            
            # Calculate principal and interest for this installment
            if i == term_months:  # Last installment gets any remaining amounts
                principal_amount = remaining_principal
                interest_amount = remaining_interest
            else:
                principal_amount = loan_amount / term_months
                interest_amount = total_interest / term_months
            
            remaining_principal -= principal_amount
            remaining_interest -= interest_amount
            
            schedule.append({
                'installment_number': i,
                'due_date': due_date,
                'principal_amount': float(principal_amount),
                'interest_amount': float(interest_amount),
                'total_amount': float(principal_amount + interest_amount)
            })
        
        return schedule

    @staticmethod
    def create_loan_repayment_schedule(loan_id):
        """
        Create repayment schedule records for a loan
        """
        loan = GroupLoan.query.get(loan_id)
        if not loan:
            raise ValueError("Loan not found")
        
        if loan.status != 'APPROVED':
            raise ValueError("Can only create schedule for approved loans")
        
        # Generate schedule
        schedule_items = LoanAssessmentService.generate_repayment_schedule(
            loan.principal,
            loan.term_months,
            loan.interest_rate_annual,
            loan.disbursal_date.date() if loan.disbursal_date else date.today()
        )
        
        # Create schedule records
        for item in schedule_items:
            schedule_record = LoanRepaymentSchedule(
                loan_id=loan_id,
                installment_number=item['installment_number'],
                due_date=item['due_date'],
                principal_amount=Decimal(str(item['principal_amount'])),
                interest_amount=Decimal(str(item['interest_amount']))
            )
            db.session.add(schedule_record)
        
        db.session.commit()
        
        return schedule_items

    @staticmethod
    def get_member_loan_history(member_id):
        """
        Get comprehensive loan history for a member
        """
        loans = GroupLoan.query.filter_by(requested_by=member_id).order_by(
            GroupLoan.request_date.desc()
        ).all()
        
        history = []
        for loan in loans:
            loan_data = loan.to_json()
            
            # Add repayment schedule
            schedule = LoanRepaymentSchedule.query.filter_by(loan_id=loan.id).order_by(
                LoanRepaymentSchedule.installment_number
            ).all()
            loan_data['repayment_schedule'] = [item.to_json() for item in schedule]
            
            # Calculate repayment statistics
            total_scheduled = sum(item.total_amount for item in schedule)
            total_paid = sum(item.amount_paid for item in schedule)
            overdue_items = [item for item in schedule if item.status == 'OVERDUE']
            
            loan_data['repayment_stats'] = {
                'total_scheduled': float(total_scheduled),
                'total_paid': float(total_paid),
                'balance_remaining': float(total_scheduled - total_paid),
                'overdue_installments': len(overdue_items),
                'total_overdue_amount': float(sum(item.total_amount - item.amount_paid for item in overdue_items))
            }
            
            history.append(loan_data)
        
        return history

    @staticmethod
    def get_group_loan_analytics(group_id):
        """
        Get loan analytics for a group
        """
        # Basic loan statistics
        total_loans = GroupLoan.query.filter_by(group_id=group_id).count()
        active_loans = GroupLoan.query.filter(
            GroupLoan.group_id == group_id,
            GroupLoan.status.in_(['DISBURSED', 'PARTIALLY_REPAID'])
        ).count()
        
        # Financial statistics
        total_disbursed = db.session.query(func.sum(GroupLoan.principal)).filter(
            GroupLoan.group_id == group_id,
            GroupLoan.status.in_(['DISBURSED', 'PARTIALLY_REPAID', 'CLOSED'])
        ).scalar() or Decimal('0.00')
        
        total_repaid = db.session.query(func.sum(GroupLoan.total_repaid)).filter(
            GroupLoan.group_id == group_id
        ).scalar() or Decimal('0.00')
        
        outstanding_balance = db.session.query(func.sum(GroupLoan.outstanding_balance)).filter(
            GroupLoan.group_id == group_id,
            GroupLoan.status.in_(['DISBURSED', 'PARTIALLY_REPAID'])
        ).scalar() or Decimal('0.00')
        
        # Overdue analysis
        overdue_schedule_items = db.session.query(LoanRepaymentSchedule).join(GroupLoan).filter(
            GroupLoan.group_id == group_id,
            LoanRepaymentSchedule.status == 'OVERDUE'
        ).all()
        
        total_overdue = sum(float(item.total_amount - item.amount_paid) for item in overdue_schedule_items)
        
        return {
            'total_loans': total_loans,
            'active_loans': active_loans,
            'total_disbursed': float(total_disbursed),
            'total_repaid': float(total_repaid),
            'outstanding_balance': float(outstanding_balance),
            'overdue_amount': total_overdue,
            'overdue_installments': len(overdue_schedule_items),
            'repayment_rate': float(total_repaid / total_disbursed * 100) if total_disbursed > 0 else 0
        }