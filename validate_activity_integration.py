#!/usr/bin/env python3
"""
Validate Enhanced Meeting Activities System Integration
"""

import os
import sys
import json

def check_file_exists(file_path, description):
    """Check if a file exists and report status"""
    if os.path.exists(file_path):
        print(f"✅ {description}: Found")
        return True
    else:
        print(f"❌ {description}: Missing ({file_path})")
        return False

def check_file_content(file_path, search_terms, description):
    """Check if file contains specific content"""
    if not os.path.exists(file_path):
        print(f"❌ {description}: File not found ({file_path})")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        found_terms = []
        missing_terms = []
        
        for term in search_terms:
            if term in content:
                found_terms.append(term)
            else:
                missing_terms.append(term)
        
        if missing_terms:
            print(f"⚠️  {description}: Missing {missing_terms}")
            return False
        else:
            print(f"✅ {description}: All required content found")
            return True
            
    except Exception as e:
        print(f"❌ {description}: Error reading file - {e}")
        return False

def validate_backend_integration():
    """Validate backend components"""
    print("🔍 VALIDATING BACKEND INTEGRATION")
    print("-" * 40)
    
    backend_files = [
        ("services/users/project/api/meeting_models.py", "Meeting Activity Models"),
        ("services/users/project/api/meeting_activities_api.py", "Meeting Activities API"),
        ("services/users/project/tests/test_meeting_activities.py", "Activity Tests"),
        ("services/users/run_activity_tests.py", "Test Runner"),
        ("services/users/create_activity_migration.py", "Migration Creator")
    ]
    
    all_valid = True
    for file_path, description in backend_files:
        if not check_file_exists(file_path, description):
            all_valid = False
    
    # Check blueprint registration
    blueprint_check = check_file_content(
        "services/users/project/__init__.py",
        ["meeting_activities_blueprint", "app.register_blueprint(meeting_activities_blueprint)"],
        "Blueprint Registration"
    )
    
    if not blueprint_check:
        all_valid = False
    
    return all_valid

def validate_frontend_integration():
    """Validate frontend components"""
    print("\n🔍 VALIDATING FRONTEND INTEGRATION")
    print("-" * 40)
    
    frontend_files = [
        ("client/src/components/Meetings/ActivityTracker.js", "Activity Tracker Component"),
        ("client/src/components/Meetings/ActivityParticipation.js", "Activity Participation Component"),
        ("client/src/components/Meetings/ActivityDocuments.js", "Activity Documents Component"),
        ("client/src/components/Meetings/ActivitySummary.js", "Activity Summary Component"),
        ("client/src/components/Analytics/ActivityAnalytics.js", "Activity Analytics Component"),
        ("client/src/pages/SavingsGroups/Meetings/EnhancedMeetingPage.js", "Enhanced Meeting Page"),
        ("client/src/pages/SavingsGroups/Reports/ActivityReports.js", "Activity Reports Page")
    ]
    
    all_valid = True
    for file_path, description in frontend_files:
        if not check_file_exists(file_path, description):
            all_valid = False
    
    # Check main app integration
    app_integration = check_file_content(
        "client/src/pages/SavingsGroups/SavingsGroupsApp.js",
        ["ActivityReports", "case 'reports':", "case 'activity-reports':"],
        "Main App Integration"
    )
    
    if not app_integration:
        all_valid = False
    
    # Check navigation integration
    nav_integration = check_file_content(
        "client/src/components/Navigation/RoleBasedNavigation.js",
        ["ReportsIcon", "Activity Reports", "reports"],
        "Navigation Integration"
    )
    
    if not nav_integration:
        all_valid = False
    
    # Check meetings page integration
    meetings_integration = check_file_content(
        "client/src/pages/SavingsGroups/Meetings/MeetingsPage.js",
        ["EnhancedMeetingPage", "PlaylistAddCheck", "Activity Tracker"],
        "Meetings Page Integration"
    )
    
    if not meetings_integration:
        all_valid = False
    
    return all_valid

