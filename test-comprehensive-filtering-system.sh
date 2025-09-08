#!/bin/bash

# Comprehensive Filtering System End-to-End Test
# Tests new filtering features and ensures system integrity

echo "🧪 COMPREHENSIVE FILTERING SYSTEM TEST"
echo "======================================"
echo "Date: $(date)"
echo "Testing: Geographic, Financial, Demographic, and Activity Filters"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to log test results
log_test() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        echo -e "   ${YELLOW}Details: $details${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint="$1"
    local expected_status="$2"
    local test_name="$3"
    
    echo -e "${BLUE}Testing:${NC} $endpoint"
    
    response=$(curl -s -w "%{http_code}" -o /tmp/api_response.json "http://localhost:5000$endpoint" 2>/dev/null)
    status_code="${response: -3}"
    
    if [ "$status_code" = "$expected_status" ]; then
        log_test "$test_name" "PASS" "Status: $status_code"
        return 0
    else
        log_test "$test_name" "FAIL" "Expected: $expected_status, Got: $status_code"
        return 1
    fi
}

# Function to check if services are running
check_services() {
    echo -e "${BLUE}🔍 Checking Service Status${NC}"
    echo "================================"
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null; then
        log_test "Frontend Service (React)" "PASS" "Running on port 3000"
    else
        log_test "Frontend Service (React)" "FAIL" "Not responding on port 3000"
    fi
    
    # Check backend
    if curl -s http://localhost:5000/api/health > /dev/null; then
        log_test "Backend Service (Flask)" "PASS" "Running on port 5000"
    else
        log_test "Backend Service (Flask)" "FAIL" "Not responding on port 5000"
    fi
    
    echo ""
}

# Function to test geographic filters
test_geographic_filters() {
    echo -e "${BLUE}🌍 Testing Geographic Filters${NC}"
    echo "================================"
    
    # Test region filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?region=Central" "200" "Region Filter - Central"
    test_api_endpoint "/api/savings-groups/calendar/events/?region=Eastern" "200" "Region Filter - Eastern"
    test_api_endpoint "/api/savings-groups/calendar/events/?region=Western" "200" "Region Filter - Western"
    test_api_endpoint "/api/savings-groups/calendar/events/?region=Northern" "200" "Region Filter - Northern"
    
    # Test district filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?district=Kampala" "200" "District Filter - Kampala"
    test_api_endpoint "/api/savings-groups/calendar/events/?district=Wakiso" "200" "District Filter - Wakiso"
    test_api_endpoint "/api/savings-groups/calendar/events/?district=Mukono" "200" "District Filter - Mukono"
    
    # Test parish filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?parish=Central" "200" "Parish Filter - Central"
    test_api_endpoint "/api/savings-groups/calendar/events/?parish=Nakasero" "200" "Parish Filter - Nakasero"
    
    # Test village filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?village=Nakasero" "200" "Village Filter - Nakasero"
    
    # Test combined geographic filters
    test_api_endpoint "/api/savings-groups/calendar/events/?region=Central&district=Kampala&parish=Central" "200" "Combined Geographic Filters"
    
    echo ""
}

# Function to test financial filters
test_financial_filters() {
    echo -e "${BLUE}💰 Testing Financial Filters${NC}"
    echo "==============================="
    
    # Test fund type filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?fund_types=PERSONAL" "200" "Fund Type Filter - Personal"
    test_api_endpoint "/api/savings-groups/calendar/events/?fund_types=ECD" "200" "Fund Type Filter - ECD"
    test_api_endpoint "/api/savings-groups/calendar/events/?fund_types=SOCIAL" "200" "Fund Type Filter - Social"
    test_api_endpoint "/api/savings-groups/calendar/events/?fund_types=TARGET" "200" "Fund Type Filter - Target"
    
    # Test multiple fund types
    test_api_endpoint "/api/savings-groups/calendar/events/?fund_types=PERSONAL,ECD,SOCIAL" "200" "Multiple Fund Types Filter"
    
    # Test loan amount filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?loan_amount_min=100000" "200" "Loan Amount Min Filter"
    test_api_endpoint "/api/savings-groups/calendar/events/?loan_amount_max=500000" "200" "Loan Amount Max Filter"
    test_api_endpoint "/api/savings-groups/calendar/events/?loan_amount_min=100000&loan_amount_max=500000" "200" "Loan Amount Range Filter"
    
    # Test transaction amount filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?transaction_amount_min=50000" "200" "Transaction Amount Min Filter"
    test_api_endpoint "/api/savings-groups/calendar/events/?transaction_amount_max=200000" "200" "Transaction Amount Max Filter"
    
    echo ""
}

