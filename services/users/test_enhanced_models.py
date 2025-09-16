#!/usr/bin/env python3
"""
Test script for enhanced savings group models
"""

import os
import sys
from datetime import date, timedelta
from decimal import Decimal

# Add the project directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'project'))

# Set up proper test environment
os.environ['APP_SETTINGS'] = 'project.config.TestingConfig'
os.environ['DATABASE_TEST_URL'] = 'sqlite:///test.db'
os.environ['SECRET_KEY'] = 'my_precious'
os.environ['FLASK_ENV'] = 'testing'

from project import create_app, db
from project.api.models import *
from project.api.cashbook_service import CashbookService
from project.api.loan_assessment_service import LoanAssessmentService


def test_enhanced_models():
    """Test the enhanced savings group models"""
    
    app, socketio = create_app()
    
    with app.app_context():
        print("Testing enhanced savings group models...")
        
        try:
            # Test 1: Create a savings group with required fields
            print("\n1. Testing enhanced SavingsGroup model...")
            
            # Create a test user first
            test_user = User.query.filter_by(username='testuser').first()
            if not test_user:
                test_user = User(
                    username='testuser',
                    email='test@example.com',
                    password='testpassword'
                )
                db.session.add(test_user)
                db.session.flush()
            
            # Create group with required location fields
            test_group = SavingsGroup(
                name='Test Enhanced Group',
                description='Testing enhanced features',
                district='Test District',
                parish='Test Parish',
                village='Test Village',
                country='Uganda',
                region='Central',
                formation_date=date.today() - timedelta(days=30),
                created_by=test_user.id,
                target_amount=Decimal('5000.00')
            )
            
            db.session.add(test_group)
            db.session.flush()
            print("✓ Enhanced SavingsGroup created successfully")
            
            # Test 2: Create group member
            print("\n2. Testing GroupMember model...")
            
            test_member = GroupMember(
                group_id=test_group.id,
                user_id=test_user.id,
                name='Test Member',
                gender='M',
                phone='+256701234567',
                role='MEMBER'
            )
            
            db.session.add(test_member)
            test_group.members_count += 1
            db.session.flush()
            print("✓ GroupMember created successfully")
            
            # Test 3: Create saving types
            print("\n3. Testing SavingType model...")
            
            saving_type = SavingType(
                name='Test Personal Savings',
                code='TEST_PERSONAL',
                created_by=test_user.id,
                description='Test personal savings type',
                minimum_amount=Decimal('1.00')
            )
            
            db.session.add(saving_type)
            db.session.flush()
            print("✓ SavingType created successfully")
            
            # Test 4: Create member saving
            print("\n4. Testing MemberSaving model...")
            
            member_saving = MemberSaving(
                member_id=test_member.id,
                saving_type_id=saving_type.id,
                target_amount=Decimal('1000.00'),
                target_date=date.today() + timedelta(days=365)
            )
            
            db.session.add(member_saving)
            db.session.flush()
            print("✓ MemberSaving created successfully")
            
            # Test 5: Create saving transaction
            print("\n5. Testing SavingTransaction model...")
            
            saving_transaction = SavingTransaction(
                member_saving_id=member_saving.id,
                amount=Decimal('100.00'),
                transaction_type='DEPOSIT',
                processed_by=test_user.id,
                mobile_money_transaction_id='TEST123456',
                mobile_money_provider='MTN',
                balance_before=Decimal('0.00'),
                balance_after=Decimal('100.00')
            )
            
            db.session.add(saving_transaction)
            member_saving.current_balance = Decimal('100.00')
            db.session.flush()
            print("✓ SavingTransaction created successfully")
            
            # Test 6: Create cashbook entry
            print("\n6. Testing GroupCashbook model...")
            
            cashbook_entry = GroupCashbook(
                group_id=test_group.id,
                member_id=test_member.id,
                transaction_date=date.today(),
                description='Test deposit',
                entry_type='DEPOSIT',
                created_by=test_user.id
            )
            
            cashbook_entry.individual_saving = Decimal('100.00')
            cashbook_entry.individual_balance = Decimal('100.00')
            cashbook_entry.calculate_total_balance()
            
            db.session.add(cashbook_entry)
            db.session.flush()
            print("✓ GroupCashbook created successfully")
            
            # Test 7: Create meeting attendance
            print("\n7. Testing MeetingAttendance model...")
            
            attendance = MeetingAttendance(
                group_id=test_group.id,
                member_id=test_member.id,
                meeting_date=date.today(),
                recorded_by=test_user.id,
                attended=True
            )
            
            db.session.add(attendance)
            db.session.flush()
            print("✓ MeetingAttendance created successfully")
            
            # Test 8: Create member fine
            print("\n8. Testing MemberFine model...")
            
            fine = MemberFine(
                member_id=test_member.id,
                amount=Decimal('5.00'),
                reason='Test fine for late attendance',
                fine_type='LATE_ATTENDANCE',
                imposed_by=test_user.id,
                due_date=date.today() + timedelta(days=7)
            )
            
            db.session.add(fine)
            db.session.flush()
            print("✓ MemberFine created successfully")
            
            # Test 9: Create loan assessment
            print("\n9. Testing LoanAssessment model...")
            
            assessment = LoanAssessment(
                member_id=test_member.id,
                total_savings=Decimal('100.00'),
                months_active=1,
                attendance_rate=Decimal('100.00'),
                payment_consistency=Decimal('100.00'),
                assessed_by=test_user.id
            )
            
            db.session.add(assessment)
            db.session.flush()
            print("✓ LoanAssessment created successfully")
            print(f"  - Eligibility Score: {assessment.eligibility_score}")
            print(f"  - Is Eligible: {assessment.is_eligible}")
            print(f"  - Max Loan Amount: {assessment.max_loan_amount}")
            print(f"  - Risk Level: {assessment.risk_level}")
            
            # Test 10: Create group loan
            print("\n10. Testing GroupLoan model...")
            
            loan = GroupLoan(
                group_id=test_group.id,
                principal=Decimal('500.00'),
                term_months=6,
                interest_rate_annual=Decimal('18.00'),
                requested_by=test_member.id,
                purpose='Test loan for business'
            )
            
            db.session.add(loan)
            db.session.flush()
            print("✓ GroupLoan created successfully")
            print(f"  - Monthly Payment: {loan.calculate_monthly_payment():.2f}")
            
            # Test 11: Create loan repayment schedule
            print("\n11. Testing LoanRepaymentSchedule model...")
            
            schedule_item = LoanRepaymentSchedule(
                loan_id=loan.id,
                installment_number=1,
                due_date=date.today() + timedelta(days=30),
                principal_amount=Decimal('80.00'),
                interest_amount=Decimal('7.50')
            )
            
            db.session.add(schedule_item)
            db.session.flush()
            print("✓ LoanRepaymentSchedule created successfully")
            
            # Test 12: Test service methods
            print("\n12. Testing service methods...")
            
            # Test cashbook service
            financial_summary = CashbookService.get_group_financial_summary(test_group.id)
            print(f"✓ Financial Summary: Total Balance = {financial_summary['total_balance']}")
            
            # Test loan assessment service
            metrics = LoanAssessmentService.calculate_member_metrics(test_member.id)
            print(f"✓ Member Metrics: Total Savings = {metrics['total_savings']}")
            
            # Test model relationships
            print("\n13. Testing model relationships...")
            
            # Test group relationships
            assert len(test_group.members) > 0, "Group should have members"
            assert len(test_group.cashbook_entries) > 0, "Group should have cashbook entries"
            print("✓ Group relationships working")
            
            # Test member relationships
            assert len(test_member.savings) > 0, "Member should have savings"
            assert len(test_member.fines) > 0, "Member should have fines"
            assert len(test_member.loan_assessments) > 0, "Member should have assessments"
            print("✓ Member relationships working")
            
            # Test JSON serialization
            print("\n14. Testing JSON serialization...")
            
            group_json = test_group.to_json()
            assert 'district' in group_json, "Group JSON should include district"
            assert 'parish' in group_json, "Group JSON should include parish"
            assert 'village' in group_json, "Group JSON should include village"
            print("✓ Enhanced Group JSON serialization working")
            
            cashbook_json = cashbook_entry.to_json()
            assert 'individual_saving' in cashbook_json, "Cashbook JSON should include individual_saving"
            assert 'total_balance' in cashbook_json, "Cashbook JSON should include total_balance"
            print("✓ Cashbook JSON serialization working")
            
            assessment_json = assessment.to_json()
            assert 'eligibility_score' in assessment_json, "Assessment JSON should include eligibility_score"
            assert 'risk_level' in assessment_json, "Assessment JSON should include risk_level"
            print("✓ Assessment JSON serialization working")
            
            # Commit all changes
            db.session.commit()
            
            print("\n🎉 All enhanced model tests passed successfully!")
            print("\nTest Summary:")
            print("- Enhanced SavingsGroup with location fields ✓")
            print("- Multiple saving types and member savings ✓")
            print("- Mobile money transaction support ✓")
            print("- Comprehensive cashbook system ✓")
            print("- Meeting attendance tracking ✓")
            print("- Member fines management ✓")
            print("- Automated loan assessment ✓")
            print("- Loan repayment scheduling ✓")
            print("- Service layer methods ✓")
            print("- Model relationships ✓")
            print("- JSON serialization ✓")
            
            return True
            
        except Exception as e:
            print(f"❌ Test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            db.session.rollback()
            return False


if __name__ == '__main__':
    success = test_enhanced_models()
    sys.exit(0 if success else 1)