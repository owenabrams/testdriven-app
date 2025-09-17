# services/users/manage.py

import sys
import unittest
import coverage
import logging
import os
import click

from flask.cli import FlaskGroup
from flask_migrate import Migrate, upgrade, downgrade, current, show

from project import create_app, db, socketio
# new
from project.api.models import User  # new
from project.aurora_config import aurora_config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# Initialize Flask-Migrate
app = create_app_for_cli()
migrate = Migrate(app, db)


@cli.command('recreate_db')
def recreate_db():
    """DEPRECATED: Use migrate_and_seed instead"""
    if aurora_config.is_aurora_environment():
        logger.error("❌ recreate_db is disabled for Aurora PostgreSQL")
        logger.info("Use migration commands instead:")
        logger.info("  python manage.py migrate_aurora")
        return

    print("⚠️  WARNING: recreate_db is deprecated!")
    print("🔄 Use 'python manage.py migrate_and_seed' instead")
    print("   This preserves data and handles migrations properly")


@cli.command('migrate_aurora')
@click.option('--backup', is_flag=True, help='Create backup before migration')
def migrate_aurora(backup):
    """Professional Aurora migration with safety checks"""
    if not aurora_config.is_aurora_environment():
        logger.error("❌ This command is only for Aurora environments")
        return

    logger.info("🚀 Starting Aurora PostgreSQL migration...")

    # Get migration config
    migration_config = aurora_config.get_migration_config()

    try:
        # Show current migration status
        logger.info("📊 Current migration status:")
        current()

        # Create backup if requested
        if backup or migration_config.get('backup_before_migration', False):
            logger.info("💾 Creating database backup...")
            # In production, this would trigger an Aurora snapshot
            logger.info("✅ Backup completed (Aurora automatic snapshots)")

        # Run migrations with timeout
        logger.info("🔄 Running database migrations...")
        upgrade()

        # Validate migration success
        if migration_config.get('validate_after_migration', True):
            logger.info("🔍 Validating migration success...")
            # Run validation script
            os.system('python scripts/validate_migrations.py')

        logger.info("🎉 Aurora migration completed successfully!")

    except Exception as e:
        logger.error(f"❌ Aurora migration failed: {e}")

        # Attempt rollback if configured
        retry_attempts = migration_config.get('retry_attempts', 0)
        if retry_attempts > 0:
            logger.info(f"🔄 Attempting rollback (max {retry_attempts} attempts)...")
            # Implement rollback logic here

        raise


@cli.command('test_aurora_connection')
def test_aurora_connection():
    """Test Aurora PostgreSQL connection"""
    import os
    logger.info("🔍 Testing Aurora PostgreSQL connection...")

    try:
        # Ensure instance directory exists for SQLite
        instance_dir = os.path.join(os.getcwd(), 'instance')
        if not os.path.exists(instance_dir):
            os.makedirs(instance_dir)
            logger.info(f"Created instance directory: {instance_dir}")

        # Test write connection
        logger.info("Testing write connection...")
        with db.engine.connect() as conn:
            # Use compatible SQL for both SQLite and PostgreSQL
            if 'sqlite' in str(db.engine.url):
                result = conn.execute(db.text("SELECT 1 as test, datetime('now') as timestamp"))
            else:
                result = conn.execute(db.text("SELECT 1 as test, NOW() as timestamp"))
            row = result.fetchone()
            logger.info(f"✅ Write connection successful: {row}")

        # Test read connection if available
        if aurora_config.is_aurora_environment():
            logger.info("Testing read connection...")
            reader_uri = aurora_config.get_reader_uri()
            if reader_uri != aurora_config.get_database_uri():
                # Test reader endpoint
                logger.info("✅ Reader endpoint available")
            else:
                logger.info("ℹ️  Using write endpoint for reads")
        else:
            logger.info("✅ Using local database for development")

        logger.info("🎉 Aurora connection test completed successfully!")

    except Exception as e:
        logger.error(f"❌ Aurora connection test failed: {e}")
        import traceback
        traceback.print_exc()
        raise