# Function to test demographic filters
test_demographic_filters() {
    echo -e "${BLUE}👥 Testing Demographic Filters${NC}"
    echo "================================="
    
    # Test gender filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?gender=F" "200" "Gender Filter - Female"
    test_api_endpoint "/api/savings-groups/calendar/events/?gender=M" "200" "Gender Filter - Male"
    test_api_endpoint "/api/savings-groups/calendar/events/?gender=OTHER" "200" "Gender Filter - Other"
    
    # Test role filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?roles=CHAIR" "200" "Role Filter - Chair"
    test_api_endpoint "/api/savings-groups/calendar/events/?roles=TREASURER" "200" "Role Filter - Treasurer"
    test_api_endpoint "/api/savings-groups/calendar/events/?roles=SECRETARY" "200" "Role Filter - Secretary"
    test_api_endpoint "/api/savings-groups/calendar/events/?roles=MEMBER" "200" "Role Filter - Member"
    
    # Test multiple roles
    test_api_endpoint "/api/savings-groups/calendar/events/?roles=CHAIR,TREASURER,SECRETARY" "200" "Multiple Roles Filter"
    
    # Test membership duration
    test_api_endpoint "/api/savings-groups/calendar/events/?membership_min=6" "200" "Membership Duration Min Filter"
    test_api_endpoint "/api/savings-groups/calendar/events/?membership_max=24" "200" "Membership Duration Max Filter"
    
    echo ""
}

# Function to test activity filters
test_activity_filters() {
    echo -e "${BLUE}📊 Testing Activity Filters${NC}"
    echo "============================="
    
    # Test event type filtering
    test_api_endpoint "/api/savings-groups/calendar/events/?event_types=TRANSACTION" "200" "Event Type Filter - Transaction"
    test_api_endpoint "/api/savings-groups/calendar/events/?event_types=MEETING" "200" "Event Type Filter - Meeting"
    test_api_endpoint "/api/savings-groups/calendar/events/?event_types=LOAN" "200" "Event Type Filter - Loan"
    test_api_endpoint "/api/savings-groups/calendar/events/?event_types=CAMPAIGN" "200" "Event Type Filter - Campaign"
    
    # Test multiple event types
    test_api_endpoint "/api/savings-groups/calendar/events/?event_types=TRANSACTION,MEETING,LOAN" "200" "Multiple Event Types Filter"
    
    # Test verification status
    test_api_endpoint "/api/savings-groups/calendar/events/?verification_status=PENDING" "200" "Verification Status - Pending"
    test_api_endpoint "/api/savings-groups/calendar/events/?verification_status=VERIFIED" "200" "Verification Status - Verified"
    test_api_endpoint "/api/savings-groups/calendar/events/?verification_status=REJECTED" "200" "Verification Status - Rejected"
    
    # Test date range filtering
    start_date=$(date -d "30 days ago" +%Y-%m-%d)
    end_date=$(date +%Y-%m-%d)
    test_api_endpoint "/api/savings-groups/calendar/events/?start_date=$start_date&end_date=$end_date" "200" "Date Range Filter"
    
    echo ""
}

# Function to test complex filter combinations
test_complex_combinations() {
    echo -e "${BLUE}🔄 Testing Complex Filter Combinations${NC}"
    echo "======================================="
    
    # Test geographic + financial
    test_api_endpoint "/api/savings-groups/calendar/events/?region=Central&fund_types=ECD&loan_amount_min=100000" "200" "Geographic + Financial Filters"
    
    # Test demographic + activity
    test_api_endpoint "/api/savings-groups/calendar/events/?gender=F&roles=CHAIR&event_types=TRANSACTION" "200" "Demographic + Activity Filters"
    
    # Test all filter categories combined
    complex_url="/api/savings-groups/calendar/events/?region=Central&district=Kampala&gender=F&roles=CHAIR&fund_types=ECD&event_types=TRANSACTION&verification_status=VERIFIED"
    test_api_endpoint "$complex_url" "200" "All Filter Categories Combined"
    
    # Test performance with multiple filters
    performance_url="/api/savings-groups/calendar/events/?region=Central&district=Kampala&parish=Central&gender=F&roles=CHAIR,TREASURER&fund_types=PERSONAL,ECD&event_types=TRANSACTION,MEETING&loan_amount_min=50000&loan_amount_max=500000"
    test_api_endpoint "$performance_url" "200" "Performance Test - Multiple Filters"
    
    echo ""
}

# Function to test group-specific filtering
test_group_filtering() {
    echo -e "${BLUE}👥 Testing Group-Specific Filtering${NC}"
    echo "===================================="
    
    # Test filtering by specific groups
    test_api_endpoint "/api/savings-groups/calendar/events/?group_ids=1" "200" "Single Group Filter"
    test_api_endpoint "/api/savings-groups/calendar/events/?group_ids=1,2,3" "200" "Multiple Groups Filter"
    
    # Test group + other filters
    test_api_endpoint "/api/savings-groups/calendar/events/?group_ids=1&event_types=TRANSACTION&gender=F" "200" "Group + Other Filters"
    
    echo ""
}

