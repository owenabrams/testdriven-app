#!/usr/bin/env python3
"""
Test runner for meeting activities functionality
"""

import os
import sys
import unittest
from datetime import datetime

# Add the project directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'project'))

def run_activity_tests():
    """Run all activity-related tests"""
    print("=" * 60)
    print("🧪 RUNNING MEETING ACTIVITIES TESTS")
    print("=" * 60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Discover and run tests
    loader = unittest.TestLoader()
    start_dir = os.path.join(os.path.dirname(__file__), 'project', 'tests')
    
    # Load specific test module
    try:
        suite = loader.loadTestsFromName('test_meeting_activities', start_dir)
        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Tests run: {result.testsRun}")
        print(f"Failures: {len(result.failures)}")
        print(f"Errors: {len(result.errors)}")
        print(f"Skipped: {len(result.skipped) if hasattr(result, 'skipped') else 0}")
        
        if result.failures:
            print("\n❌ FAILURES:")
            for test, traceback in result.failures:
                print(f"  - {test}: {traceback}")
        
        if result.errors:
            print("\n💥 ERRORS:")
            for test, traceback in result.errors:
                print(f"  - {test}: {traceback}")
        
        if result.wasSuccessful():
            print("\n✅ ALL TESTS PASSED!")
            return True
        else:
            print("\n❌ SOME TESTS FAILED!")
            return False
            
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return False

def validate_system_components():
    """Validate that all system components are properly set up"""
    print("🔍 VALIDATING SYSTEM COMPONENTS")
    print("-" * 40)
    
    components = [
        ('Database Models', 'project/api/meeting_models.py'),
        ('API Endpoints', 'project/api/meeting_activities_api.py'),
        ('Frontend Components', '../client/src/components/Meetings/ActivityTracker.js'),
        ('Test Suite', 'project/tests/test_meeting_activities.py')
    ]
    
    all_valid = True
    for name, path in components:
        full_path = os.path.join(os.path.dirname(__file__), path)
        if os.path.exists(full_path):
            print(f"✅ {name}: Found")
        else:
            print(f"❌ {name}: Missing ({path})")
            all_valid = False
    
    print()
    return all_valid

def check_database_setup():
    """Check if database models are properly configured"""
    print("🗄️  CHECKING DATABASE SETUP")
    print("-" * 40)
    
    try:
        # Import models to check for syntax errors
        from project.api.meeting_models import (
            MeetingActivity, MemberActivityParticipation, 
            ActivityDocument, ActivityTransaction
        )
        print("✅ Database models imported successfully")
        
        # Check model relationships
        activity = MeetingActivity()
        print("✅ MeetingActivity model instantiated")
        
        participation = MemberActivityParticipation()
        print("✅ MemberActivityParticipation model instantiated")
        
        document = ActivityDocument()
        print("✅ ActivityDocument model instantiated")
        
        transaction = ActivityTransaction()
        print("✅ ActivityTransaction model instantiated")
        
        print("✅ All database models are properly configured")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Model configuration error: {e}")
        return False

def main():
    """Main test execution function"""
    print("🚀 ENHANCED MEETING ACTIVITIES SYSTEM - TEST SUITE")
    print("=" * 60)
    print()
    
    # Step 1: Validate components
    if not validate_system_components():
        print("❌ System validation failed. Please ensure all components are in place.")
        return False
    
    print()
    
    # Step 2: Check database setup
    if not check_database_setup():
        print("❌ Database setup validation failed.")
        return False
    
    print()
    
    # Step 3: Run tests
    success = run_activity_tests()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ENHANCED MEETING ACTIVITIES SYSTEM - READY FOR PRODUCTION!")
        print("✅ All tests passed")
        print("✅ All components validated")
        print("✅ Database models configured")
        print("\n📋 NEXT STEPS:")
        print("1. Deploy the backend API endpoints")
        print("2. Build and deploy the frontend components")
        print("3. Run database migrations")
        print("4. Test with real user data")
    else:
        print("❌ SYSTEM NOT READY - PLEASE FIX ISSUES ABOVE")
    
    print("=" * 60)
    return success

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
