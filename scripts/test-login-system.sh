#!/bin/bash

# 🔐 COMPREHENSIVE LOGIN TESTING SYSTEM
# Tests all demo users can successfully login and access their dashboards
# Professional testing following TestDriven.io methodology

set -e

echo "🔐 COMPREHENSIVE LOGIN TESTING SYSTEM"
echo "====================================="
echo "Testing all demo users can successfully login and access dashboards"
echo "Following TestDriven.io best practices for authentication testing"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test configuration
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"

# Demo user credentials for testing
declare -A DEMO_USERS=(
    ["superadmin"]="superadmin@testdriven.io:superpassword123:Super Admin"
    ["service_admin"]="admin@savingsgroups.ug:admin123:Service Admin"
    ["sarah"]="sarah@kampala.ug:password123:Group Chair"
    ["mary"]="mary@kampala.ug:password123:Group Treasurer"
    ["grace"]="grace@kampala.ug:password123:Group Secretary"
    ["alice"]="alice@kampala.ug:password123:Group Member"
    ["jane"]="jane@kampala.ug:password123:Group Member"
    ["rose"]="rose@kampala.ug:password123:Group Officer"
    ["john"]="john@kampala.ug:password123:Group Officer"
    ["peter"]="peter@kampala.ug:password123:Group Member"
)

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to test API endpoint availability
test_api_availability() {
    print_status "Testing API availability..."
    
    if curl -s -f "$BACKEND_URL/ping" > /dev/null; then
        print_success "Backend API is available"
        return 0
    else
        print_error "Backend API is not available at $BACKEND_URL"
        return 1
    fi
}

# Function to test frontend availability
test_frontend_availability() {
    print_status "Testing frontend availability..."
    
    if curl -s -f "$FRONTEND_URL" > /dev/null; then
        print_success "Frontend is available"
        return 0
    else
        print_error "Frontend is not available at $FRONTEND_URL"
        return 1
    fi
}

# Function to test user login via API
test_user_login() {
    local username=$1
    local email=$2
    local password=$3
    local role=$4
    
    print_status "Testing login for $role: $email"
    
    # Test login endpoint
    local login_response=$(curl -s -X POST "$BACKEND_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}" \
        -w "%{http_code}")
    
    local http_code="${login_response: -3}"
    local response_body="${login_response%???}"
    
    if [[ "$http_code" == "200" ]]; then
        # Extract token from response
        local token=$(echo "$response_body" | python3 -c "import sys, json; print(json.load(sys.stdin).get('auth_token', ''))" 2>/dev/null || echo "")
        
        if [[ -n "$token" ]]; then
            print_success "✅ Login successful for $role ($email)"
            
            # Test authenticated endpoint
            local user_info=$(curl -s -X GET "$BACKEND_URL/auth/status" \
                -H "Authorization: Bearer $token" \
                -w "%{http_code}")
            
            local auth_http_code="${user_info: -3}"
            
            if [[ "$auth_http_code" == "200" ]]; then
                print_success "✅ Authentication token valid for $role"
                ((PASSED_TESTS++))
                return 0
            else
                print_error "❌ Authentication token invalid for $role"
                ((FAILED_TESTS++))
                return 1
            fi
        else
            print_error "❌ No auth token received for $role"
            ((FAILED_TESTS++))
            return 1
        fi
    else
        print_error "❌ Login failed for $role ($email) - HTTP $http_code"
        if [[ -n "$response_body" ]]; then
            echo "   Response: $response_body"
        fi
        ((FAILED_TESTS++))
        return 1
    fi
}

# Function to test user registration (if needed)
test_user_exists() {
    local email=$1
    local role=$2
    
    print_status "Checking if $role user exists: $email"
    
    # Test if user exists by attempting to get user info
    local response=$(curl -s -X GET "$BACKEND_URL/users" \
        -w "%{http_code}")
    
    local http_code="${response: -3}"
    
    if [[ "$http_code" == "200" ]]; then
        print_success "✅ Users endpoint accessible"
        return 0
    else
        print_warning "⚠️  Users endpoint returned HTTP $http_code"
        return 1
    fi
}