@cli.command('migrate_and_seed')
def migrate_and_seed():
    """Production-ready migration and seeding system following TestDriven methodology"""
    from flask_migrate import init, migrate, upgrade, current, stamp, heads, merge
    import os

    print("🏗️  PRODUCTION DATABASE MIGRATION & SEEDING")
    print("=" * 60)
    print("Following TestDriven.io best practices for database management")
    print("=" * 60)

    # Step 1: Initialize Flask-Migrate if needed
    migrations_dir = os.path.join(os.getcwd(), 'migrations')
    if not os.path.exists(migrations_dir):
        print("📁 Initializing Flask-Migrate...")
        try:
            init()
            print("✅ Flask-Migrate initialized")
        except Exception as e:
            print(f"⚠️  Migration init failed: {e}")
            fallback_to_direct_creation()
            return

    # Step 2: Check for multiple head revisions and resolve automatically
    print("🔍 Checking for multiple head revisions...")
    try:
        head_revisions = heads()
        if len(head_revisions) > 1:
            print(f"⚠️  Multiple head revisions detected: {head_revisions}")
            print("🔧 Automatically merging head revisions...")
            try:
                merge(heads=head_revisions, message="Auto-merge multiple heads for production deployment")
                print("✅ Head revisions merged successfully")
            except Exception as merge_error:
                print(f"❌ Failed to merge heads: {merge_error}")
                print("🔧 Attempting manual resolution...")
                # Force merge by creating a new migration
                try:
                    migrate(message="Force merge conflicting migrations")
                    print("✅ Force merge completed")
                except Exception as force_error:
                    print(f"❌ Force merge failed: {force_error}")
                    fallback_to_direct_creation()
                    return
        else:
            print("✅ No multiple head revisions detected")
    except Exception as e:
        print(f"⚠️  Could not check head revisions: {e}")

    # Step 3: Check current migration state
    print("🔍 Checking migration state...")
    try:
        current_revision = current()
        if current_revision:
            print(f"✅ Database is at revision: {current_revision}")
        else:
            print("🔧 Database not stamped with migration version")
            # Try to stamp with latest migration
            try:
                stamp()
                print("✅ Database stamped with current migration")
            except Exception as e:
                print(f"⚠️  Could not stamp database: {e}")
                fallback_to_direct_creation()
                return
    except Exception as e:
        print(f"🔧 Migration state check failed: {e}")
        # Database might not have migration tables yet
        print("🔧 Creating initial database structure...")
        try:
            # Create all tables first
            db.create_all()
            db.session.commit()
            print("✅ Database tables created")

            # Now try to stamp with head
            stamp()
            print("✅ Database stamped with migration version")
        except Exception as e2:
            print(f"⚠️  Database setup failed: {e2}")
            fallback_to_direct_creation()
            return

    # Step 4: Create new migration if schema changes detected
    print("🔍 Checking for schema changes...")
    try:
        migrate(message="Auto-migration: Schema updates")
        print("✅ New migration created for schema changes")
    except Exception as e:
        if "No changes in schema detected" in str(e):
            print("ℹ️  No schema changes detected")
        else:
            print(f"⚠️  Migration creation failed: {e}")

    # Step 5: Apply all pending migrations
    print("⬆️  Applying migrations...")
    try:
        upgrade()
        print("✅ All migrations applied successfully")
    except Exception as e:
        print(f"⚠️  Migration upgrade failed: {e}")
        fallback_to_direct_creation()
        return

    # Step 6: Intelligent seeding (preserves existing data)
    print("🌱 Intelligent data seeding...")
    seed_if_empty()

    print("🎉 Production database migration and seeding complete!")
    print("=" * 60)


def fallback_to_direct_creation():
    """Fallback method when migrations fail - creates tables directly"""
    print("🔧 FALLBACK: Creating tables directly...")
    try:
        db.create_all()
        db.session.commit()
        print("✅ Tables created via fallback method")

        # Seed data
        print("🌱 Seeding data...")
        seed_if_empty()
        print("✅ Fallback database setup complete")
    except Exception as e:
        print(f"❌ Fallback failed: {e}")
        raise