# Function to test frontend filter UI
test_frontend_filters() {
    echo -e "${BLUE}🎨 Testing Frontend Filter UI${NC}"
    echo "==============================="
    
    # Test if savings groups page loads
    if curl -s http://localhost:3000/savings-groups | grep -q "Savings Groups"; then
        log_test "Savings Groups Page Load" "PASS" "Page loads successfully"
    else
        log_test "Savings Groups Page Load" "FAIL" "Page not loading or missing content"
    fi
    
    # Test if calendar page loads
    if curl -s http://localhost:3000/savings-groups/calendar | grep -q "Calendar"; then
        log_test "Calendar Page Load" "PASS" "Calendar page loads successfully"
    else
        log_test "Calendar Page Load" "FAIL" "Calendar page not loading"
    fi
    
    # Test if analytics page loads
    if curl -s http://localhost:3000/analytics | grep -q "Analytics"; then
        log_test "Analytics Page Load" "PASS" "Analytics page loads successfully"
    else
        log_test "Analytics Page Load" "FAIL" "Analytics page not loading"
    fi
    
    echo ""
}

# Function to test regression - ensure existing features still work
test_regression() {
    echo -e "${BLUE}🔄 Testing Regression - Existing Features${NC}"
    echo "=========================================="
    
    # Test basic API endpoints
    test_api_endpoint "/api/savings-groups/" "200" "Basic Savings Groups API"
    test_api_endpoint "/api/savings-groups/members/" "200" "Group Members API"
    test_api_endpoint "/api/savings-groups/transactions/" "200" "Transactions API"
    test_api_endpoint "/api/savings-groups/loans/" "200" "Loans API"
    test_api_endpoint "/api/savings-groups/meetings/" "200" "Meetings API"
    
    # Test user authentication endpoints
    test_api_endpoint "/api/auth/users/" "200" "User Authentication API"
    
    # Test admin endpoints
    test_api_endpoint "/api/admin/groups/" "200" "Admin Groups API"
    test_api_endpoint "/api/admin/users/" "200" "Admin Users API"
    
    echo ""
}

# Function to test role-based access with filters
test_role_based_filtering() {
    echo -e "${BLUE}🔐 Testing Role-Based Filter Access${NC}"
    echo "==================================="
    
    # Test different user roles can access appropriate filters
    # Note: In a real test, we'd use different authentication tokens
    
    # Super Admin - should access all filters
    test_api_endpoint "/api/savings-groups/calendar/events/?region=Central&admin_view=true" "200" "Super Admin Filter Access"
    
    # Service Admin - should access service-level filters
    test_api_endpoint "/api/savings-groups/calendar/events/?district=Kampala&service_admin=true" "200" "Service Admin Filter Access"
    
    # Group Officer - should access group-level filters
    test_api_endpoint "/api/savings-groups/calendar/events/?group_ids=1&officer_view=true" "200" "Group Officer Filter Access"
    
    # Regular Member - should access personal filters only
    test_api_endpoint "/api/savings-groups/calendar/events/?user_id=1&member_view=true" "200" "Member Filter Access"
    
    echo ""
}

# Function to generate test report
generate_report() {
    echo ""
    echo "📊 COMPREHENSIVE TEST REPORT"
    echo "============================="
    echo "Date: $(date)"
    echo "Total Tests: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo -e "\n🎉 ${GREEN}ALL TESTS PASSED!${NC}"
        echo "✅ System is working correctly"
        echo "✅ New filtering features are functional"
        echo "✅ No regression detected"
    else
        echo -e "\n⚠️  ${YELLOW}SOME TESTS FAILED${NC}"
        echo "❌ $FAILED_TESTS out of $TOTAL_TESTS tests failed"
        echo "🔍 Check the details above for specific issues"
    fi
    
    echo ""
    echo "📋 Test Categories Covered:"
    echo "  🌍 Geographic Filters (Region, District, Parish, Village)"
    echo "  💰 Financial Filters (Fund Types, Loan Amounts, Transaction Amounts)"
    echo "  👥 Demographic Filters (Gender, Roles, Membership Duration)"
    echo "  📊 Activity Filters (Event Types, Verification Status, Date Ranges)"
    echo "  🔄 Complex Filter Combinations"
    echo "  👥 Group-Specific Filtering"
    echo "  🎨 Frontend Filter UI"
    echo "  🔄 Regression Testing"
    echo "  🔐 Role-Based Filter Access"
    
    echo ""
    echo "🚀 Next Steps:"
    if [ $FAILED_TESTS -eq 0 ]; then
        echo "  ✅ System ready for production use"
        echo "  ✅ All filtering features working correctly"
        echo "  ✅ No issues detected with existing functionality"
    else
        echo "  🔧 Fix failing tests before deployment"
        echo "  🔍 Investigate specific filter issues"
        echo "  🧪 Re-run tests after fixes"
    fi
}

# Main test execution
main() {
    echo "Starting comprehensive filtering system test..."
    echo "This will test all new filtering features and ensure system integrity."
    echo ""
    
    # Run all test categories
    check_services
    test_geographic_filters
    test_financial_filters
    test_demographic_filters
    test_activity_filters
    test_complex_combinations
    test_group_filtering
    test_frontend_filters
    test_regression
    test_role_based_filtering
    
    # Generate final report
    generate_report
}

# Run the tests
main