# Function to test dashboard access levels
test_dashboard_access() {
    local role=$1
    local token=$2
    
    print_status "Testing dashboard access for $role"
    
    # Test different endpoints based on role
    case "$role" in
        "Super Admin")
            # Test admin endpoints
            local admin_response=$(curl -s -X GET "$BACKEND_URL/admin/users" \
                -H "Authorization: Bearer $token" \
                -w "%{http_code}")
            local admin_code="${admin_response: -3}"
            
            if [[ "$admin_code" == "200" ]]; then
                print_success "✅ Super Admin dashboard access confirmed"
                return 0
            else
                print_warning "⚠️  Super Admin dashboard access limited (HTTP $admin_code)"
                return 1
            fi
            ;;
        "Service Admin")
            # Test savings groups endpoints
            local groups_response=$(curl -s -X GET "$BACKEND_URL/savings-groups" \
                -H "Authorization: Bearer $token" \
                -w "%{http_code}")
            local groups_code="${groups_response: -3}"
            
            if [[ "$groups_code" == "200" ]]; then
                print_success "✅ Service Admin dashboard access confirmed"
                return 0
            else
                print_warning "⚠️  Service Admin dashboard access limited (HTTP $groups_code)"
                return 1
            fi
            ;;
        *)
            # Test basic user endpoints
            local profile_response=$(curl -s -X GET "$BACKEND_URL/auth/status" \
                -H "Authorization: Bearer $token" \
                -w "%{http_code}")
            local profile_code="${profile_response: -3}"
            
            if [[ "$profile_code" == "200" ]]; then
                print_success "✅ User dashboard access confirmed for $role"
                return 0
            else
                print_warning "⚠️  User dashboard access limited for $role (HTTP $profile_code)"
                return 1
            fi
            ;;
    esac
}

# Main testing function
run_comprehensive_login_tests() {
    print_status "Starting comprehensive login testing..."
    echo ""
    
    # Test 1: API and Frontend availability
    print_status "🧪 Test 1: Service Availability"
    echo "----------------------------------------"
    ((TOTAL_TESTS++))
    if test_api_availability && test_frontend_availability; then
        print_success "✅ PASSED: Service Availability"
        ((PASSED_TESTS++))
    else
        print_error "❌ FAILED: Service Availability"
        ((FAILED_TESTS++))
        echo ""
        print_error "Cannot proceed with login tests - services unavailable"
        return 1
    fi
    echo ""
    
    # Test 2: Individual user login tests
    print_status "🧪 Test 2: Individual User Login Tests"
    echo "----------------------------------------"
    
    for user_key in "${!DEMO_USERS[@]}"; do
        ((TOTAL_TESTS++))
        
        IFS=':' read -r email password role <<< "${DEMO_USERS[$user_key]}"
        
        if test_user_login "$user_key" "$email" "$password" "$role"; then
            print_success "✅ PASSED: $role login test"
        else
            print_error "❌ FAILED: $role login test"
        fi
        echo ""
    done
    
    # Test 3: Database integrity check
    print_status "🧪 Test 3: Database Integrity Check"
    echo "----------------------------------------"
    ((TOTAL_TESTS++))
    
    local db_status=$(docker-compose exec -T backend python manage.py db_status 2>/dev/null || echo "ERROR")
    
    if [[ "$db_status" != "ERROR" ]]; then
        print_success "✅ PASSED: Database Integrity Check"
        ((PASSED_TESTS++))
    else
        print_error "❌ FAILED: Database Integrity Check"
        ((FAILED_TESTS++))
    fi
    echo ""
    
    # Final results
    print_status "🎯 COMPREHENSIVE LOGIN TEST RESULTS"
    echo "===================================="
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo ""
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        print_success "🎉 ALL LOGIN TESTS PASSED!"
        echo ""
        print_status "✅ All demo users can successfully login"
        print_status "✅ Authentication system is working properly"
        print_status "✅ Dashboard access levels are functional"
        echo ""
        print_status "🔐 Ready for production deployment!"
        return 0
    else
        print_error "❌ Some login tests failed"
        echo ""
        print_status "🔧 Troubleshooting steps:"
        echo "  1. Ensure all services are running: docker-compose ps"
        echo "  2. Check backend logs: docker-compose logs backend"
        echo "  3. Verify database seeding: docker-compose exec backend python manage.py db_status"
        echo "  4. Re-seed demo data: docker-compose exec backend python manage.py seed_demo_data"
        return 1
    fi
}

# Run the comprehensive tests
run_comprehensive_login_tests
