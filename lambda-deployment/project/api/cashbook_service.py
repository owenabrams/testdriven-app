"""
Cashbook service for managing group financial records
"""

from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import func, and_, or_
from project import db
from project.api.models import (
    GroupCashbook, SavingsGroup, GroupMember, 
    MemberSaving, SavingTransaction, MemberFine, 
    GroupLoan, LoanRepaymentSchedule
)


class CashbookService:
    """Service for managing group cashbook operations"""

    @staticmethod
    def create_cashbook_entry(group_id, transaction_date, description, entry_type, created_by, 
                            member_id=None, reference_number=None, **amounts):
        """
        Create a new cashbook entry with automatic balance calculation
        
        Args:
            group_id: ID of the savings group
            transaction_date: Date of the transaction
            description: Description of the transaction
            entry_type: Type of entry (DEPOSIT, WITHDRAWAL, etc.)
            created_by: User ID who created the entry
            member_id: Optional member ID for member-specific entries
            reference_number: Optional reference number
            **amounts: Dictionary of amount fields (individual_saving, ecd_fund, etc.)
        """
        
        # Get the last cashbook entry for balance calculation
        last_entry = db.session.query(GroupCashbook).filter(
            GroupCashbook.group_id == group_id,
            GroupCashbook.status == 'ACTIVE'
        ).order_by(GroupCashbook.transaction_date.desc(), GroupCashbook.id.desc()).first()
        
        # Initialize balances from last entry or zero
        if last_entry:
            individual_balance = last_entry.individual_balance
            ecd_balance = last_entry.ecd_balance
            social_balance = last_entry.social_balance
            target_balance = last_entry.target_balance
        else:
            individual_balance = ecd_balance = social_balance = target_balance = Decimal('0.00')
        
        # Create new entry
        entry = GroupCashbook(
            group_id=group_id,
            member_id=member_id,
            transaction_date=transaction_date,
            reference_number=reference_number,
            description=description,
            entry_type=entry_type,
            created_by=created_by
        )
        
        # Set transaction amounts
        entry.individual_saving = Decimal(str(amounts.get('individual_saving', 0)))
        entry.ecd_fund = Decimal(str(amounts.get('ecd_fund', 0)))
        entry.social_fund = Decimal(str(amounts.get('social_fund', 0)))
        entry.target_saving = Decimal(str(amounts.get('target_saving', 0)))
        entry.fines = Decimal(str(amounts.get('fines', 0)))
        entry.loan_taken = Decimal(str(amounts.get('loan_taken', 0)))
        entry.loan_repayment = Decimal(str(amounts.get('loan_repayment', 0)))
        entry.interest_earned = Decimal(str(amounts.get('interest_earned', 0)))
        
        # Calculate new balances
        entry.individual_balance = individual_balance + entry.individual_saving
        entry.ecd_balance = ecd_balance + entry.ecd_fund
        entry.social_balance = social_balance + entry.social_fund
        entry.target_balance = target_balance + entry.target_saving
        
        # Handle withdrawals (negative amounts)
        if entry_type == 'WITHDRAWAL':
            entry.individual_balance -= abs(entry.individual_saving)
            entry.ecd_balance -= abs(entry.ecd_fund)
            entry.social_balance -= abs(entry.social_fund)
            entry.target_balance -= abs(entry.target_saving)
        
        # Calculate total balance
        entry.calculate_total_balance()
        
        db.session.add(entry)
        db.session.commit()
        
        return entry

    @staticmethod
    def record_member_saving(member_id, saving_type_code, amount, transaction_type='DEPOSIT', 
                           mobile_money_transaction_id=None, mobile_money_provider=None, 
                           mobile_money_phone=None, processed_by=None):
        """
        Record a member saving transaction and update cashbook
        """
        from project.api.models import SavingType
        
        # Get member and saving type
        member = GroupMember.query.get(member_id)
        if not member:
            raise ValueError("Member not found")
        
        saving_type = SavingType.query.filter_by(code=saving_type_code).first()
        if not saving_type:
            raise ValueError(f"Saving type '{saving_type_code}' not found")
        
        # Get or create member saving record
        member_saving = MemberSaving.query.filter_by(
            member_id=member_id, 
            saving_type_id=saving_type.id
        ).first()
        
        if not member_saving:
            member_saving = MemberSaving(
                member_id=member_id,
                saving_type_id=saving_type.id
            )
            db.session.add(member_saving)
            db.session.flush()
        
        # Record the saving transaction
        balance_before = member_saving.current_balance
        
        if transaction_type == 'DEPOSIT':
            balance_after = balance_before + Decimal(str(amount))
        else:  # WITHDRAWAL
            if balance_before < Decimal(str(amount)):
                raise ValueError("Insufficient balance for withdrawal")
            balance_after = balance_before - Decimal(str(amount))
        
        saving_transaction = SavingTransaction(
            member_saving_id=member_saving.id,
            amount=Decimal(str(amount)),
            transaction_type=transaction_type,
            processed_by=processed_by or member.user_id,
            mobile_money_transaction_id=mobile_money_transaction_id,
            mobile_money_provider=mobile_money_provider,
            mobile_money_phone=mobile_money_phone,
            balance_before=balance_before,
            balance_after=balance_after
        )
        
        # Update member saving balance
        member_saving.current_balance = balance_after
        member_saving.check_target_achievement()
        
        db.session.add(saving_transaction)
        
        # Update cashbook
        cashbook_amounts = {}
        if saving_type_code == 'PERSONAL':
            cashbook_amounts['individual_saving'] = amount if transaction_type == 'DEPOSIT' else -amount
        elif saving_type_code == 'ECD':
            cashbook_amounts['ecd_fund'] = amount if transaction_type == 'DEPOSIT' else -amount
        elif saving_type_code == 'SOCIAL':
            cashbook_amounts['social_fund'] = amount if transaction_type == 'DEPOSIT' else -amount
        elif saving_type_code == 'TARGET':
            cashbook_amounts['target_saving'] = amount if transaction_type == 'DEPOSIT' else -amount
        
        cashbook_entry = CashbookService.create_cashbook_entry(
            group_id=member.group_id,
            transaction_date=date.today(),
            description=f"{transaction_type.title()} - {member.name} - {saving_type.name}",
            entry_type=transaction_type,
            created_by=processed_by or member.user_id,
            member_id=member_id,
            reference_number=mobile_money_transaction_id,
            **cashbook_amounts
        )
        
        db.session.commit()
        
        return saving_transaction, cashbook_entry

    @staticmethod
    def record_fine_payment(fine_id, amount_paid, processed_by):
        """
        Record a fine payment and update cashbook
        """
        fine = MemberFine.query.get(fine_id)
        if not fine:
            raise ValueError("Fine not found")
        
        if fine.status != 'PENDING':
            raise ValueError("Fine is not pending payment")
        
        if Decimal(str(amount_paid)) < fine.amount:
            raise ValueError("Payment amount is less than fine amount")
        
        # Update fine status
        fine.status = 'PAID'
        fine.paid_date = date.today()
        
        # Update cashbook
        cashbook_entry = CashbookService.create_cashbook_entry(
            group_id=fine.member.group_id,
            transaction_date=date.today(),
            description=f"Fine Payment - {fine.member.name} - {fine.reason}",
            entry_type='DEPOSIT',
            created_by=processed_by,
            member_id=fine.member_id,
            fines=amount_paid
        )
        
        db.session.commit()
        
        return cashbook_entry

    @staticmethod
    def record_loan_disbursement(loan_id, processed_by):
        """
        Record loan disbursement in cashbook
        """
        loan = GroupLoan.query.get(loan_id)
        if not loan:
            raise ValueError("Loan not found")
        
        if loan.status != 'APPROVED':
            raise ValueError("Loan is not approved for disbursement")
        
        # Disburse the loan
        loan.disburse_loan()
        
        # Update cashbook
        cashbook_entry = CashbookService.create_cashbook_entry(
            group_id=loan.group_id,
            transaction_date=date.today(),
            description=f"Loan Disbursement - {loan.requester.name}",
            entry_type='LOAN',
            created_by=processed_by,
            member_id=loan.requested_by,
            loan_taken=loan.principal
        )
        
        db.session.commit()
        
        return cashbook_entry

    @staticmethod
    def record_loan_repayment(loan_id, amount, processed_by, installment_number=None):
        """
        Record loan repayment and update schedule
        """
        loan = GroupLoan.query.get(loan_id)
        if not loan:
            raise ValueError("Loan not found")
        
        if loan.status not in ['DISBURSED', 'PARTIALLY_REPAID']:
            raise ValueError("Loan is not active for repayment")
        
        # Record repayment in loan
        loan.record_repayment(Decimal(str(amount)))
        
        # Update repayment schedule if specified
        if installment_number:
            schedule_item = LoanRepaymentSchedule.query.filter_by(
                loan_id=loan_id,
                installment_number=installment_number
            ).first()
            
            if schedule_item:
                schedule_item.amount_paid += Decimal(str(amount))
                schedule_item.payment_date = date.today()
                schedule_item.update_status()
        
        # Update cashbook
        cashbook_entry = CashbookService.create_cashbook_entry(
            group_id=loan.group_id,
            transaction_date=date.today(),
            description=f"Loan Repayment - {loan.requester.name}",
            entry_type='DEPOSIT',
            created_by=processed_by,
            member_id=loan.requested_by,
            loan_repayment=amount
        )
        
        db.session.commit()
        
        return cashbook_entry

    @staticmethod
    def get_group_cashbook(group_id, start_date=None, end_date=None, limit=100, offset=0):
        """
        Get cashbook entries for a group with optional date filtering
        """
        query = GroupCashbook.query.filter_by(group_id=group_id, status='ACTIVE')
        
        if start_date:
            query = query.filter(GroupCashbook.transaction_date >= start_date)
        if end_date:
            query = query.filter(GroupCashbook.transaction_date <= end_date)
        
        total = query.count()
        entries = query.order_by(
            GroupCashbook.transaction_date.desc(),
            GroupCashbook.id.desc()
        ).limit(limit).offset(offset).all()
        
        return {
            'entries': [entry.to_json() for entry in entries],
            'total': total,
            'limit': limit,
            'offset': offset
        }

    @staticmethod
    def get_group_financial_summary(group_id, as_of_date=None):
        """
        Get financial summary for a group as of a specific date
        """
        if not as_of_date:
            as_of_date = date.today()
        
        # Get the latest cashbook entry as of the specified date
        latest_entry = GroupCashbook.query.filter(
            GroupCashbook.group_id == group_id,
            GroupCashbook.transaction_date <= as_of_date,
            GroupCashbook.status == 'ACTIVE'
        ).order_by(
            GroupCashbook.transaction_date.desc(),
            GroupCashbook.id.desc()
        ).first()
        
        if not latest_entry:
            return {
                'individual_balance': 0.00,
                'ecd_balance': 0.00,
                'social_balance': 0.00,
                'target_balance': 0.00,
                'total_balance': 0.00,
                'as_of_date': as_of_date.isoformat()
            }
        
        return {
            'individual_balance': float(latest_entry.individual_balance),
            'ecd_balance': float(latest_entry.ecd_balance),
            'social_balance': float(latest_entry.social_balance),
            'target_balance': float(latest_entry.target_balance),
            'total_balance': float(latest_entry.total_balance),
            'as_of_date': as_of_date.isoformat(),
            'last_transaction_date': latest_entry.transaction_date.isoformat()
        }