#!/usr/bin/env python3
"""
Enhanced Savings Groups - Demo Data Seeding Script
Creates realistic demo data to showcase the complete system functionality
"""

import os
import sys
from datetime import date, timedelta
from decimal import Decimal

# Add the project directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from project import create_app, db
from project.api.models import (
    User, SavingsGroup, GroupMember, SavingType, MemberSaving,
    SavingTransaction, GroupCashbook, MeetingAttendance, MemberFine,
    LoanAssessment, GroupLoan, TargetSavingsCampaign, GroupTargetCampaign,
    MemberCampaignParticipation, Notification
)

def create_demo_data():
    """Create comprehensive demo data for the Enhanced Savings Groups system"""
    
    print("🌱 Seeding Enhanced Savings Groups Demo Data...")
    
    # Set environment for development
    os.environ.setdefault('APP_SETTINGS', 'project.config.DevelopmentConfig')
    os.environ.setdefault('DATABASE_URL', 'sqlite:///app.db')
    os.environ.setdefault('SECRET_KEY', 'dev-secret-key')
    
    # Create application context
    app, _ = create_app()
    with app.app_context():
        
        # Clear existing data (except admin users)
        print("🧹 Cleaning existing demo data...")
        db.session.query(MemberCampaignParticipation).delete()
        db.session.query(GroupTargetCampaign).delete()
        db.session.query(TargetSavingsCampaign).delete()
        db.session.query(GroupLoan).delete()
        db.session.query(LoanAssessment).delete()
        db.session.query(MemberFine).delete()
        db.session.query(MeetingAttendance).delete()
        db.session.query(GroupCashbook).delete()
        db.session.query(SavingTransaction).delete()
        db.session.query(MemberSaving).delete()
        db.session.query(GroupMember).delete()
        db.session.query(SavingsGroup).delete()
        
        # Keep admin users, but create regular users
        regular_users = db.session.query(User).filter(User.is_super_admin == False).all()
        for user in regular_users:
            db.session.delete(user)
        
        db.session.commit()
        
        # Get or create system admin
        admin_user = User.query.filter_by(email='superadmin@testdriven.io').first()
        if not admin_user:
            admin_user = User(
                username='superadmin',
                email='superadmin@testdriven.io',
                password='superpassword123'
            )
            admin_user.is_super_admin = True
            admin_user.admin = True
            admin_user.role = 'super_admin'
            db.session.add(admin_user)
            db.session.commit()
        
        # Get or create service admin for savings groups
        service_admin = User.query.filter_by(email='admin@savingsgroups.ug').first()
        if not service_admin:
            service_admin = User(
                username='savingsadmin',
                email='admin@savingsgroups.ug',
                password='admin123'
            )
            service_admin.admin = True
            service_admin.role = 'service_admin'
            db.session.add(service_admin)
            db.session.commit()
            print("✅ Service admin created: admin@savingsgroups.ug / admin123")
        else:
            print("✅ Service admin already exists")
        
        # Create regular users (group members)
        print("👥 Creating demo users...")
        users_data = [
            {'username': 'sarah_nakato', 'email': 'sarah@kampala.ug', 'password': 'password123', 'full_name': 'Sarah Nakato'},
            {'username': 'mary_nambi', 'email': 'mary@kampala.ug', 'password': 'password123', 'full_name': 'Mary Nambi'},
            {'username': 'grace_mukasa', 'email': 'grace@kampala.ug', 'password': 'password123', 'full_name': 'Grace Mukasa'},
            {'username': 'alice_ssali', 'email': 'alice@kampala.ug', 'password': 'password123', 'full_name': 'Alice Ssali'},
            {'username': 'jane_nakirya', 'email': 'jane@kampala.ug', 'password': 'password123', 'full_name': 'Jane Nakirya'},
            {'username': 'rose_namuli', 'email': 'rose@kampala.ug', 'password': 'password123', 'full_name': 'Rose Namuli'},
            {'username': 'john_mukasa', 'email': 'john@kampala.ug', 'password': 'password123', 'full_name': 'John Mukasa'},
            {'username': 'peter_ssali', 'email': 'peter@kampala.ug', 'password': 'password123', 'full_name': 'Peter Ssali'},
        ]
        
        demo_users = {}
        for user_data in users_data:
            user = User(
                username=user_data['username'],
                email=user_data['email'],
                password=user_data['password']
            )
            db.session.add(user)
            db.session.flush()
            demo_users[user_data['username']] = user
        
        db.session.commit()
        
        # Create saving types
        print("💰 Creating saving types...")
        saving_types_data = [
            {'code': 'PERSONAL', 'name': 'Personal Savings', 'description': 'Individual member savings'},
            {'code': 'ECD', 'name': 'ECD Fund', 'description': 'Early Childhood Development Fund'},
            {'code': 'SOCIAL', 'name': 'Social Fund', 'description': 'Social activities and welfare fund'},
            {'code': 'TARGET', 'name': 'Target Savings', 'description': 'Targeted savings for specific goals'},
        ]
        
        for st_data in saving_types_data:
            existing = SavingType.query.filter_by(code=st_data['code']).first()
            if not existing:
                saving_type = SavingType(
                    name=st_data['name'],
                    code=st_data['code'],
                    created_by=admin_user.id,
                    description=st_data['description']
                )
                db.session.add(saving_type)
        
        db.session.commit()
        
        # Create demo savings groups
        print("🏦 Creating demo savings groups...")
        
        # Group 1: Kampala Women's Cooperative (Mature, High Performance)
        group1 = SavingsGroup(
            name="Kampala Women's Cooperative",
            description="Empowering women through collective savings and business development",
            district="Kampala",
            parish="Central",
            village="Nakasero",
            country="Uganda",
            region="Central",
            formation_date=date.today() - timedelta(days=365),  # 1 year old
            created_by=admin_user.id,
            target_amount=Decimal('10000000')  # 10M UGX
        )
        group1.state = 'ACTIVE'
        group1.meeting_frequency = 'WEEKLY'
        group1.minimum_contribution = Decimal('50000')  # 50K UGX
        db.session.add(group1)
        db.session.flush()
        
        # Group 2: Nakasero Traders (Active, Medium Performance)
        group2 = SavingsGroup(
            name="Nakasero Traders Association",
            description="Supporting small business owners in Nakasero market",
            district="Kampala",
            parish="Nakasero",
            village="Commercial District",
            country="Uganda",
            region="Central",
            formation_date=date.today() - timedelta(days=180),  # 6 months old
            created_by=admin_user.id,
            target_amount=Decimal('5000000')  # 5M UGX
        )
        group2.state = 'ACTIVE'
        group2.meeting_frequency = 'WEEKLY'
        group2.minimum_contribution = Decimal('25000')  # 25K UGX
        db.session.add(group2)
        db.session.flush()
        
        # Group 3: Bugolobi Youth Group (New, Forming)
        group3 = SavingsGroup(
            name="Bugolobi Youth Entrepreneurs",
            description="Young entrepreneurs building their future together",
            district="Kampala",
            parish="Bugolobi",
            village="Residential Area",
            country="Uganda",
            region="Central",
            formation_date=date.today() - timedelta(days=30),  # 1 month old
            created_by=admin_user.id,
            target_amount=Decimal('2000000')  # 2M UGX
        )
        group3.state = 'FORMING'
        group3.meeting_frequency = 'WEEKLY'
        group3.minimum_contribution = Decimal('20000')  # 20K UGX
        db.session.add(group3)
        db.session.flush()
        
        db.session.commit()
        
        # Create group members
        print("👥 Adding group members...")
        
        # Group 1 Members (Kampala Women's Cooperative)
        group1_members = [
            {'user': demo_users['sarah_nakato'], 'name': 'Sarah Nakato', 'phone': '+256701234567', 'gender': 'F', 'role': 'OFFICER'},
            {'user': demo_users['mary_nambi'], 'name': 'Mary Nambi', 'phone': '+256702345678', 'gender': 'F', 'role': 'OFFICER'},
            {'user': demo_users['grace_mukasa'], 'name': 'Grace Mukasa', 'phone': '+256703456789', 'gender': 'F', 'role': 'OFFICER'},
            {'user': demo_users['alice_ssali'], 'name': 'Alice Ssali', 'phone': '+256704567890', 'gender': 'F', 'role': 'MEMBER'},
            {'user': demo_users['jane_nakirya'], 'name': 'Jane Nakirya', 'phone': '+256705678901', 'gender': 'F', 'role': 'MEMBER'},
        ]
        
        for member_data in group1_members:
            member = GroupMember(
                group_id=group1.id,
                user_id=member_data['user'].id,
                name=member_data['name'],
                phone=member_data['phone'],
                gender=member_data['gender'],
                role=member_data['role']
            )
            member.joined_date = group1.formation_date + timedelta(days=7)
            member.is_active = True
            db.session.add(member)
        
        # Group 2 Members (Nakasero Traders)
        group2_members = [
            {'user': demo_users['john_mukasa'], 'name': 'John Mukasa', 'phone': '+256706789012', 'gender': 'M', 'role': 'OFFICER'},
            {'user': demo_users['rose_namuli'], 'name': 'Rose Namuli', 'phone': '+256707890123', 'gender': 'F', 'role': 'OFFICER'},
            {'user': demo_users['peter_ssali'], 'name': 'Peter Ssali', 'phone': '+256708901234', 'gender': 'M', 'role': 'MEMBER'},
        ]
        
        for member_data in group2_members:
            member = GroupMember(
                group_id=group2.id,
                user_id=member_data['user'].id,
                name=member_data['name'],
                phone=member_data['phone'],
                gender=member_data['gender'],
                role=member_data['role']
            )
            member.joined_date = group2.formation_date + timedelta(days=14)
            member.is_active = True
            db.session.add(member)
        
        db.session.commit()
        
        # Update group member counts
        group1.members_count = 5
        group2.members_count = 3
        group3.members_count = 0
        
        # Get members for savings transactions
        sarah = GroupMember.query.filter_by(group_id=group1.id, name='Sarah Nakato').first()
        mary = GroupMember.query.filter_by(group_id=group1.id, name='Mary Nambi').first()
        grace = GroupMember.query.filter_by(group_id=group1.id, name='Grace Mukasa').first()
        alice = GroupMember.query.filter_by(group_id=group1.id, name='Alice Ssali').first()
        jane = GroupMember.query.filter_by(group_id=group1.id, name='Jane Nakirya').first()
        
        john = GroupMember.query.filter_by(group_id=group2.id, name='John Mukasa').first()
        rose = GroupMember.query.filter_by(group_id=group2.id, name='Rose Namuli').first()
        
        # Create member savings and transactions
        print("💰 Creating member savings and transactions...")
        
        # Helper function to create savings
        def create_member_savings(member, saving_type_code, amounts_by_month):
            saving_type = SavingType.query.filter_by(code=saving_type_code).first()
            total_balance = Decimal('0')
            
            for month_offset, amount in amounts_by_month.items():
                transaction_date = date.today() - timedelta(days=30 * month_offset)
                
                # Create or get member saving record
                member_saving = MemberSaving.query.filter_by(
                    member_id=member.id,
                    saving_type_id=saving_type.id
                ).first()

                if not member_saving:
                    member_saving = MemberSaving(
                        member_id=member.id,
                        saving_type_id=saving_type.id
                    )
                    db.session.add(member_saving)

                # Update balance
                balance_before = member_saving.current_balance or Decimal('0')
                member_saving.current_balance = balance_before + Decimal(str(amount))
                db.session.add(member_saving)
                db.session.flush()  # Ensure member_saving has an ID

                # Create saving transaction
                saving_transaction = SavingTransaction(
                    member_saving_id=member_saving.id,
                    amount=Decimal(str(amount)),
                    transaction_type='DEPOSIT',
                    processed_by=admin_user.id,
                    description=f'Monthly contribution - {saving_type.name}',
                    mobile_money_provider='MTN' if month_offset % 2 == 0 else 'AIRTEL',
                    mobile_money_transaction_id=f'TXN{member.id}{month_offset}{amount}',
                    mobile_money_phone=member.phone
                )
                saving_transaction.balance_before = balance_before
                saving_transaction.balance_after = member_saving.current_balance
                saving_transaction.transaction_date = transaction_date
                saving_transaction.status = 'VERIFIED'
                db.session.add(saving_transaction)
                
                total_balance += Decimal(str(amount))
                
                # Create cashbook entry
                cashbook_entry = GroupCashbook(
                    group_id=member.group_id,
                    transaction_date=transaction_date,
                    description=f'{saving_type.name} - {member.name}',
                    entry_type='DEPOSIT',
                    created_by=admin_user.id,
                    member_id=member.id
                )
                # Set the appropriate saving type amount
                if saving_type.code == 'PERSONAL':
                    cashbook_entry.individual_saving = Decimal(str(amount))
                elif saving_type.code == 'ECD':
                    cashbook_entry.ecd_fund = Decimal(str(amount))
                elif saving_type.code == 'SOCIAL':
                    cashbook_entry.social_fund = Decimal(str(amount))
                elif saving_type.code == 'TARGET':
                    cashbook_entry.target_saving = Decimal(str(amount))
                db.session.add(cashbook_entry)
            
            # Update member balance
            member.share_balance = total_balance
            member.total_contributions = total_balance
        
        # Sarah's savings (Chair - High performer)
        create_member_savings(sarah, 'PERSONAL', {6: 100000, 5: 120000, 4: 110000, 3: 130000, 2: 125000, 1: 140000, 0: 135000})
        create_member_savings(sarah, 'ECD', {4: 50000, 2: 60000, 0: 55000})
        create_member_savings(sarah, 'SOCIAL', {3: 25000, 1: 30000})
        
        # Mary's savings (Treasurer - Consistent performer)
        create_member_savings(mary, 'PERSONAL', {6: 80000, 5: 85000, 4: 90000, 3: 95000, 2: 100000, 1: 105000, 0: 110000})
        create_member_savings(mary, 'ECD', {5: 40000, 3: 45000, 1: 50000})
        
        # Grace's savings (Secretary - Regular performer)
        create_member_savings(grace, 'PERSONAL', {6: 60000, 5: 65000, 4: 70000, 3: 75000, 2: 80000, 1: 85000, 0: 90000})
        create_member_savings(grace, 'SOCIAL', {4: 20000, 2: 25000, 0: 30000})
        
        # Alice's savings (Member - Moderate performer)
        create_member_savings(alice, 'PERSONAL', {5: 50000, 4: 55000, 3: 60000, 2: 65000, 1: 70000, 0: 75000})
        
        # Jane's savings (Member - New but enthusiastic)
        create_member_savings(jane, 'PERSONAL', {3: 45000, 2: 50000, 1: 55000, 0: 60000})
        create_member_savings(jane, 'TARGET', {2: 100000, 0: 150000})
        
        # Group 2 savings (smaller amounts)
        create_member_savings(john, 'PERSONAL', {4: 40000, 3: 45000, 2: 50000, 1: 55000, 0: 60000})
        create_member_savings(rose, 'PERSONAL', {4: 35000, 3: 40000, 2: 45000, 1: 50000, 0: 55000})
        
        db.session.commit()
        
        # Create target savings campaign
        print("🎯 Creating target savings campaign...")
        campaign = TargetSavingsCampaign(
            name="Women's Empowerment 2025",
            description="Supporting women entrepreneurs across Kampala with targeted savings goals",
            target_amount=Decimal('5000000'),
            target_date=date(2025, 12, 31),
            created_by=admin_user.id,
            is_mandatory=False,
            requires_group_vote=True
        )
        campaign.minimum_participation_rate = Decimal('70')
        campaign.completion_bonus_rate = Decimal('10')
        campaign.early_completion_bonus = Decimal('5')
        campaign.penalty_for_non_participation = Decimal('0')
        campaign.is_global = True
        campaign.status = 'ACTIVE'
        db.session.add(campaign)
        db.session.flush()
        
        # Assign campaign to Group 1
        group_campaign = GroupTargetCampaign(
            campaign_id=campaign.id,
            group_id=group1.id,
            assigned_by=admin_user.id
        )
        group_campaign.target_amount = Decimal('2000000')
        group_campaign.assigned_date = date.today() - timedelta(days=60)
        group_campaign.status = 'ACTIVE'
        db.session.add(group_campaign)
        db.session.flush()
        
        # Create member campaign participations (voting and contributions)
        participations = [
            {'member': sarah, 'vote': 'FOR', 'contribution': 200000},
            {'member': mary, 'vote': 'FOR', 'contribution': 150000},
            {'member': grace, 'vote': 'FOR', 'contribution': 100000},
            {'member': alice, 'vote': 'FOR', 'contribution': 75000},
            {'member': jane, 'vote': 'FOR', 'contribution': 125000},
        ]
        
        total_contributions = Decimal('0')
        for p in participations:
            participation = MemberCampaignParticipation(
                group_campaign_id=group_campaign.id,
                member_id=p['member'].id,
                is_participating=True
            )
            participation.current_contribution = Decimal(str(p['contribution']))
            participation.last_contribution_date = date.today() - timedelta(days=10)
            db.session.add(participation)
            total_contributions += Decimal(str(p['contribution']))
        
        # Update campaign progress
        group_campaign.current_amount = total_contributions
        group_campaign.progress_percentage = (total_contributions / group_campaign.target_amount) * 100
        
        # Create loan assessment for Mary (she's been saving consistently)
        print("💳 Creating loan assessment...")
        loan_assessment = LoanAssessment(
            member_id=mary.id,
            total_savings=Decimal('750000'),
            months_active=8,
            attendance_rate=Decimal('90'),
            payment_consistency=Decimal('95'),
            assessed_by=admin_user.id,
            outstanding_fines=Decimal('0')
        )
        loan_assessment.assessment_date = date.today() - timedelta(days=7)
        loan_assessment.eligibility_score = Decimal('90')
        loan_assessment.is_eligible = True
        loan_assessment.max_loan_amount = Decimal('500000')
        loan_assessment.recommended_term_months = 6
        loan_assessment.risk_level = 'LOW'
        loan_assessment.recommended_interest_rate = Decimal('12')
        loan_assessment.valid_until = date.today() + timedelta(days=83)
        db.session.add(loan_assessment)
        
        # Create meeting attendance records
        print("📅 Creating meeting attendance records...")
        members_group1 = [sarah, mary, grace, alice, jane]
        
        # Create 12 weeks of meeting attendance
        for week in range(12):
            meeting_date = date.today() - timedelta(weeks=week)
            
            for member in members_group1:
                # Most members attend regularly, occasional absences
                attended = True
                if member == alice and week in [2, 7]:  # Alice missed 2 meetings
                    attended = False
                elif member == jane and week == 10:  # Jane missed 1 meeting (she's newer)
                    attended = False
                
                attendance = MeetingAttendance(
                    group_id=group1.id,
                    member_id=member.id,
                    meeting_date=meeting_date,
                    meeting_type='REGULAR',
                    attended=attended,
                    excuse_reason='Personal emergency' if not attended else None,
                    recorded_by=admin_user.id
                )
                db.session.add(attendance)
        
        # Create some fines
        print("💸 Creating member fines...")
        
        # Alice gets a fine for missing meetings
        fine1 = MemberFine(
            member_id=alice.id,
            amount=Decimal('10000'),
            reason='Missed meeting on 2024-11-15 without prior notice',
            fine_type='MISSED_MEETING',
            imposed_by=admin_user.id,
            due_date=date.today() + timedelta(days=30)
        )
        fine1.status = 'PENDING'
        fine1.imposed_date = date.today() - timedelta(days=5)
        db.session.add(fine1)
        
        # Jane gets a smaller fine (she's new)
        fine2 = MemberFine(
            member_id=jane.id,
            amount=Decimal('5000'),
            reason='Late savings contribution in November',
            fine_type='LATE_PAYMENT',
            imposed_by=admin_user.id,
            due_date=date.today() + timedelta(days=15)
        )
        fine2.status = 'PAID'
        fine2.imposed_date = date.today() - timedelta(days=10)
        fine2.paid_date = date.today() - timedelta(days=3)
        fine2.paid_amount = Decimal('5000')
        db.session.add(fine2)
        
        db.session.commit()
        
        # Update group balances
        print("📊 Updating group financial summaries...")
        
        # Calculate Group 1 totals
        group1_total = db.session.query(db.func.sum(GroupMember.share_balance)).filter_by(group_id=group1.id).scalar() or Decimal('0')
        group1.savings_balance = group1_total
        
        # Calculate Group 2 totals  
        group2_total = db.session.query(db.func.sum(GroupMember.share_balance)).filter_by(group_id=group2.id).scalar() or Decimal('0')
        group2.savings_balance = group2_total
        
        db.session.commit()

        # Create demo notifications
        print("📢 Creating demo notifications...")
        demo_notifications = []

        # Welcome notifications for all users
        for user_data in users_data:
            user = demo_users[user_data['username']]
            welcome_notification = Notification(
                user_id=user.id,
                message=f"Welcome to the Enhanced Savings Groups platform, {user_data['full_name']}! Start by joining a savings group.",
                type='info',
                title='Welcome to the Platform'
            )
            demo_notifications.append(welcome_notification)

        # Savings activity notifications
        savings_notification = Notification(
            user_id=demo_users['sarah_nakato'].id,
            message="Your savings deposit of UGX 135,000 has been successfully recorded in Kampala Women's Cooperative.",
            type='success',
            title='Savings Deposited'
        )
        demo_notifications.append(savings_notification)

        # Meeting reminder notification
        meeting_notification = Notification(
            user_id=demo_users['alice_ssali'].id,
            message="Don't forget about the Kampala Women's Cooperative meeting tomorrow at 2:00 PM.",
            type='warning',
            title='Meeting Reminder'
        )
        demo_notifications.append(meeting_notification)

        # Loan approval notification
        loan_notification = Notification(
            user_id=demo_users['mary_nambi'].id,
            message="Your loan application for UGX 500,000 has been approved and will be disbursed soon.",
            type='success',
            title='Loan Approved'
        )
        demo_notifications.append(loan_notification)

        # Campaign notification
        campaign_notification = Notification(
            user_id=demo_users['grace_mukasa'].id,
            message="New savings campaign 'Women's Empowerment 2025' has started. Join now to participate!",
            type='info',
            title='New Campaign Started'
        )
        demo_notifications.append(campaign_notification)

        # Fine notification
        fine_notification = Notification(
            user_id=demo_users['alice_ssali'].id,
            message="You have been fined UGX 10,000 for missing the meeting on November 15th. Please pay by the due date.",
            type='warning',
            title='Fine Imposed'
        )
        demo_notifications.append(fine_notification)

        # System notification for admin
        admin_notification = Notification(
            user_id=admin_user.id,
            message="8 new users have registered today and the demo data has been successfully seeded.",
            type='info',
            title='System Update'
        )
        demo_notifications.append(admin_notification)

        # Add all notifications to database
        for notification in demo_notifications:
            db.session.add(notification)

        db.session.commit()
        print(f"✅ Created {len(demo_notifications)} demo notifications")

        print("✅ Demo data seeding completed successfully!")
        print(f"""
🎉 DEMO DATA SUMMARY:
        
👥 Users Created:
   - 1 Super Admin: superadmin@testdriven.io
   - 8 Regular Users: sarah@kampala.ug, mary@kampala.ug, etc.
   
🏦 Savings Groups:
   - Kampala Women's Cooperative (5 members, UGX {group1_total:,.0f})
   - Nakasero Traders Association (3 members, UGX {group2_total:,.0f})  
   - Bugolobi Youth Entrepreneurs (0 members, forming)
   
💰 Financial Data:
   - Multiple saving types: Personal, ECD, Social, Target
   - Mobile money transactions with verification
   - Comprehensive cashbook entries
   - Total system savings: UGX {group1_total + group2_total:,.0f}
   
🎯 Target Campaign:
   - Women's Empowerment 2025 (Active)
   - Group participation with voting records
   - Progress tracking: {(total_contributions/group_campaign.target_amount)*100:.1f}% complete
   
💳 Loan Assessment:
   - Mary Nambi: Eligible for UGX 500,000 (LOW risk)
   
📅 Meeting Records:
   - 12 weeks of attendance data
   - Attendance rates calculated
   
💸 Fines Management:
   - Sample fines with payment tracking
   
🔐 LOGIN CREDENTIALS:
   Admin: superadmin@testdriven.io / superpassword123
   Member: sarah@kampala.ug / password123
   Member: mary@kampala.ug / password123
   (All member passwords: password123)
        """)

if __name__ == '__main__':
    create_demo_data()