def validate_api_endpoints():
    """Validate API endpoint definitions"""
    print("\n🔍 VALIDATING API ENDPOINTS")
    print("-" * 40)

    required_endpoints = [
        "/api/meetings/<int:meeting_id>/activities",
        "/api/activities/<int:activity_id>/start",
        "/api/activities/<int:activity_id>/complete",
        "/api/activities/<int:activity_id>/participation",
        "/api/activities/<int:activity_id>/documents/upload",
        "/api/groups/<int:group_id>/activities/analytics"
    ]

    api_file = "services/users/project/api/meeting_activities_api.py"

    if not os.path.exists(api_file):
        print(f"❌ API file not found: {api_file}")
        return False

    try:
        with open(api_file, 'r', encoding='utf-8') as f:
            content = f.read()

        missing_endpoints = []
        found_endpoints = []

        for endpoint in required_endpoints:
            # Look for Flask route decorator with this endpoint
            route_pattern = f"@meeting_activities_blueprint.route('{endpoint}'"
            if route_pattern in content:
                found_endpoints.append(endpoint)
            else:
                missing_endpoints.append(endpoint)

        if missing_endpoints:
            print(f"⚠️  Missing API endpoints: {missing_endpoints}")
            return False
        else:
            print("✅ All required API endpoints found")
            print(f"   Found endpoints: {len(found_endpoints)}")
            return True

    except Exception as e:
        print(f"❌ Error validating API endpoints: {e}")
        return False

def validate_database_models():
    """Validate database model definitions"""
    print("\n🔍 VALIDATING DATABASE MODELS")
    print("-" * 40)
    
    required_models = [
        "class MeetingActivity",
        "class MemberActivityParticipation", 
        "class ActivityDocument",
        "class ActivityTransaction"
    ]
    
    models_file = "services/users/project/api/meeting_models.py"
    
    if not os.path.exists(models_file):
        print(f"❌ Models file not found: {models_file}")
        return False
    
    try:
        with open(models_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        missing_models = []
        for model in required_models:
            if model not in content:
                missing_models.append(model)
        
        if missing_models:
            print(f"⚠️  Missing database models: {missing_models}")
            return False
        else:
            print("✅ All required database models found")
            return True
            
    except Exception as e:
        print(f"❌ Error validating database models: {e}")
        return False

def generate_integration_report():
    """Generate a comprehensive integration report"""
    print("\n" + "=" * 60)
    print("📊 ENHANCED MEETING ACTIVITIES SYSTEM - INTEGRATION REPORT")
    print("=" * 60)
    
    backend_valid = validate_backend_integration()
    frontend_valid = validate_frontend_integration()
    api_valid = validate_api_endpoints()
    models_valid = validate_database_models()
    
    all_valid = backend_valid and frontend_valid and api_valid and models_valid
    
    print("\n" + "=" * 60)
    print("📋 INTEGRATION SUMMARY")
    print("=" * 60)
    print(f"Backend Integration: {'✅ PASS' if backend_valid else '❌ FAIL'}")
    print(f"Frontend Integration: {'✅ PASS' if frontend_valid else '❌ FAIL'}")
    print(f"API Endpoints: {'✅ PASS' if api_valid else '❌ FAIL'}")
    print(f"Database Models: {'✅ PASS' if models_valid else '❌ FAIL'}")
    print()
    print(f"Overall Status: {'✅ READY FOR DEPLOYMENT' if all_valid else '❌ NEEDS FIXES'}")
    
    if all_valid:
        print("\n🎉 ENHANCED MEETING ACTIVITIES SYSTEM IS FULLY INTEGRATED!")
        print("\n📋 NEXT STEPS:")
        print("1. Run database migrations:")
        print("   cd services/users")
        print("   python manage.py db migrate -m 'add_enhanced_meeting_activities'")
        print("   python manage.py db upgrade")
        print()
        print("2. Restart Docker containers:")
        print("   docker-compose down")
        print("   docker-compose up --build")
        print()
        print("3. Test the new features:")
        print("   • Go to Meetings → Click 'Activity Tracker' button")
        print("   • Go to 'Activity Reports' in navigation")
        print("   • Upload documents for meeting activities")
        print()
        print("🎯 NEW FEATURES AVAILABLE:")
        print("• Enhanced Meeting Activity Tracking")
        print("• Document Upload System (PDF, Word, Images)")
        print("• Member Participation Monitoring")
        print("• Comprehensive Activity Analytics")
        print("• Real-time Progress Tracking")
    else:
        print("\n⚠️  INTEGRATION ISSUES DETECTED")
        print("Please review the errors above and fix missing components.")
    
    print("=" * 60)
    return all_valid

def main():
    """Main validation function"""
    return generate_integration_report()

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
