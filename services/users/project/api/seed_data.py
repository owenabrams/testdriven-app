"""
Seed data for savings group system
"""

from project import db
from project.api.models import SavingType, User


def create_default_saving_types():
    """Create default saving types for the system"""
    
    # Get or create a system user for creating default data
    system_user = User.query.filter_by(username='system').first()
    if not system_user:
        # Create system user if it doesn't exist
        from project import bcrypt
        system_user = User(
            username='system',
            email='system@savingsgroups.com',
            password='system_password_change_me'
        )
        system_user.is_super_admin = True
        system_user.role = 'super_admin'
        db.session.add(system_user)
        db.session.flush()
    
    default_saving_types = [
        {
            'name': 'Personal Savings',
            'code': 'PERSONAL',
            'description': 'Individual member savings for personal use',
            'requires_target': False,
            'allows_withdrawal': True,
            'minimum_amount': 1.00,
            'maximum_amount': None
        },
        {
            'name': 'Early Childhood Development Fund',
            'code': 'ECD',
            'description': 'Collective fund for early childhood development programs',
            'requires_target': False,
            'allows_withdrawal': False,
            'minimum_amount': 0.50,
            'maximum_amount': None
        },
        {
            'name': 'Social Fund',
            'code': 'SOCIAL',
            'description': 'Emergency fund for member assistance during crises',
            'requires_target': False,
            'allows_withdrawal': False,
            'minimum_amount': 0.25,
            'maximum_amount': None
        },
        {
            'name': 'Target Savings',
            'code': 'TARGET',
            'description': 'Goal-oriented savings with specific targets set by admin',
            'requires_target': True,
            'allows_withdrawal': True,
            'minimum_amount': 1.00,
            'maximum_amount': None
        }
    ]
    
    created_types = []
    
    for saving_type_data in default_saving_types:
        # Check if saving type already exists
        existing_type = SavingType.query.filter_by(code=saving_type_data['code']).first()
        
        if not existing_type:
            saving_type = SavingType(
                name=saving_type_data['name'],
                code=saving_type_data['code'],
                created_by=system_user.id,
                description=saving_type_data['description'],
                requires_target=saving_type_data['requires_target'],
                allows_withdrawal=saving_type_data['allows_withdrawal'],
                minimum_amount=saving_type_data['minimum_amount'],
                maximum_amount=saving_type_data['maximum_amount']
            )
            
            db.session.add(saving_type)
            created_types.append(saving_type)
    
    if created_types:
        db.session.commit()
        print(f"Created {len(created_types)} default saving types")
    else:
        print("All default saving types already exist")
    
    return created_types


def create_sample_group_data():
    """Create sample group data for testing"""
    from datetime import date, timedelta
    from project.api.models import SavingsGroup, GroupMember
    
    # Get system user
    system_user = User.query.filter_by(username='system').first()
    if not system_user:
        print("System user not found. Run create_default_saving_types() first.")
        return
    
    # Create sample group if it doesn't exist
    sample_group = SavingsGroup.query.filter_by(name='Sample Savings Group').first()
    
    if not sample_group:
        sample_group = SavingsGroup(
            name='Sample Savings Group',
            description='A sample savings group for testing purposes',
            district='Kampala',
            parish='Central',
            village='Test Village',
            country='Uganda',
            region='Central',
            formation_date=date.today() - timedelta(days=180),  # 6 months ago
            created_by=system_user.id,
            target_amount=10000.00
        )
        sample_group.minimum_contribution = 5.00
        
        db.session.add(sample_group)
        db.session.flush()
        
        # Create sample members
        sample_members_data = [
            {'name': 'Alice Nakato', 'gender': 'F', 'phone': '+256701234567'},
            {'name': 'Bob Mukasa', 'gender': 'M', 'phone': '+256702345678'},
            {'name': 'Carol Nambi', 'gender': 'F', 'phone': '+256703456789'},
            {'name': 'David Ssali', 'gender': 'M', 'phone': '+256704567890'},
            {'name': 'Eve Namusoke', 'gender': 'F', 'phone': '+256705678901'}
        ]
        
        for i, member_data in enumerate(sample_members_data):
            member = GroupMember(
                group_id=sample_group.id,
                user_id=system_user.id,  # Using system user for simplicity
                name=member_data['name'],
                gender=member_data['gender'],
                phone=member_data['phone'],
                role='FOUNDER' if i == 0 else 'MEMBER'
            )
            
            db.session.add(member)
            sample_group.members_count += 1
        
        # Set first member as chair
        db.session.flush()
        first_member = GroupMember.query.filter_by(group_id=sample_group.id).first()
        if first_member:
            sample_group.chair_member_id = first_member.id
        
        sample_group.update_state()
        
        db.session.commit()
        print(f"Created sample group '{sample_group.name}' with {len(sample_members_data)} members")
    else:
        print("Sample group already exists")
    
    return sample_group


if __name__ == '__main__':
    """Run this script to seed the database with default data"""
    print("Seeding database with default data...")
    
    # Create default saving types
    create_default_saving_types()
    
    # Create sample group data
    create_sample_group_data()
    
    print("Database seeding completed!")