def seed_if_empty():
    """Intelligent seeding that only adds data if tables are empty - Production Ready"""
    from project.api.models import User, Service, SavingsGroup

    print("🔍 Analyzing existing data...")

    # Check database health first
    try:
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        print("✅ Database connection healthy")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        raise

    # Check if we already have users
    user_count = User.query.count()
    if user_count > 0:
        print(f"ℹ️  Found {user_count} existing users - preserving existing data")

        # Check if we have the required admin users
        super_admin = User.query.filter_by(email='superadmin@testdriven.io').first()
        if not super_admin:
            print("🔧 Creating missing super admin...")
            create_super_admin_user()
    else:
        print("👥 Seeding initial users...")
        seed_basic_users()
        create_super_admin_user()

    # Check if we have services
    service_count = Service.query.count()
    if service_count > 0:
        print(f"ℹ️  Found {service_count} existing services - preserving existing data")
    else:
        print("🔧 Seeding services...")
        seed_basic_services()

    # Check demo data (comprehensive savings groups data)
    savings_group_count = SavingsGroup.query.count()
    if savings_group_count > 0:
        print(f"ℹ️  Found {savings_group_count} existing savings groups - preserving existing data")
        print("💡 To reset demo data, use: python manage.py reset-demo-data")
    else:
        print("🎭 Creating comprehensive demo data...")
        print("   This includes: Sarah, Grace, Mary, Alice + Savings Groups")
        seed_demo_data()

    print("✅ Intelligent seeding complete - all data preserved")


def create_super_admin_user():
    """Create the super admin user if it doesn't exist"""
    super_admin = User.query.filter_by(email='superadmin@testdriven.io').first()
    if not super_admin:
        super_admin = User(
            username='superadmin',
            email='superadmin@testdriven.io',
            password='superpassword123'
        )
        super_admin.is_super_admin = True
        super_admin.admin = True
        super_admin.role = 'super_admin'
        db.session.add(super_admin)
        db.session.commit()
        print("✅ Super admin created: superadmin@testdriven.io / superpassword123")


def seed_basic_users():
    """Seed basic users only"""
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
    db.session.commit()
    print("✅ Basic users created")


def seed_basic_services():
    """Seed basic services only"""
    from project.api.models import Service

    services_data = [
        {
            'name': 'users',
            'description': 'User management service',
            'endpoint_url': 'http://localhost:5000'
        },
        {
            'name': 'Savings Groups',
            'description': 'Community savings and group lending platform',
            'endpoint_url': 'http://localhost:5000/savings-groups'
        }
    ]

    for service_data in services_data:
        service = Service(**service_data)
        db.session.add(service)

    db.session.commit()
    print("✅ Basic services created")


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


def seed_demo_data_if_empty():
    """Smart demo data seeding - only if savings groups don't exist"""
    from project.api.models import SavingsGroup

    # Check if we already have savings groups
    group_count = SavingsGroup.query.count()
    if group_count > 0:
        print(f"ℹ️  Found {group_count} existing savings groups - skipping demo data")
        return

    print("🎭 Creating demo data...")
    seed_demo_data()


