#!/usr/bin/env python3
"""
Populate demo activities (transactions, meetings, loans) for calendar functionality
"""

import os
import sys
from datetime import datetime, timedelta, date
from decimal import Decimal
import random

# Add the project directory to Python path
sys.path.insert(0, '/usr/src/app')

from project import create_app, db
from project.api.models import (
    SavingsGroup, GroupMember, GroupTransaction, MeetingAttendance,
    GroupLoan, MemberFine, GroupTargetCampaign, TargetSavingsCampaign,
    MemberCampaignParticipation
)

def create_demo_transactions():
    """Create realistic savings transactions for the past 3 months"""
    print("Creating demo savings transactions...")
    
    members = GroupMember.query.filter_by(is_active=True).all()
    if not members:
        print("No active members found!")
        return
    
    # Create transactions for the past 90 days
    start_date = datetime.now() - timedelta(days=90)
    transaction_count = 0
    
    for member in members:
        # Each member makes 2-4 transactions per month
        num_transactions = random.randint(6, 12)  # 3 months worth
        
        for i in range(num_transactions):
            # Random date in the past 90 days
            days_ago = random.randint(1, 90)
            transaction_date = start_date + timedelta(days=days_ago)
            
            # Random transaction type and amount
            transaction_type = random.choice(['SAVING_CONTRIBUTION', 'SAVING_CONTRIBUTION', 'SAVING_CONTRIBUTION', 'WITHDRAWAL'])  # More contributions

            if transaction_type == 'SAVING_CONTRIBUTION':
                amount = Decimal(random.randint(5000, 50000))  # 5K to 50K UGX
            else:
                amount = Decimal(random.randint(-20000, -2000))  # Negative for withdrawals

            transaction = GroupTransaction(
                group_id=member.group_id,
                member_id=member.id,
                type=transaction_type,
                amount=amount,
                description=f"{transaction_type} by {member.name}",
                processed_by=3  # Super admin user ID
            )

            # Set additional fields after creation
            transaction.member_balance_before = Decimal(random.randint(10000, 200000))
            transaction.member_balance_after = Decimal(random.randint(15000, 250000))
            transaction.group_balance_before = Decimal(random.randint(100000, 2000000))
            transaction.group_balance_after = Decimal(random.randint(150000, 2500000))
            transaction.processed_date = transaction_date
            
            db.session.add(transaction)
            transaction_count += 1
    
    print(f"Created {transaction_count} demo transactions")

def create_demo_meetings():
    """Create meeting attendance records"""
    print("Creating demo meeting attendance...")
    
    groups = SavingsGroup.query.all()
    meeting_count = 0
    
    for group in groups:
        members = GroupMember.query.filter_by(group_id=group.id, is_active=True).all()
        if not members:
            continue
        
        # Create meetings for the past 3 months (weekly meetings)
        start_date = datetime.now() - timedelta(days=90)
        
        for week in range(12):  # 12 weeks
            meeting_date = start_date + timedelta(weeks=week)
            meeting_type = random.choice(['REGULAR', 'REGULAR', 'REGULAR', 'SPECIAL'])
            
            # 80-95% attendance rate
            attendance_rate = random.uniform(0.8, 0.95)
            attending_members = random.sample(members, int(len(members) * attendance_rate))
            
            for member in members:
                attended = member in attending_members
                
                attendance = MeetingAttendance(
                    group_id=group.id,
                    member_id=member.id,
                    meeting_date=meeting_date.date(),
                    meeting_type=meeting_type,
                    attended=attended,
                    recorded_by=3,  # Super admin user ID
                    excuse_reason=None if attended else random.choice([
                        "Sick", "Work commitment", "Family emergency", "Travel"
                    ])
                )

                # Set additional fields after creation
                if attended:
                    attendance.attendance_time = meeting_date
                    attendance.contributed_to_meeting = random.choice([True, False])
                    attendance.meeting_notes = f"Meeting notes for {member.name}"
                
                db.session.add(attendance)
            
            meeting_count += 1
    
    print(f"Created attendance records for {meeting_count} meetings")

def create_demo_loans():
    """Create demo loan records"""
    print("Creating demo loans...")
    
    members = GroupMember.query.filter_by(is_active=True).all()
    loan_count = 0
    
    # 30% of members have loans
    loan_members = random.sample(members, int(len(members) * 0.3))
    
    for member in loan_members:
        # Random loan from the past 6 months
        days_ago = random.randint(30, 180)
        application_date = datetime.now() - timedelta(days=days_ago)
        
        amount = Decimal(random.randint(100000, 1000000))  # 100K to 1M UGX
        interest_rate = Decimal(random.uniform(2.0, 5.0))  # 2-5% monthly
        term_months = random.randint(3, 12)
        
        status = random.choice(['APPROVED', 'APPROVED', 'PENDING', 'DISBURSED', 'PARTIALLY_REPAID'])
        
        loan = GroupLoan(
            group_id=member.group_id,
            principal=amount,
            term_months=term_months,
            interest_rate_annual=interest_rate,
            requested_by=member.id,
            purpose=random.choice([
                "Small business expansion", "School fees", "Medical expenses",
                "Agriculture inputs", "Home improvement"
            ])
        )

        # Set additional fields after creation
        loan.status = status
        loan.request_date = application_date
        if status != 'PENDING':
            loan.approval_date = application_date + timedelta(days=random.randint(1, 7))
            loan.approved_by = 3  # Super admin user ID
        if status in ['DISBURSED', 'PARTIALLY_REPAID', 'CLOSED']:
            loan.disbursal_date = loan.approval_date + timedelta(days=random.randint(1, 3))
            if status in ['PARTIALLY_REPAID', 'CLOSED']:
                min_repaid = int(float(amount) * 0.1)
                max_repaid = int(float(amount) * 0.9)
                loan.total_repaid = Decimal(random.randint(min_repaid, max_repaid))
                loan.outstanding_balance = amount - loan.total_repaid
            else:
                loan.total_repaid = Decimal(0)
                loan.outstanding_balance = amount
        
        db.session.add(loan)
        loan_count += 1
    
    print(f"Created {loan_count} demo loans")

