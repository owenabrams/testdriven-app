#!/bin/bash

# Test local production setup with PostgreSQL
# Usage: ./scripts/test-local-production.sh

set -e

echo "🧪 Testing Local Production Setup"
echo "================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"

# Start local production environment
echo ""
echo "🚀 Starting local production environment..."
docker-compose -f docker-compose-local-prod.yml up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."
sleep 15

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=""

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo ""
    echo "🔍 Testing: $test_name"
    
    if eval "$test_command"; then
        echo "   ✅ PASSED"
        ((TESTS_PASSED++))
    else
        echo "   ❌ FAILED"
        ((TESTS_FAILED++))
        FAILED_TESTS="$FAILED_TESTS $test_name"
    fi
}

# Test 1: PostgreSQL Health
run_test "PostgreSQL Database" \
    "docker exec testdriven-local-postgres pg_isready -U webapp -d users_production"

# Test 2: Backend Health
run_test "Backend API (/ping)" \
    "curl -f -s http://localhost:5000/ping > /dev/null"

# Test 3: Frontend Health
run_test "Frontend (React App)" \
    "curl -f -s http://localhost:80 > /dev/null"

# Test 4: Database Connection
run_test "Database Connection (/users)" \
    "curl -f -s http://localhost:5000/users > /dev/null"

# Test 5: User Registration
echo ""
echo "🔍 Testing: User Registration"
REGISTER_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"testpass123"}' \
    http://localhost:5000/auth/register)

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
    http://localhost:5000/auth/login)

if echo "$LOGIN_RESPONSE" | grep -q "auth_token"; then
    echo "   ✅ PASSED - User Login"
    ((TESTS_PASSED++))
    
    # Extract auth token for authenticated tests
    AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"auth_token":"[^"]*"' | cut -d'"' -f4)
    echo "   📋 Auth token extracted"
else
    echo "   ❌ FAILED - User Login"
    echo "   Response: $LOGIN_RESPONSE"
    ((TESTS_FAILED++))
    FAILED_TESTS="$FAILED_TESTS User_Login"
fi

# Test 7: Authenticated Request
if [ -n "$AUTH_TOKEN" ]; then
    echo ""
    echo "🔍 Testing: Authenticated Status Check"
    STATUS_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
        http://localhost:5000/auth/status)
    
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

# Show container logs if there are failures
if [ $TESTS_FAILED -gt 0 ]; then
    echo ""
    echo "📋 Container Status:"
    docker-compose -f docker-compose-local-prod.yml ps
    
    echo ""
    echo "📋 Backend Logs (last 20 lines):"
    docker logs testdriven-backend --tail 20
fi

# Test Results Summary
echo ""
echo "📊 Test Results Summary"
echo "======================"
echo "🌐 Base URL: http://localhost"
echo "🗃️  Database: Local PostgreSQL"
echo "✅ Tests Passed: $TESTS_PASSED"
echo "❌ Tests Failed: $TESTS_FAILED"
echo "📊 Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed! Local production setup is working perfectly."
    echo ""
    echo "📋 Your Local Production Environment:"
    echo "   🌐 Frontend: http://localhost"
    echo "   🔧 Backend API: http://localhost:5000"
    echo "   🗃️  Database: PostgreSQL on localhost:5432"
    echo ""
    echo "📝 To stop the environment:"
    echo "   docker-compose -f docker-compose-local-prod.yml down"
    exit 0
else
    echo ""
    echo "❌ Some tests failed. Check the logs above."
    echo "🔍 Failed tests:$FAILED_TESTS"
    echo ""
    echo "📝 To stop and restart:"
    echo "   docker-compose -f docker-compose-local-prod.yml down"
    echo "   docker-compose -f docker-compose-local-prod.yml up -d"
    exit 1
fi