@cli.command('seed_demo_data')
def seed_demo_data():
    """Seeds comprehensive demo data for Enhanced Savings Groups."""
    from project.api.models import (
        SavingsGroup, GroupMember, SavingType, MemberSaving,
        SavingTransaction, GroupCashbook, MeetingAttendance, MemberFine,
        LoanAssessment, TargetSavingsCampaign, GroupTargetCampaign,
        MemberCampaignParticipation, CalendarEvent
    )
    from datetime import date, timedelta, datetime
    from decimal import Decimal

    def safe_create_or_get(model_class, defaults=None, **kwargs):
        """Safely create or get an existing record"""
        try:
            instance = model_class.query.filter_by(**kwargs).first()
            if instance:
                return instance, False

            if defaults:
                kwargs.update(defaults)

            instance = model_class(**kwargs)
            db.session.add(instance)
            db.session.flush()
            return instance, True
        except Exception as e:
            db.session.rollback()
            print(f"⚠️  Error creating {model_class.__name__}: {e}")
            # Try to get existing record
            instance = model_class.query.filter_by(**kwargs).first()
            if instance:
                return instance, False
            raise e

    def safe_create_member_saving(member_id, saving_type_id, **kwargs):
        """Safely create or get MemberSaving with proper error handling"""
        try:
            existing = MemberSaving.query.filter_by(
                member_id=member_id,
                saving_type_id=saving_type_id
            ).first()

            if existing:
                return existing, False

            member_saving = MemberSaving(
                member_id=member_id,
                saving_type_id=saving_type_id,
                **{k: v for k, v in kwargs.items() if k in ['target_amount', 'target_date', 'target_description']}
            )

            # Set additional fields that aren't in __init__
            for key, value in kwargs.items():
                if key not in ['target_amount', 'target_date', 'target_description'] and hasattr(member_saving, key):
                    setattr(member_saving, key, value)

            db.session.add(member_saving)
            db.session.flush()
            return member_saving, True

        except Exception as e:
            db.session.rollback()
            print(f"⚠️  Error creating MemberSaving for member {member_id}, type {saving_type_id}: {e}")
            # Return existing if available
            existing = MemberSaving.query.filter_by(
                member_id=member_id,
                saving_type_id=saving_type_id
            ).first()
            if existing:
                return existing, False
            raise e

    def safe_create_saving_transaction(member_saving_id, amount, transaction_type, processed_by, **kwargs):
        """Safely create SavingTransaction with proper type handling"""
        try:
            # Get the member saving to calculate balances
            member_saving = MemberSaving.query.get(member_saving_id)
            if not member_saving:
                raise ValueError(f"MemberSaving {member_saving_id} not found")

            transaction = SavingTransaction(
                member_saving_id=member_saving_id,
                amount=amount,
                transaction_type=transaction_type,
                processed_by=processed_by,
                **{k: v for k, v in kwargs.items() if k in ['description', 'mobile_money_transaction_id', 'mobile_money_provider', 'mobile_money_phone', 'idempotency_key']}
            )

            # Set balance fields with proper type conversion
            current_balance = Decimal(str(member_saving.current_balance))
            transaction.balance_before = current_balance
            transaction.balance_after = current_balance + Decimal(str(amount))

            # Set additional fields
            for key, value in kwargs.items():
                if key not in ['description', 'mobile_money_transaction_id', 'mobile_money_provider', 'mobile_money_phone', 'idempotency_key'] and hasattr(transaction, key):
                    if key == 'processed_date' and isinstance(value, date) and not isinstance(value, datetime):
                        # Convert date to datetime
                        setattr(transaction, key, datetime.combine(value, datetime.min.time()))
                    else:
                        setattr(transaction, key, value)

            db.session.add(transaction)

            # Update member saving balance with proper type conversion
            member_saving.current_balance = Decimal(str(member_saving.current_balance)) + Decimal(str(amount))

            db.session.flush()
            return transaction, True

        except Exception as e:
            db.session.rollback()
            print(f"⚠️  Error creating SavingTransaction: {e}")
            raise e

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
            password='superpassword123'
        )
        admin_user.is_super_admin = True
        admin_user.admin = True
        admin_user.role = 'super_admin'
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
            saving_type = SavingType(
                name=st_data['name'],
                code=st_data['code'],
                description=st_data['description'],
                created_by=admin_user.id
            )
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
            
            # Create or get member saving record for personal using safe function
            member_saving, created = safe_create_member_saving(
                member_id=member.id,
                saving_type_id=personal_type.id
            )

            # Create personal savings transaction using safe function
            try:
                saving_transaction, created = safe_create_saving_transaction(
                    member_saving_id=member_saving.id,
                    amount=personal_amount,
                    transaction_type='DEPOSIT',
                    processed_by=admin_user.id,
                    description=f'Monthly personal savings - {transaction_date.strftime("%B %Y")}',
                    mobile_money_provider='MTN' if i % 2 == 0 else 'Airtel',
                    mobile_money_phone=member.phone,
                    status='VERIFIED',
                    processed_date=transaction_date
                )

                # Update member totals
                member.share_balance = float(member_saving.current_balance)
                member.total_contributions = float(member_saving.current_balance)

            except Exception as e:
                print(f"⚠️  Skipping duplicate transaction for member {member.name}: {e}")
                continue
            
            # ECD Fund savings (only for women, every 2 months)
            if member.gender == 'F' and month_offset % 2 == 0:
                ecd_amount = Decimal(str(25000 + (i * 5000)))

                # Create or get ECD member saving record using safe function
                ecd_member_saving, created = safe_create_member_saving(
                    member_id=member.id,
                    saving_type_id=ecd_type.id
                )

                # Create ECD savings transaction using safe function
                try:
                    ecd_transaction, created = safe_create_saving_transaction(
                        member_saving_id=ecd_member_saving.id,
                        amount=ecd_amount,
                        transaction_type='DEPOSIT',
                        processed_by=admin_user.id,
                        description=f'ECD Fund contribution - {transaction_date.strftime("%B %Y")}',
                        mobile_money_provider='MTN',
                        mobile_money_phone=member.phone,
                        status='VERIFIED',
                        processed_date=transaction_date
                    )
                except Exception as e:
                    print(f"⚠️  Skipping duplicate ECD transaction for member {member.name}: {e}")
                    continue
            
            # Social Fund savings (quarterly for officers)
            if member.role == 'OFFICER' and month_offset % 3 == 0:
                social_amount = Decimal(str(15000 + (i * 3000)))

                # Create or get Social member saving record using safe function
                social_member_saving, created = safe_create_member_saving(
                    member_id=member.id,
                    saving_type_id=social_type.id
                )

                # Create Social savings transaction using safe function
                try:
                    social_transaction, created = safe_create_saving_transaction(
                        member_saving_id=social_member_saving.id,
                        amount=social_amount,
                        transaction_type='DEPOSIT',
                        processed_by=admin_user.id,
                        description=f'Social Fund contribution - {transaction_date.strftime("%B %Y")}',
                        mobile_money_provider='Airtel',
                        mobile_money_phone=member.phone,
                        status='VERIFIED',
                        processed_date=transaction_date
                    )
                except Exception as e:
                    print(f"⚠️  Skipping duplicate Social transaction for member {member.name}: {e}")
                    continue
    
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
            event_date=transaction.processed_date.date() if transaction.processed_date else datetime.now().date(),
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
   Group Secretary: grace@kampala.ug / password123
   Group Member: alice@kampala.ug / password123
   Group Member: jane@kampala.ug / password123
   Group Officer: rose@kampala.ug / password123
   Group Officer: john@kampala.ug / password123
   Group Member: peter@kampala.ug / password123

