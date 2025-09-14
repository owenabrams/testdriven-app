#!/bin/bash

# End-to-end testing for production environment
# Usage: ./scripts/test-production-e2e.sh [ALB_DNS_NAME]

set -e

ALB_DNS=${1}
ENVIRONMENT="production"

echo "🧪 Production End-to-End Testing"
echo "================================"

# Check if ALB DNS is provided
if [ -z "$ALB_DNS" ]; then
    echo "📡 Getting ALB DNS from CloudFormation..."
    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name "testdriven-${ENVIRONMENT}-alb" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text \
        --region us-east-1 2>/dev/null)
    
    if [ -z "$ALB_DNS" ]; then
        echo "❌ Could not get ALB DNS. Please provide it as argument:"
        echo "Usage: $0 [ALB_DNS_NAME]"
        exit 1
    fi
fi

BASE_URL="http://$ALB_DNS"
echo "✅ Testing against: $BASE_URL"

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=""

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="$3"
    
    echo ""
    echo "🔍 Testing: $test_name"
    echo "   URL: $test_command"
    
    if eval "$test_command"; then
        echo "   ✅ PASSED"
        ((TESTS_PASSED++))
    else
        echo "   ❌ FAILED"
        ((TESTS_FAILED++))
        FAILED_TESTS="$FAILED_TESTS $test_name"
    fi
}

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Test 1: Health Check
run_test "Health Check (/ping)" \
    "curl -f -s $BASE_URL/ping > /dev/null" \
    200

# Test 2: Users API - Get All Users
run_test "Get All Users (/users)" \
    "curl -f -s $BASE_URL/users > /dev/null" \
    200

# Test 3: Frontend - React App
run_test "Frontend Root (/)" \
    "curl -f -s $BASE_URL/ > /dev/null" \
    200

# Test 4: API Status Check
run_test "API Status (/users/ping)" \
    "curl -f -s $BASE_URL/users/ping > /dev/null" \
    200

# Test 5: Register New User
echo ""
echo "🔍 Testing: User Registration"
REGISTER_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}' \
    $BASE_URL/auth/register)

if echo "$REGISTER_RESPONSE" | grep -q "successfully registered"; then
    echo "   ✅ PASSED - User Registration"
    ((TESTS_PASSED++))
else
    echo "   ❌ FAILED - User Registration"
    echo "   Response: $REGISTER_RESPONSE"
    ((TESTS_FAILED++))
    FAILED_TESTS="$FAILED_TESTS User_Registration"
fi

# Test 6: User Login
echo ""
echo "🔍 Testing: User Login"
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"testpass123"}' \
    $BASE_URL/auth/login)

if echo "$LOGIN_RESPONSE" | grep -q "auth_token"; then
    echo "   ✅ PASSED - User Login"
    ((TESTS_PASSED++))
    
    # Extract auth token for authenticated tests
    AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"auth_token":"[^"]*"' | cut -d'"' -f4)
    echo "   📋 Auth token extracted for further tests"
else
    echo "   ❌ FAILED - User Login"
    echo "   Response: $LOGIN_RESPONSE"
    ((TESTS_FAILED++))
    FAILED_TESTS="$FAILED_TESTS User_Login"
fi

# Test 7: Authenticated Request (if login succeeded)
if [ -n "$AUTH_TOKEN" ]; then
    echo ""
    echo "🔍 Testing: Authenticated Status Check"
    STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
        $BASE_URL/auth/status)
    
    if echo "$STATUS_RESPONSE" | grep -q "success"; then
        echo "   ✅ PASSED - Authenticated Status"
        ((TESTS_PASSED++))
    else
        echo "   ❌ FAILED - Authenticated Status"
        echo "   Response: $STATUS_RESPONSE"
        ((TESTS_FAILED++))
        FAILED_TESTS="$FAILED_TESTS Authenticated_Status"
    fi
fi

# Test 8: Database Connectivity (indirect test via API)
echo ""
echo "🔍 Testing: Database Connectivity"
DB_TEST_RESPONSE=$(curl -s $BASE_URL/users)
if echo "$DB_TEST_RESPONSE" | grep -q "users"; then
    echo "   ✅ PASSED - Database Connectivity"
    ((TESTS_PASSED++))
else
    echo "   ❌ FAILED - Database Connectivity"
    echo "   Response: $DB_TEST_RESPONSE"
    ((TESTS_FAILED++))
    FAILED_TESTS="$FAILED_TESTS Database_Connectivity"
fi

# Run Cypress E2E Tests (if available)
if [ -f "cypress.config.js" ]; then
    echo ""
    echo "🌐 Running Cypress E2E Tests..."
    if npx cypress run --config baseUrl=$BASE_URL --headless; then
        echo "   ✅ PASSED - Cypress E2E Tests"
        ((TESTS_PASSED++))
    else
        echo "   ❌ FAILED - Cypress E2E Tests"
        ((TESTS_FAILED++))
        FAILED_TESTS="$FAILED_TESTS Cypress_E2E"
    fi
else
    echo "⏭️  Skipping Cypress tests (cypress.config.js not found)"
fi

# Test Results Summary
echo ""
echo "📊 Test Results Summary"
echo "======================"
echo "🌐 Base URL: $BASE_URL"
echo "✅ Tests Passed: $TESTS_PASSED"
echo "❌ Tests Failed: $TESTS_FAILED"
echo "📊 Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! Production deployment is healthy."
    echo ""
    echo "📋 Verified Components:"
    echo "   ✅ Frontend (React app)"
    echo "   ✅ Backend (Flask API)"
    echo "   ✅ Database (RDS PostgreSQL)"
    echo "   ✅ Authentication system"
    echo "   ✅ Load balancer routing"
    exit 0
else
    echo ""
    echo "❌ Some tests failed. Production deployment may have issues."
    echo "🔍 Failed tests:$FAILED_TESTS"
    echo ""
    echo "📋 Troubleshooting:"
    echo "   1. Check ECS service health in AWS Console"
    echo "   2. Check CloudWatch logs for errors"
    echo "   3. Verify ALB target group health"
    echo "   4. Test database connectivity"
    exit 1
fi
