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
    
    db.session.add(users_service)
    db.session.add(orders_service)
    db.session.add(products_service)
    
    db.session.commit()


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

    except Exception as e:
        print(f"❌ Error checking status: {e}")


if __name__ == '__main__':
    cli()