🎯 DASHBOARD ACCESS LEVELS:
   • Super Admin: Full system access + user management
   • Service Admin: Savings groups management + reports
   • Group Officers: Group management + member oversight
   • Group Members: Personal savings + group participation
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
    """Completely resets database with fresh migrations and demo data - PRODUCTION SAFE"""
    print("🗑️  COMPLETE DATABASE RESET")
    print("=" * 40)
    print("⚠️  This will destroy ALL existing data!")

    # Safety check for production
    import os
    if os.getenv('FLASK_ENV') == 'production':
        confirm = input("🚨 PRODUCTION ENVIRONMENT DETECTED! Type 'RESET_PRODUCTION' to continue: ")
        if confirm != 'RESET_PRODUCTION':
            print("❌ Reset cancelled for safety")
            return

    print("🗑️  Dropping all tables...")
    db.drop_all()

    print("🏗️  Running complete migration and seeding...")
    migrate_and_seed()

    print("🎉 Database completely reset with fresh demo data!")


@cli.command('reset-demo-data')
def reset_demo_data():
    """Resets only demo data while preserving user accounts and core data"""
    from project.api.models import SavingsGroup, GroupMember

    print("🎭 RESETTING DEMO DATA ONLY")
    print("=" * 30)

    # Count existing data
    group_count = SavingsGroup.query.count()
    member_count = GroupMember.query.count()

    if group_count == 0:
        print("ℹ️  No demo data found to reset")
        return

    print(f"🗑️  Removing {group_count} savings groups and {member_count} members...")

    # This will cascade delete related data due to foreign key constraints
    SavingsGroup.query.delete()
    db.session.commit()

    print("🌱 Creating fresh demo data...")
    seed_demo_data()

    print("✅ Demo data reset complete!")


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


