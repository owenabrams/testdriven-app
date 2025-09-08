"""Add enhanced savings group models

Revision ID: add_enhanced_savings_models
Revises: 
Create Date: 2025-01-07

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_enhanced_savings_models'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Update savings_groups table to make district, parish, village required
    op.alter_column('savings_groups', 'district',
                    existing_type=sa.VARCHAR(length=100),
                    nullable=False)
    op.alter_column('savings_groups', 'parish',
                    existing_type=sa.VARCHAR(length=100),
                    nullable=False)
    op.alter_column('savings_groups', 'village',
                    existing_type=sa.VARCHAR(length=100),
                    nullable=False)

    # Create group_cashbook table
    op.create_table('group_cashbook',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=True),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('reference_number', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('individual_saving', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('ecd_fund', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('social_fund', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('target_saving', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('fines', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('loan_taken', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('loan_repayment', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('interest_earned', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('individual_balance', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('ecd_balance', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('social_balance', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('target_balance', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('total_balance', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('entry_type', sa.String(length=50), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, default='ACTIVE'),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(), nullable=False),
        sa.Column('approved_by', sa.Integer(), nullable=True),
        sa.Column('approved_date', sa.DateTime(), nullable=True),
        sa.CheckConstraint('total_balance >= 0', name='check_positive_total_balance'),
        sa.CheckConstraint("entry_type IN ('DEPOSIT', 'WITHDRAWAL', 'LOAN', 'FINE', 'INTEREST', 'TRANSFER')", name='check_valid_entry_type'),
        sa.CheckConstraint("status IN ('ACTIVE', 'REVERSED', 'CORRECTED')", name='check_valid_cashbook_status'),
        sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['group_id'], ['savings_groups.id'], ),
        sa.ForeignKeyConstraint(['member_id'], ['group_members.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create loan_assessments table
    op.create_table('loan_assessments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('assessment_date', sa.Date(), nullable=False),
        sa.Column('total_savings', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('months_active', sa.Integer(), nullable=False),
        sa.Column('attendance_rate', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('payment_consistency', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('outstanding_fines', sa.Numeric(precision=10, scale=2), nullable=False, default=0.00),
        sa.Column('eligibility_score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('is_eligible', sa.Boolean(), nullable=False, default=False),
        sa.Column('max_loan_amount', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('recommended_term_months', sa.Integer(), nullable=True),
        sa.Column('risk_level', sa.String(length=20), nullable=False),
        sa.Column('risk_factors', sa.Text(), nullable=True),
        sa.Column('assessment_notes', sa.Text(), nullable=True),
        sa.Column('recommendations', sa.Text(), nullable=True),
        sa.Column('valid_until', sa.Date(), nullable=False),
        sa.Column('is_current', sa.Boolean(), nullable=False, default=True),
        sa.Column('assessed_by', sa.Integer(), nullable=False),
        sa.Column('created_date', sa.DateTime(), nullable=False),
        sa.CheckConstraint('eligibility_score >= 0 AND eligibility_score <= 100', name='check_valid_score'),
        sa.CheckConstraint('attendance_rate >= 0 AND attendance_rate <= 100', name='check_valid_attendance'),
        sa.CheckConstraint('payment_consistency >= 0 AND payment_consistency <= 100', name='check_valid_consistency'),
        sa.CheckConstraint('max_loan_amount >= 0', name='check_positive_loan_amount'),
        sa.CheckConstraint("risk_level IN ('LOW', 'MEDIUM', 'HIGH')", name='check_valid_risk_level'),
        sa.ForeignKeyConstraint(['assessed_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['member_id'], ['group_members.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create loan_repayment_schedule table
    op.create_table('loan_repayment_schedule',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('loan_id', sa.Integer(), nullable=False),
        sa.Column('installment_number', sa.Integer(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('principal_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('interest_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('amount_paid', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('payment_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, default='PENDING'),
        sa.Column('days_overdue', sa.Integer(), nullable=False, default=0),
        sa.Column('late_fee', sa.Numeric(precision=10, scale=2), nullable=False, default=0.00),
        sa.Column('created_date', sa.DateTime(), nullable=False),
        sa.Column('updated_date', sa.DateTime(), nullable=False),
        sa.CheckConstraint('principal_amount > 0', name='check_positive_principal'),
        sa.CheckConstraint('interest_amount >= 0', name='check_non_negative_interest'),
        sa.CheckConstraint('amount_paid >= 0', name='check_non_negative_payment'),
        sa.CheckConstraint('days_overdue >= 0', name='check_non_negative_overdue'),
        sa.CheckConstraint("status IN ('PENDING', 'PAID', 'OVERDUE', 'PARTIAL')", name='check_valid_repayment_status'),
        sa.ForeignKeyConstraint(['loan_id'], ['group_loans.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('loan_id', 'installment_number', name='unique_loan_installment')
    )


def downgrade():
    # Drop new tables
    op.drop_table('loan_repayment_schedule')
    op.drop_table('loan_assessments')
    op.drop_table('group_cashbook')
    
    # Revert savings_groups table changes
    op.alter_column('savings_groups', 'village',
                    existing_type=sa.VARCHAR(length=100),
                    nullable=True)
    op.alter_column('savings_groups', 'parish',
                    existing_type=sa.VARCHAR(length=100),
                    nullable=True)
    op.alter_column('savings_groups', 'district',
                    existing_type=sa.VARCHAR(length=100),
                    nullable=True)