# services/users/manage.py

import sys
import unittest
import coverage

from flask.cli import FlaskGroup

from project import create_app, db, socketio
# new
from project.api.models import User  # new

# Initialize coverage
COV = coverage.Coverage(
    branch=True,
    include='project/*',
    omit=[
        'project/tests/*',
        'project/config.py',
    ]
)
COV.start()

# app, socketio = create_app()  # new

def create_app_for_cli():
    app, _ = create_app()
    return app

cli = FlaskGroup(create_app=create_app_for_cli)  # new


@cli.command('recreate_db')
def recreate_db():
    db.drop_all()
    db.create_all()
    db.session.commit()


@cli.command('seed_db')
def seed_db():
    """Seeds the database."""
    from project.api.models import Service, ServiceAdmin, UserServicePermission
    
    # Create regular users
    user1 = User(
        username='michael',
        email='michael@reallynotreal.com',
        password='greaterthaneight'
    )
    user2 = User(
        username='michaelherman',
        email='michael@mherman.org',
        password='greaterthaneight'
    )
    
    db.session.add(user1)
    db.session.add(user2)
    
    # Create sample services
    users_service = Service(
        name='users',
        description='User management service',
        endpoint_url='http://localhost:5000'
    )
    
    orders_service = Service(
        name='orders',
        description='Order management service',
        endpoint_url='http://localhost:5001'
    )
    
    products_service = Service(
        name='products',
        description='Product catalog service',
        endpoint_url='http://localhost:5002'
    )
    
    savings_groups_service = Service(
        name='Savings Groups',
        description='Community savings and group lending platform',
        endpoint_url='http://localhost:5000/savings-groups'
    )
    
    db.session.add(users_service)
    db.session.add(orders_service)
    db.session.add(products_service)
    db.session.add(savings_groups_service)
    
    db.session.commit()