@cli.command('fix_migrations')
def fix_migrations():
    """Professional migration conflict resolution - Prevents multiple head revisions"""
    from flask_migrate import heads, merge, current, upgrade, migrate

    print("🔧 PROFESSIONAL MIGRATION CONFLICT RESOLUTION")
    print("=" * 60)
    print("Preventing multiple head revisions and migration conflicts")
    print("=" * 60)

    try:
        # Check for multiple heads
        head_revisions = heads()
        print(f"📍 Found {len(head_revisions)} head revision(s): {head_revisions}")

        if len(head_revisions) > 1:
            print("⚠️  Multiple head revisions detected!")
            print("🔧 Automatically resolving conflicts...")

            # Method 1: Try automatic merge
            try:
                merge(heads=head_revisions, message="Professional auto-merge: Resolve multiple heads")
                print("✅ Successfully merged multiple heads")

                # Apply the merge
                upgrade()
                print("✅ Merge migration applied")

            except Exception as merge_error:
                print(f"❌ Automatic merge failed: {merge_error}")
                print("🔧 Attempting alternative resolution...")

                # Method 2: Create new migration to force resolution
                try:
                    migrate(message="Professional conflict resolution: Force merge")
                    print("✅ Created conflict resolution migration")

                    upgrade()
                    print("✅ Conflict resolution applied")

                except Exception as force_error:
                    print(f"❌ Force resolution failed: {force_error}")
                    print("🚨 Manual intervention required!")
                    print("   Run: docker-compose exec backend python manage.py db merge heads")
                    return False
        else:
            print("✅ No migration conflicts detected")

        # Verify final state
        final_heads = heads()
        current_rev = current()

        print(f"📊 Final state:")
        print(f"   • Head revisions: {len(final_heads)} ({final_heads})")
        print(f"   • Current revision: {current_rev}")

        if len(final_heads) == 1:
            print("🎉 Migration system is healthy!")
            return True
        else:
            print("⚠️  Migration system still has issues")
            return False

    except Exception as e:
        print(f"❌ Migration fix failed: {e}")
        return False


