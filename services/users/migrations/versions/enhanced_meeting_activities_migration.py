"""Add Enhanced Meeting Activities System

Revision ID: enhanced_meeting_activities
Revises: 253b9c9d1208
Create Date: 2025-10-01 21:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'enhanced_meeting_activities'
down_revision = '253b9c9d1208'  # Latest migration in your system
branch_labels = None
depends_on = None


def upgrade():
    # ### Enhanced Meeting Activities Tables ###
    
    # 1. Meeting Activities Table
    op.create_table('meeting_activities',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('meeting_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.String(length=50), nullable=False),
        sa.Column('activity_name', sa.String(length=200), nullable=False),
        sa.Column('activity_order', sa.Integer(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('expected_amount', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('actual_amount', sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, default='PENDING'),
        sa.Column('start_time', sa.DateTime(), nullable=True),
        sa.Column('end_time', sa.DateTime(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('facilitator_id', sa.Integer(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('challenges', sa.Text(), nullable=True),
        sa.Column('success_factors', sa.Text(), nullable=True),
        sa.Column('created_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ),
        sa.ForeignKeyConstraint(['facilitator_id'], ['group_members.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("activity_type IN ('PERSONAL_SAVINGS', 'ECD_FUND', 'SOCIAL_FUND', 'TARGET_SAVINGS', 'LOAN_APPLICATION', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FINES', 'AOB', 'EMERGENCY_FUND', 'FINE_COLLECTION', 'SAVINGS_COLLECTION')", name='check_valid_activity_type'),
        sa.CheckConstraint("status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED')", name='check_valid_activity_status'),
        sa.CheckConstraint('activity_order > 0', name='check_positive_activity_order'),
        sa.CheckConstraint('expected_amount >= 0', name='check_non_negative_expected_amount'),
        sa.CheckConstraint('actual_amount >= 0', name='check_non_negative_actual_amount'),
        sa.CheckConstraint('duration_minutes >= 0', name='check_non_negative_duration')
    )
    
    # 2. Member Activity Participation Table
    op.create_table('member_activity_participation',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('meeting_activity_id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('participation_type', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False, default=0.00),
        sa.Column('status', sa.String(length=20), nullable=False, default='PENDING'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('challenges', sa.Text(), nullable=True),
        sa.Column('recorded_by', sa.Integer(), nullable=True),
        sa.Column('recorded_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('verified_by', sa.Integer(), nullable=True),
        sa.Column('verified_date', sa.DateTime(), nullable=True),
        sa.Column('created_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(['meeting_activity_id'], ['meeting_activities.id'], ),
        sa.ForeignKeyConstraint(['member_id'], ['group_members.id'], ),
        sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['verified_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("participation_type IN ('CONTRIBUTED', 'RECEIVED', 'VOTED', 'DISCUSSED', 'ATTENDED', 'ABSENT', 'CONTRIBUTOR', 'BORROWER')", name='check_valid_participation_type'),
        sa.CheckConstraint("status IN ('PENDING', 'COMPLETED', 'PARTIAL', 'SKIPPED')", name='check_valid_participation_status'),
        sa.CheckConstraint('amount >= 0', name='check_non_negative_participation_amount'),
        sa.UniqueConstraint('meeting_activity_id', 'member_id', name='unique_member_activity_participation')
    )
    
    # 3. Activity Documents Table
    op.create_table('activity_documents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('meeting_activity_id', sa.Integer(), nullable=True),
        sa.Column('member_participation_id', sa.Integer(), nullable=True),
        sa.Column('meeting_id', sa.Integer(), nullable=False),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('file_name', sa.String(length=255), nullable=False),
        sa.Column('original_file_name', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('file_type', sa.String(length=50), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('access_level', sa.String(length=20), nullable=False, default='GROUP'),
        sa.Column('uploaded_by', sa.Integer(), nullable=False),
        sa.Column('uploaded_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('verified_by', sa.Integer(), nullable=True),
        sa.Column('verified_date', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(['meeting_activity_id'], ['meeting_activities.id'], ),
        sa.ForeignKeyConstraint(['member_participation_id'], ['member_activity_participation.id'], ),
        sa.ForeignKeyConstraint(['meeting_id'], ['meetings.id'], ),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['verified_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("document_type IN ('HANDWRITTEN_RECORD', 'ATTENDANCE_SHEET', 'SAVINGS_RECEIPT', 'LOAN_DOCUMENT', 'PHOTO_PROOF', 'SIGNATURE_SHEET', 'MEETING_MINUTES', 'CONSTITUTION', 'OTHER')", name='check_valid_document_type'),
        sa.CheckConstraint("access_level IN ('GROUP', 'LEADERSHIP', 'ADMIN')", name='check_valid_access_level'),
        sa.CheckConstraint("file_type IN ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'bmp')", name='check_valid_file_type'),
        sa.CheckConstraint('file_size > 0', name='check_positive_file_size'),
        sa.CheckConstraint('meeting_activity_id IS NOT NULL OR member_participation_id IS NOT NULL', name='check_document_attachment')
    )
    
    # 4. Activity Transactions Table
    op.create_table('activity_transactions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('meeting_activity_id', sa.Integer(), nullable=False),
        sa.Column('transaction_type', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('group_transaction_id', sa.Integer(), nullable=True),
        sa.Column('member_saving_id', sa.Integer(), nullable=True),
        sa.Column('group_loan_id', sa.Integer(), nullable=True),
        sa.Column('member_fine_id', sa.Integer(), nullable=True),
        sa.Column('transaction_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('recorded_by', sa.Integer(), nullable=False),
        sa.Column('verified_by', sa.Integer(), nullable=True),
        sa.Column('verification_date', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.Column('updated_date', sa.DateTime(), nullable=False, default=sa.func.now()),
        sa.ForeignKeyConstraint(['meeting_activity_id'], ['meeting_activities.id'], ),
        sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['verified_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("transaction_type IN ('SAVINGS_CONTRIBUTION', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'FINE_PAYMENT', 'EMERGENCY_FUND', 'SOCIAL_FUND')", name='check_valid_transaction_type'),
        sa.CheckConstraint('amount > 0', name='check_positive_transaction_amount')
    )
    
    # Create indexes for performance
    op.create_index('idx_meeting_activities_meeting_id', 'meeting_activities', ['meeting_id'])
    op.create_index('idx_meeting_activities_type_status', 'meeting_activities', ['activity_type', 'status'])
    op.create_index('idx_member_participation_activity_id', 'member_activity_participation', ['meeting_activity_id'])
    op.create_index('idx_member_participation_member_id', 'member_activity_participation', ['member_id'])
    op.create_index('idx_activity_documents_meeting_id', 'activity_documents', ['meeting_id'])
    op.create_index('idx_activity_documents_activity_id', 'activity_documents', ['meeting_activity_id'])
    op.create_index('idx_activity_transactions_activity_id', 'activity_transactions', ['meeting_activity_id'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_activity_transactions_activity_id', table_name='activity_transactions')
    op.drop_index('idx_activity_documents_activity_id', table_name='activity_documents')
    op.drop_index('idx_activity_documents_meeting_id', table_name='activity_documents')
    op.drop_index('idx_member_participation_member_id', table_name='member_activity_participation')
    op.drop_index('idx_member_participation_activity_id', table_name='member_activity_participation')
    op.drop_index('idx_meeting_activities_type_status', table_name='meeting_activities')
    op.drop_index('idx_meeting_activities_meeting_id', table_name='meeting_activities')
    
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('activity_transactions')
    op.drop_table('activity_documents')
    op.drop_table('member_activity_participation')
    op.drop_table('meeting_activities')