@cli.command('seed_demo_data')
def seed_demo_data():
    """Seeds comprehensive demo data for Enhanced Savings Groups."""
    from project.api.models import (
        SavingsGroup, GroupMember, SavingType, MemberSaving, 
        SavingTransaction, GroupCashbook, MeetingAttendance, MemberFine,
        LoanAssessment, TargetSavingsCampaign, GroupTargetCampaign,
        MemberCampaignParticipation
    )
    from datetime import date, timedelta
    from decimal import Decimal
    
    print("🌱 Seeding Enhanced Savings Groups Demo Data...")
    
    # Clear existing savings data
    print("🧹 Cleaning existing demo data...")
    db.session.query(MemberCampaignParticipation).delete()
    db.session.query(GroupTargetCampaign).delete()
    db.session.query(TargetSavingsCampaign).delete()
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
            password='superpassword123',
            is_super_admin=True,
            admin=True
        )
        db.session.add(admin_user)
        db.session.commit()
    
    # Create demo users
    print("👥 Creating demo users...")
    users_data = [
        {'username': 'sarah_nakato', 'email': 'sarah@kampala.ug', 'password': 'password123'},
        {'username': 'mary_nambi', 'email': 'mary@kampala.ug', 'password': 'password123'},
        {'username': 'grace_mukasa', 'email': 'grace@kampala.ug', 'password': 'password123'},
        {'username': 'alice_ssali', 'email': 'alice@kampala.ug', 'password': 'password123'},
        {'username': 'jane_nakirya', 'email': 'jane@kampala.ug', 'password': 'password123'},
        {'username': 'rose_namuli', 'email': 'rose@kampala.ug', 'password': 'password123'},
        {'username': 'john_mukasa', 'email': 'john@kampala.ug', 'password': 'password123'},
        {'username': 'peter_ssali', 'email': 'peter@kampala.ug', 'password': 'password123'},
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
            saving_type = SavingType(**st_data)
            db.session.add(saving_type)
    
    db.session.commit()
    
    # Create demo savings groups
    print("🏦 Creating demo savings groups...")
    
    # Group 1: Kampala Women's Cooperative (Central Region)
    group1 = SavingsGroup(
        name="Kampala Women's Cooperative",
        description="Empowering women through collective savings and business development",
        district="Kampala",
        parish="Central",
        village="Nakasero",
        country="Uganda",
        region="Central",
        formation_date=date.today() - timedelta(days=365),
        created_by=admin_user.id,
        target_amount=Decimal('10000000')
    )
    group1.state = 'ACTIVE'
    group1.meeting_frequency = 'WEEKLY'
    group1.minimum_contribution = Decimal('50000')
    db.session.add(group1)
    db.session.flush()
    
    # Group 2: Wakiso Mixed Savings (Central Region)
    group2 = SavingsGroup(
        name="Wakiso Mixed Savings Group",
        description="Mixed gender group focusing on agricultural development",
        district="Wakiso",
        parish="Kawempe",
        village="Commercial District",
        country="Uganda",
        region="Central",
        formation_date=date.today() - timedelta(days=280),
        created_by=admin_user.id,
        target_amount=Decimal('8000000')
    )
    group2.state = 'ACTIVE'
    group2.meeting_frequency = 'WEEKLY'
    group2.minimum_contribution = Decimal('40000')
    db.session.add(group2)
    db.session.flush()
    
    # Group 3: Jinja Women Entrepreneurs (Eastern Region)
    group3 = SavingsGroup(
        name="Jinja Women Entrepreneurs",
        description="Women-focused business development group",
        district="Jinja",
        parish="Central",
        village="Business District",
        country="Uganda",
        region="Eastern",
        formation_date=date.today() - timedelta(days=200),
        created_by=admin_user.id,
        target_amount=Decimal('6000000')
    )
    group3.state = 'ACTIVE'
    group3.meeting_frequency = 'WEEKLY'
    group3.minimum_contribution = Decimal('35000')
    db.session.add(group3)
    db.session.flush()
    
    # Create group members for all groups
    print("👥 Adding group members...")
    
    # Group 1 Members (All Women - Kampala)
    group1_members = [
        {'user': demo_users['sarah_nakato'], 'name': 'Sarah Nakato', 'phone': '+256701234567', 'gender': 'F', 'role': 'OFFICER'},
        {'user': demo_users['mary_nambi'], 'name': 'Mary Nambi', 'phone': '+256702345678', 'gender': 'F', 'role': 'OFFICER'},
        {'user': demo_users['grace_mukasa'], 'name': 'Grace Mukasa', 'phone': '+256703456789', 'gender': 'F', 'role': 'OFFICER'},
        {'user': demo_users['alice_ssali'], 'name': 'Alice Ssali', 'phone': '+256704567890', 'gender': 'F', 'role': 'MEMBER'},
        {'user': demo_users['jane_nakirya'], 'name': 'Jane Nakirya', 'phone': '+256705678901', 'gender': 'F', 'role': 'MEMBER'},
    ]
    
    # Group 2 Members (Mixed Gender - Wakiso)
    group2_members = [
        {'user': demo_users['rose_namuli'], 'name': 'Rose Namuli', 'phone': '+256706789012', 'gender': 'F', 'role': 'OFFICER'},
        {'user': demo_users['john_mukasa'], 'name': 'John Mukasa', 'phone': '+256707890123', 'gender': 'M', 'role': 'OFFICER'},
        {'user': demo_users['peter_ssali'], 'name': 'Peter Ssali', 'phone': '+256708901234', 'gender': 'M', 'role': 'MEMBER'},
    ]
    
    all_members = []
    
    # Create Group 1 members
    for member_data in group1_members:
        member = GroupMember(
            group_id=group1.id,
            user_id=member_data['user'].id,
            name=member_data['name'],
            gender=member_data['gender'],
            phone=member_data['phone'],
            role=member_data['role']
        )
        member.joined_date = group1.formation_date + timedelta(days=7)
        member.is_active = True
        member.share_balance = Decimal('0')
        member.total_contributions = Decimal('0')
        db.session.add(member)
        all_members.append(member)
    
    # Create Group 2 members
    for member_data in group2_members:
        member = GroupMember(
            group_id=group2.id,
            user_id=member_data['user'].id,
            name=member_data['name'],
            gender=member_data['gender'],
            phone=member_data['phone'],
            role=member_data['role']
        )
        member.joined_date = group2.formation_date + timedelta(days=14)
        member.is_active = True
        member.share_balance = Decimal('0')
        member.total_contributions = Decimal('0')
        db.session.add(member)
        all_members.append(member)
    
    # Create Group 3 members (reuse some users for cross-group membership)
    group3_member = GroupMember(
        group_id=group3.id,
        user_id=demo_users['sarah_nakato'].id,  # Sarah is in multiple groups
        name='Sarah Nakato',
        gender='F',
        phone='+256701234567',
        role='MEMBER'
    )
    group3_member.joined_date = group3.formation_date + timedelta(days=21)
    group3_member.is_active = True
    group3_member.share_balance = Decimal('0')
    group3_member.total_contributions = Decimal('0')
    db.session.add(group3_member)
    all_members.append(group3_member)
    
    members = all_members[:5]  # Keep original variable for backward compatibility
    
    db.session.commit()
    
    # Create comprehensive member savings across different time periods and fund types
    print("💰 Creating comprehensive member savings...")
    personal_type = SavingType.query.filter_by(code='PERSONAL').first()
    ecd_type = SavingType.query.filter_by(code='ECD').first()
    social_type = SavingType.query.filter_by(code='SOCIAL').first()
    target_type = SavingType.query.filter_by(code='TARGET').first()
    
    # Create savings transactions across different months for filtering tests
    current_date = date.today()
    
    # Generate transactions for the past 6 months
    for month_offset in range(6):
        transaction_date = current_date - timedelta(days=30 * month_offset)
        
        # Create transactions for each member across different fund types
        for i, member in enumerate(all_members):
            # Personal savings (monthly)
            personal_amount = Decimal(str(50000 + (i * 10000)))  # Varying amounts
            
            # Create or get member saving record for personal
            member_saving = MemberSaving.query.filter_by(
                member_id=member.id, 
                saving_type_id=personal_type.id
            ).first()
            
            if not member_saving:
                member_saving = MemberSaving(
                    member_id=member.id,
                    saving_type_id=personal_type.id,
                    current_balance=Decimal('0')
                )
                db.session.add(member_saving)
                db.session.flush()
            
            # Create personal savings transaction
            saving_transaction = SavingTransaction(
                member_saving_id=member_saving.id,
                amount=personal_amount,
                transaction_type='DEPOSIT',
                processed_by=admin_user.id,
                description=f'Monthly personal savings - {transaction_date.strftime("%B %Y")}',
                mobile_money_provider='MTN' if i % 2 == 0 else 'Airtel',
                mobile_money_phone=member.phone,
                transaction_date=transaction_date
            )
            saving_transaction.balance_before = member_saving.current_balance
            saving_transaction.balance_after = member_saving.current_balance + personal_amount
            saving_transaction.status = 'VERIFIED'
            db.session.add(saving_transaction)
            
            # Update member saving balance
            member_saving.current_balance += personal_amount
            member.share_balance = member_saving.current_balance
            member.total_contributions = member_saving.current_balance
            
            # ECD Fund savings (only for women, every 2 months)
            if member.gender == 'F' and month_offset % 2 == 0:
                ecd_amount = Decimal(str(25000 + (i * 5000)))
                
                # Create or get ECD member saving record
                ecd_member_saving = MemberSaving.query.filter_by(
                    member_id=member.id, 
                    saving_type_id=ecd_type.id
                ).first()
                
                if not ecd_member_saving:
                    ecd_member_saving = MemberSaving(
                        member_id=member.id,
                        saving_type_id=ecd_type.id,
                        current_balance=Decimal('0')
                    )
                    db.session.add(ecd_member_saving)
                    db.session.flush()
                
                # Create ECD savings transaction
                ecd_transaction = SavingTransaction(
                    member_saving_id=ecd_member_saving.id,
                    amount=ecd_amount,
                    transaction_type='DEPOSIT',
                    processed_by=admin_user.id,
                    description=f'ECD Fund contribution - {transaction_date.strftime("%B %Y")}',
                    mobile_money_provider='MTN',
                    mobile_money_phone=member.phone,
                    transaction_date=transaction_date
                )
                ecd_transaction.balance_before = ecd_member_saving.current_balance
                ecd_transaction.balance_after = ecd_member_saving.current_balance + ecd_amount
                ecd_transaction.status = 'VERIFIED'
                db.session.add(ecd_transaction)
                
                # Update ECD balance
                ecd_member_saving.current_balance += ecd_amount
            
            # Social Fund savings (quarterly for officers)
            if member.role == 'OFFICER' and month_offset % 3 == 0:
                social_amount = Decimal(str(15000 + (i * 3000)))
                
                # Create or get Social member saving record
                social_member_saving = MemberSaving.query.filter_by(
                    member_id=member.id, 
                    saving_type_id=social_type.id
                ).first()
                
                if not social_member_saving:
                    social_member_saving = MemberSaving(
                        member_id=member.id,
                        saving_type_id=social_type.id,
                        current_balance=Decimal('0')
                    )
                    db.session.add(social_member_saving)
                    db.session.flush()
                
                # Create Social savings transaction
                social_transaction = SavingTransaction(
                    member_saving_id=social_member_saving.id,
                    amount=social_amount,
                    transaction_type='DEPOSIT',
                    processed_by=admin_user.id,
                    description=f'Social Fund contribution - {transaction_date.strftime("%B %Y")}',
                    mobile_money_provider='Airtel',
                    mobile_money_phone=member.phone,
                    transaction_date=transaction_date
                )
                social_transaction.balance_before = social_member_saving.current_balance
                social_transaction.balance_after = social_member_saving.current_balance + social_amount
                social_transaction.status = 'VERIFIED'
                db.session.add(social_transaction)
                
                # Update Social balance
                social_member_saving.current_balance += social_amount
    
    # Create calendar events for all transactions and activities
    print("📅 Creating calendar events for filtering...")
    # Import CalendarEvent here to avoid circular imports
    from project.api.models import CalendarEvent
    
    # Create calendar events for all saving transactions
    all_transactions = SavingTransaction.query.all()
    for transaction in all_transactions:
        member_saving = MemberSaving.query.get(transaction.member_saving_id)
        member = GroupMember.query.get(member_saving.member_id)
        saving_type = SavingType.query.get(member_saving.saving_type_id)
        
        calendar_event = CalendarEvent(
            title=f'{saving_type.name} - {transaction.amount:,.0f} UGX',
            description=f'{member.name} saved {transaction.amount:,.0f} UGX to {saving_type.name}',
            event_type='TRANSACTION',
            event_date=transaction.transaction_date or transaction.created_date.date(),
            group_id=member.group_id,
            user_id=member.user_id,
            amount=transaction.amount,
            fund_type=saving_type.code,
            verification_status=transaction.status,
            member_gender=member.gender,
            member_role=member.role,
            mobile_money_provider=transaction.mobile_money_provider
        )
        db.session.add(calendar_event)
    
    # Update group totals
    for group in [group1, group2, group3]:
        group_members = GroupMember.query.filter_by(group_id=group.id).all()
        group.members_count = len(group_members)
        
        # Calculate total savings for the group
        total_savings = Decimal('0')
        for member in group_members:
            member_savings = MemberSaving.query.filter_by(member_id=member.id).all()
            for ms in member_savings:
                total_savings += ms.current_balance
        
        group.savings_balance = total_savings
    
    # Create a Savings Groups Service Admin
    print("👨‍💼 Creating Savings Groups Service Admin...")
    from project.api.models import Service, ServiceAdmin
    
    # Get or create the Savings Groups service
    savings_service = Service.query.filter_by(name='Savings Groups').first()
    if not savings_service:
        savings_service = Service(
            name='Savings Groups',
            description='Community savings and group lending platform',
            endpoint_url='http://localhost:5000/savings-groups'
        )
        db.session.add(savings_service)
        db.session.flush()
    
    # Create service admin user
    service_admin = User(
        username='savings_admin',
        email='admin@savingsgroups.ug',
        password='admin123'
    )
    service_admin.admin = True
    service_admin.role = 'service_admin'
    db.session.add(service_admin)
    db.session.flush()
    
    # Assign service admin role
    admin_assignment = ServiceAdmin(
        user_id=service_admin.id,
        service_id=savings_service.id
    )
    db.session.add(admin_assignment)
    
    # Create additional savings transactions and meeting attendance
    print("📊 Creating additional financial data...")
    
    # Add ECD and Social fund savings for some members
    ecd_type = SavingType.query.filter_by(code='ECD').first()
    social_type = SavingType.query.filter_by(code='SOCIAL').first()
    
    # Sarah (Chair) - ECD Fund savings
    sarah_ecd = MemberSaving(member_id=members[0].id, saving_type_id=ecd_type.id)
    sarah_ecd.current_balance = Decimal('150000')
    db.session.add(sarah_ecd)
    db.session.flush()
    
    ecd_transaction = SavingTransaction(
        member_saving_id=sarah_ecd.id,
        amount=Decimal('150000'),
        transaction_type='DEPOSIT',
        processed_by=admin_user.id,
        description='ECD Fund contribution'
    )
    ecd_transaction.balance_before = Decimal('0')
    ecd_transaction.balance_after = Decimal('150000')
    ecd_transaction.status = 'VERIFIED'
    db.session.add(ecd_transaction)
    
    # Mary (Treasurer) - Social Fund savings
    mary_social = MemberSaving(member_id=members[1].id, saving_type_id=social_type.id)
    mary_social.current_balance = Decimal('75000')
    db.session.add(mary_social)
    db.session.flush()
    
    social_transaction = SavingTransaction(
        member_saving_id=mary_social.id,
        amount=Decimal('75000'),
        transaction_type='DEPOSIT',
        processed_by=admin_user.id,
        description='Social Fund contribution'
    )
    social_transaction.balance_before = Decimal('0')
    social_transaction.balance_after = Decimal('75000')
    social_transaction.status = 'VERIFIED'
    db.session.add(social_transaction)
    
    # Create meeting attendance records
    print("📅 Creating meeting attendance...")
    for week in range(8):  # 8 weeks of meetings
        meeting_date = date.today() - timedelta(weeks=week)
        for i, member in enumerate(members):
            # Most attend, occasional absences
            attended = True if (week + i) % 7 != 0 else False  # Some pattern of absences
            
            attendance = MeetingAttendance(
                group_id=group1.id,
                member_id=member.id,
                meeting_date=meeting_date,
                meeting_type='REGULAR',
                attended=attended,
                excuse_reason='Personal commitment' if not attended else None,
                recorded_by=service_admin.id
            )
            db.session.add(attendance)
    
    # Create some fines
    print("💸 Creating member fines...")
    fine1 = MemberFine(
        member_id=members[3].id,  # Alice
        amount=Decimal('5000'),
        reason='Missed meeting without prior notice',
        fine_type='MISSED_MEETING',
        imposed_by=service_admin.id,
        due_date=date.today() + timedelta(days=30)
    )
    fine1.status = 'PENDING'
    fine1.imposed_date = date.today() - timedelta(days=5)
    db.session.add(fine1)
    
    # Create loan assessment for Mary (good savings record)
    print("💳 Creating loan assessment...")
    loan_assessment = LoanAssessment(
        member_id=members[1].id,  # Mary
        total_savings=Decimal('475000'),  # Mary's total savings
        months_active=11,
        attendance_rate=Decimal('95'),
        payment_consistency=Decimal('90'),
        assessed_by=service_admin.id,
        outstanding_fines=Decimal('0')
    )
    loan_assessment.assessment_date = date.today() - timedelta(days=3)
    loan_assessment.eligibility_score = Decimal('90')
    loan_assessment.is_eligible = True
    loan_assessment.max_loan_amount = Decimal('300000')
    loan_assessment.recommended_term_months = 6
    loan_assessment.risk_level = 'LOW'
    loan_assessment.valid_until = date.today() + timedelta(days=87)
    loan_assessment.is_current = True
    db.session.add(loan_assessment)
    
    db.session.commit()
    
    print("✅ Demo data seeding completed successfully!")
    print(f"""
🎉 ENHANCED DEMO DATA SUMMARY:

👥 Users Created:
   - 1 Super Admin: superadmin@testdriven.io / superpassword123
   - 1 Savings Service Admin: admin@savingsgroups.ug / admin123
   - 8 Group Members: sarah@kampala.ug, mary@kampala.ug, etc. / password123

🏦 Savings Groups:
   - Kampala Women's Cooperative (5 active members)
   - Total Group Savings: UGX {group1.savings_balance + 150000 + 75000:,.0f}

💰 Financial Data:
   - Personal Savings: UGX {group1.savings_balance:,.0f}
   - ECD Fund: UGX 150,000 (Sarah)
   - Social Fund: UGX 75,000 (Mary)
   - 8 weeks of meeting attendance records
   - 1 unpaid fine (Alice - UGX 5,000)
   - 1 loan assessment (Mary - eligible for UGX 300,000)

👥 Member Roles:
   - Sarah Nakato: Chair (Officer)
   - Mary Nambi: Treasurer (Officer) 
   - Grace Mukasa: Secretary (Officer)
   - Alice Ssali: Member
   - Jane Nakirya: Member

🔐 LOGIN CREDENTIALS BY ROLE:
   Super Admin: superadmin@testdriven.io / superpassword123
   Service Admin: admin@savingsgroups.ug / admin123
   Group Chair: sarah@kampala.ug / password123
   Group Treasurer: mary@kampala.ug / password123
   Group Member: alice@kampala.ug / password123
    """)


@cli.command('create_super_admin')
def create_super_admin():
    """Creates a super admin user."""
    username = input("Enter super admin username: ")
    email = input("Enter super admin email: ")
    password = input("Enter super admin password: ")
    
    # Check if user already exists
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        print(f"❌ User with username '{username}' or email '{email}' already exists!")
        return
    
    # Create super admin
    super_admin = User(
        username=username,
        email=email,
        password=password
    )
    super_admin.role = 'super_admin'
    super_admin.is_super_admin = True
    super_admin.admin = True
    
    db.session.add(super_admin)
    db.session.commit()
    
    print(f"✅ Super admin '{username}' created successfully!")
    print(f"   Email: {email}")
    print(f"   Role: Super Admin")
    print(f"   Access: Full system access")


@cli.command('create_service_admin')
def create_service_admin():
    """Creates a service admin user."""
    from project.api.models import Service, ServiceAdmin
    
    username = input("Enter service admin username: ")
    email = input("Enter service admin email: ")
    password = input("Enter service admin password: ")
    
    # Show available services
    services = Service.query.all()
    if not services:
        print("❌ No services found! Please seed the database first.")
        return
    
    print("\nAvailable services:")
    for i, service in enumerate(services, 1):
        print(f"  {i}. {service.name} - {service.description}")
    
    service_choice = input("\nEnter service number to manage: ")
    try:
        service_index = int(service_choice) - 1
        selected_service = services[service_index]
    except (ValueError, IndexError):
        print("❌ Invalid service selection!")
        return
    
    # Check if user already exists
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        print(f"❌ User with username '{username}' or email '{email}' already exists!")
        return
    
    # Create service admin
    service_admin = User(
        username=username,
        email=email,
        password=password
    )
    service_admin.role = 'service_admin'
    service_admin.admin = True
    
    db.session.add(service_admin)
    db.session.commit()
    
    # Assign service admin role
    admin_assignment = ServiceAdmin(
        user_id=service_admin.id,
        service_id=selected_service.id
    )
    
    db.session.add(admin_assignment)
    db.session.commit()
    
    print(f"✅ Service admin '{username}' created successfully!")
    print(f"   Email: {email}")
    print(f"   Role: Service Admin")
    print(f"   Manages: {selected_service.name}")


@cli.command('list_admins')
def list_admins():
    """Lists all admin users in the system."""
    from project.api.models import Service, ServiceAdmin
    
    print("🔐 ADMIN USERS")
    print("=" * 50)
    
    # Super Admins
    super_admins = User.query.filter_by(is_super_admin=True).all()
    if super_admins:
        print("\n👑 SUPER ADMINS:")
        for admin in super_admins:
            print(f"   • {admin.username} ({admin.email})")
    
    # Service Admins
    service_admins = User.query.filter_by(role='service_admin').all()
    if service_admins:
        print("\n🛠️  SERVICE ADMINS:")
        for admin in service_admins:
            managed_services = [sa.service.name for sa in admin.managed_services]
            services_str = ", ".join(managed_services) if managed_services else "None"
            print(f"   • {admin.username} ({admin.email}) - Manages: {services_str}")
    
    # Regular Admins (legacy)
    regular_admins = User.query.filter_by(admin=True, is_super_admin=False, role='user').all()
    if regular_admins:
        print("\n📋 LEGACY ADMINS:")
        for admin in regular_admins:
            print(f"   • {admin.username} ({admin.email})")
    
    print(f"\nTotal admin users: {len(super_admins) + len(service_admins) + len(regular_admins)}")


@cli.command('grant_service_access')
def grant_service_access():
    """Grant a user access to a service."""
    from project.api.models import Service, UserServicePermission
    
    # Show users
    users = User.query.filter_by(role='user').all()
    if not users:
        print("❌ No regular users found!")
        return
    
    print("Available users:")
    for i, user in enumerate(users, 1):
        print(f"  {i}. {user.username} ({user.email})")
    
    user_choice = input("\nEnter user number: ")
    try:
        user_index = int(user_choice) - 1
        selected_user = users[user_index]
    except (ValueError, IndexError):
        print("❌ Invalid user selection!")
        return
    
    # Show services
    services = Service.query.all()
    print("\nAvailable services:")
    for i, service in enumerate(services, 1):
        print(f"  {i}. {service.name} - {service.description}")
    
    service_choice = input("\nEnter service number: ")
    try:
        service_index = int(service_choice) - 1
        selected_service = services[service_index]
    except (ValueError, IndexError):
        print("❌ Invalid service selection!")
        return
    
    # Get permissions
    print("\nAvailable permissions:")
    print("  1. read")
    print("  2. read,write")
    print("  3. read,write,delete")
    
    perm_choice = input("Enter permission level (1-3): ")
    perm_map = {
        '1': 'read',
        '2': 'read,write',
        '3': 'read,write,delete'
    }
    
    permissions = perm_map.get(perm_choice, 'read')
    
    # Check if permission already exists
    existing_perm = UserServicePermission.query.filter_by(
        user_id=selected_user.id,
        service_id=selected_service.id
    ).first()
    
    if existing_perm:
        existing_perm.permissions = permissions
        print(f"✅ Updated permissions for {selected_user.username} on {selected_service.name}")
    else:
        new_perm = UserServicePermission(
            user_id=selected_user.id,
            service_id=selected_service.id,
            permissions=permissions
        )
        db.session.add(new_perm)
        print(f"✅ Granted {permissions} access to {selected_user.username} for {selected_service.name}")
    
    db.session.commit()


@cli.command()
def test():
    """Runs the tests without code coverage"""
    tests = unittest.TestLoader().discover('project/tests', pattern='test*.py')
    result = unittest.TextTestRunner(verbosity=2).run(tests)
    if result.wasSuccessful():
        return 0
    sys.exit(result)


@cli.command()
def cov():
    """Runs the unit tests with coverage."""
    tests = unittest.TestLoader().discover('project/tests')
    result = unittest.TextTestRunner(verbosity=2).run(tests)
    if result.wasSuccessful():
        COV.stop()
        COV.save()
        print('\n' + '='*50)
        print('COVERAGE SUMMARY')
        print('='*50)
        COV.report()
        print('\n' + '='*50)
        print('HTML COVERAGE REPORT')
        print('='*50)
        COV.html_report(directory='htmlcov')
        print('HTML coverage report generated in htmlcov/ directory')
        print('Open htmlcov/index.html in your browser to view the detailed report')
        COV.erase()
        return 0
    sys.exit(result)


@cli.command()
def cov_report():
    """Generate coverage report without running tests."""
    COV.load()
    print('\n' + '='*50)
    print('COVERAGE SUMMARY')
    print('='*50)
    COV.report()
    COV.html_report(directory='htmlcov')
    print('\nHTML coverage report generated in htmlcov/ directory')


@cli.command()
def lint():
    """Run flake8 linting."""
    import subprocess
    print('Running flake8...')
    result = subprocess.run(['flake8', 'project'], capture_output=True, text=True)
    if result.returncode == 0:
        print('✅ No linting errors found!')
    else:
        print('❌ Linting errors found:')
        print(result.stdout)
    return result.returncode


@cli.command()
def format_code():
    """Format code with black and isort."""
    import subprocess
    print('Running isort...')
    subprocess.run(['isort', 'project'])
    print('Running black...')
    subprocess.run(['black', 'project'])
    print('✅ Code formatting complete!')


@cli.command()
def format_check():
    """Check if code is properly formatted."""
    import subprocess
    print('Checking isort...')
    isort_result = subprocess.run(['isort', '--check-only', 'project'], capture_output=True)
    print('Checking black...')
    black_result = subprocess.run(['black', '--check', 'project'], capture_output=True)

    if isort_result.returncode == 0 and black_result.returncode == 0:
        print('✅ Code is properly formatted!')
        return 0
    else:
        print('❌ Code formatting issues found. Run "python manage.py format-code" to fix.')
        return 1


@cli.command('reset_db')
def reset_db():
    """Drops and recreates the database with migrations."""
    print("🗑️  Dropping all tables...")
    db.drop_all()

    print("🔄 Running migrations...")
    try:
        from flask_migrate import upgrade
        upgrade()
        print("✅ Database reset complete!")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print("🔧 Creating tables directly...")
        db.create_all()
        db.session.commit()
        print("✅ Database created!")


@cli.command('validate_db')
def validate_db():
    """Validates database schema and migrations."""
    print("🔍 Validating database schema...")
    try:
        # Import and run validation script
        import subprocess
        result = subprocess.run([
            sys.executable, 'scripts/validate_migrations.py'
        ], capture_output=True, text=True)

        print(result.stdout)
        if result.stderr:
            print("Errors:", result.stderr)

        return result.returncode
    except Exception as e:
        print(f"❌ Validation failed: {e}")
        return 1


@cli.command('register_savings_service')
def register_savings_service():
    """Register the Savings Groups service in the system."""
    from project.api.models import Service
    
    # Check if service already exists
    existing_service = Service.query.filter_by(name='Savings Groups').first()
    if existing_service:
        print("✅ Savings Groups service already registered!")
        print(f"   ID: {existing_service.id}")
        print(f"   Description: {existing_service.description}")
        print(f"   Endpoint: {existing_service.endpoint_url}")
        return
    
    # Create the Savings Groups service
    savings_service = Service(
        name='Savings Groups',
        description='Community savings and group lending platform following VisionFund model',
        endpoint_url='http://localhost:5000/savings-groups'
    )
    
    db.session.add(savings_service)
    db.session.commit()
    
    print("🎉 Savings Groups service registered successfully!")
    print(f"   Service ID: {savings_service.id}")
    print(f"   Name: {savings_service.name}")
    print(f"   Description: {savings_service.description}")
    print(f"   Endpoint: {savings_service.endpoint_url}")
    print("\n📋 Next steps:")
    print("   1. Create service admin: python manage.py create-service-admin")
    print("   2. Users can request access via the admin panel")
    print("   3. Service admins can approve access requests")


@cli.command('register_notifications_service')
def register_notifications_service():
    """Register the Notifications service in the system."""
    from project.api.models import Service
    
    # Check if service already exists
    existing_service = Service.query.filter_by(name='Notifications').first()
    if existing_service:
        print("✅ Notifications service already registered!")
        print(f"   ID: {existing_service.id}")
        print(f"   Description: {existing_service.description}")
        print(f"   Endpoint: {existing_service.endpoint_url}")
        return
    
    # Create the Notifications service
    notifications_service = Service(
        name='Notifications',
        description='Cross-service notification system for user alerts and messaging',
        endpoint_url='http://localhost:5000/notifications'
    )
    
    db.session.add(notifications_service)
    db.session.commit()
    
    print("🎉 Notifications service registered successfully!")
    print(f"   Service ID: {notifications_service.id}")
    print(f"   Name: {notifications_service.name}")
    print(f"   Description: {notifications_service.description}")
    print(f"   Endpoint: {notifications_service.endpoint_url}")
    print("\n📋 Next steps:")
    print("   1. Create service admin: python manage.py create-service-admin")
    print("   2. Users can request access via the admin panel")
    print("   3. Service admins can approve access requests")


@cli.command('db_status')
def db_status():
    """Shows current database and migration status."""
    print("📊 Database Status:")
    print("-" * 40)

    try:
        # Check if tables exist
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()

        print(f"📋 Tables: {len(tables)}")
        for table in tables:
            print(f"  - {table}")

        # Check migration status
        try:
            from flask_migrate import current
            current_rev = current()
            print(f"🔄 Current migration: {current_rev}")
        except Exception:
            print("🔄 Migration status: Not available")

        # Check user count
        user_count = User.query.count()
        print(f"👥 Users in database: {user_count}")

        # Check services
        from project.api.models import Service
        services = Service.query.all()
        print(f"🔧 Services: {len(services)}")
        for service in services:
            print(f"  - {service.name}")

    except Exception as e:
        print(f"❌ Error checking status: {e}")


if __name__ == '__main__':
    cli()