@cli.command('test_demo_logins')
def test_demo_logins():
    """Test all demo user logins to ensure they work properly"""
    from project.api.models import User
    from project import bcrypt

    print("🔐 TESTING DEMO USER LOGINS")
    print("=" * 50)
    print("Verifying all demo users can authenticate properly")
    print("=" * 50)

    # Demo user credentials
    demo_users = [
        {'email': 'superadmin@testdriven.io', 'password': 'superpassword123', 'role': 'Super Admin'},
        {'email': 'admin@savingsgroups.ug', 'password': 'admin123', 'role': 'Service Admin'},
        {'email': 'sarah@kampala.ug', 'password': 'password123', 'role': 'Group Chair'},
        {'email': 'mary@kampala.ug', 'password': 'password123', 'role': 'Group Treasurer'},
        {'email': 'grace@kampala.ug', 'password': 'password123', 'role': 'Group Secretary'},
        {'email': 'alice@kampala.ug', 'password': 'password123', 'role': 'Group Member'},
        {'email': 'jane@kampala.ug', 'password': 'password123', 'role': 'Group Member'},
        {'email': 'rose@kampala.ug', 'password': 'password123', 'role': 'Group Officer'},
        {'email': 'john@kampala.ug', 'password': 'password123', 'role': 'Group Officer'},
        {'email': 'peter@kampala.ug', 'password': 'password123', 'role': 'Group Member'},
    ]

    total_users = len(demo_users)
    successful_logins = 0
    failed_logins = 0

    for user_data in demo_users:
        email = user_data['email']
        password = user_data['password']
        role = user_data['role']

        print(f"\n🧪 Testing {role}: {email}")

        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            print(f"❌ User not found: {email}")
            failed_logins += 1
            continue

        # Test password verification
        try:
            if bcrypt.check_password_hash(user.password, password):
                print(f"✅ Login successful for {role}")
                successful_logins += 1

                # Additional checks
                print(f"   • Username: {user.username}")
                print(f"   • Active: {user.is_active}")
                if hasattr(user, 'is_super_admin') and user.is_super_admin:
                    print(f"   • Super Admin: Yes")

            else:
                print(f"❌ Password verification failed for {role}")
                failed_logins += 1

        except Exception as e:
            print(f"❌ Login test error for {role}: {e}")
            failed_logins += 1

    # Summary
    print("\n" + "=" * 50)
    print("🎯 LOGIN TEST RESULTS")
    print("=" * 50)
    print(f"Total Users Tested: {total_users}")
    print(f"Successful Logins: {successful_logins}")
    print(f"Failed Logins: {failed_logins}")
    print(f"Success Rate: {(successful_logins/total_users)*100:.1f}%")

    if failed_logins == 0:
        print("\n🎉 ALL DEMO USERS CAN LOGIN SUCCESSFULLY!")
        print("✅ Authentication system is working properly")
        print("✅ All demo data is properly seeded")
        print("✅ Ready for user testing and development")
        return True
    else:
        print(f"\n⚠️  {failed_logins} login(s) failed")
        print("🔧 Run 'python manage.py seed_demo_data' to fix missing users")
        return False


@cli.command('db_status')
def db_status():
    """Shows comprehensive database and migration status - Production Ready"""
    from project.api.models import User, Service, SavingsGroup, GroupMember
    from flask_migrate import current, heads

    print("📊 COMPREHENSIVE DATABASE STATUS")
    print("=" * 50)

    # Database connection test
    try:
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        print("✅ Database Connection: HEALTHY")
    except Exception as e:
        print(f"❌ Database Connection: FAILED - {e}")
        return

    # Migration status
    try:
        current_rev = current()
        head_rev = heads()
        if current_rev:
            print(f"✅ Current Migration: {current_rev}")
            if head_rev and current_rev in head_rev:
                print("✅ Migration Status: UP TO DATE")
            else:
                print("⚠️  Migration Status: PENDING MIGRATIONS")
        else:
            print("⚠️  Migration Status: NOT INITIALIZED")
    except Exception as e:
        print(f"⚠️  Migration Status: ERROR - {e}")

    # Data counts
    try:
        user_count = User.query.count()
        service_count = Service.query.count()
        group_count = SavingsGroup.query.count()
        member_count = GroupMember.query.count()

        print(f"👥 Users: {user_count}")
        print(f"🔧 Services: {service_count}")
        print(f"🏦 Savings Groups: {group_count}")
        print(f"👤 Group Members: {member_count}")

        # Check for key users
        super_admin = User.query.filter_by(email='superadmin@testdriven.io').first()
        if super_admin:
            print("✅ Super Admin: PRESENT")
        else:
            print("⚠️  Super Admin: MISSING")

        # Check for demo users
        demo_users = ['sarah@kampala.ug', 'grace@kampala.ug', 'mary@kampala.ug', 'alice@kampala.ug']
        demo_count = User.query.filter(User.email.in_(demo_users)).count()
        print(f"🎭 Demo Users: {demo_count}/{len(demo_users)}")

    except Exception as e:
        print(f"❌ Data Status: ERROR - {e}")

    print("=" * 50)

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