def create_demo_fines():
    """Create demo member fines"""
    print("Creating demo fines...")
    
    members = GroupMember.query.filter_by(is_active=True).all()
    fine_count = 0
    
    # 20% of members have fines
    fine_members = random.sample(members, int(len(members) * 0.2))
    
    for member in fine_members:
        # Random fine from the past 2 months
        days_ago = random.randint(1, 60)
        fine_date = datetime.now() - timedelta(days=days_ago)
        
        amount = Decimal(random.randint(1000, 10000))  # 1K to 10K UGX
        
        fine = MemberFine(
            member_id=member.id,
            amount=amount,
            reason=random.choice([
                "Late arrival to meeting", "Missed meeting without excuse",
                "Disruptive behavior", "Late loan payment", "Incomplete savings"
            ]),
            fine_type=random.choice(['LATE_ATTENDANCE', 'MISSED_MEETING', 'LATE_PAYMENT', 'OTHER']),
            imposed_by=3,  # Super admin user ID
            due_date=(fine_date + timedelta(days=30)).date()
        )

        # Set additional fields after creation
        fine.status = random.choice(['PENDING', 'PAID', 'WAIVED'])
        fine.imposed_date = fine_date
        if fine.status == 'PAID':
            fine.paid_date = (fine_date + timedelta(days=random.randint(1, 25))).date()
        elif fine.status == 'WAIVED':
            fine.waived_date = (fine_date + timedelta(days=random.randint(1, 15))).date()
            fine.waived_reason = "Administrative waiver"
        
        db.session.add(fine)
        fine_count += 1
    
    print(f"Created {fine_count} demo fines")

def create_demo_campaigns():
    """Create demo target campaigns"""
    print("Creating demo target campaigns...")
    
    # Create a few target campaigns
    campaigns_data = [
        {
            'name': 'School Fees Campaign 2024',
            'description': 'Collective savings for children school fees',
            'target_amount': Decimal(5000000),  # 5M UGX
            'start_date': date.today() - timedelta(days=60),
            'target_date': date.today() + timedelta(days=120)
        },
        {
            'name': 'Community Water Project',
            'description': 'Fundraising for community water well',
            'target_amount': Decimal(10000000),  # 10M UGX
            'start_date': date.today() - timedelta(days=30),
            'target_date': date.today() + timedelta(days=180)
        }
    ]
    
    campaign_count = 0
    
    for campaign_data in campaigns_data:
        # Create the main campaign
        campaign = TargetSavingsCampaign(
            name=campaign_data['name'],
            description=campaign_data['description'],
            target_amount=campaign_data['target_amount'],
            target_date=campaign_data['target_date'],
            created_by=3,  # Super admin user ID
            is_mandatory=False,
            requires_group_vote=True
        )

        # Set additional fields after creation
        campaign.status = 'ACTIVE'
        campaign.start_date = campaign_data['start_date']
        campaign.is_global = True
        
        db.session.add(campaign)
        db.session.flush()  # Get the campaign ID
        
        # Assign to groups
        groups = SavingsGroup.query.all()
        for group in groups:
            group_campaign = GroupTargetCampaign(
                campaign_id=campaign.id,
                group_id=group.id,
                assigned_by=3
            )

            # Set additional fields after creation
            group_campaign.status = 'ACTIVE'
            group_campaign.decision_date = campaign_data['start_date']
            group_campaign.total_saved = Decimal(random.randint(0, int(float(campaign_data['target_amount']) * 0.3)))
            group_campaign.participating_members_count = random.randint(1, 5)
            if campaign_data['target_amount'] > 0:
                group_campaign.completion_percentage = min(100, (group_campaign.total_saved / campaign_data['target_amount']) * 100)
            
            db.session.add(group_campaign)
            campaign_count += 1
    
    print(f"Created {campaign_count} group campaign assignments")

def main():
    """Main function to populate all demo activities"""
    app, _ = create_app()
    
    with app.app_context():
        print("=== POPULATING DEMO ACTIVITIES ===")
        
        try:
            create_demo_transactions()
            create_demo_meetings()
            create_demo_loans()
            create_demo_fines()
            create_demo_campaigns()
            
            # Commit all changes
            db.session.commit()
            print("\n✅ Successfully populated demo activities!")
            
            # Show summary
            print("\n=== SUMMARY ===")
            print(f"Group Transactions: {GroupTransaction.query.count()}")
            print(f"Meeting Records: {MeetingAttendance.query.count()}")
            print(f"Loans: {GroupLoan.query.count()}")
            print(f"Fines: {MemberFine.query.count()}")
            print(f"Group Campaigns: {GroupTargetCampaign.query.count()}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error populating demo activities: {e}")
            raise

if __name__ == '__main__':
    main()
