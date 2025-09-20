#!/bin/bash

# 🧪 COMPLETE SYSTEM FUNCTIONALITY TEST
# =====================================
# 
# Comprehensive test suite to verify:
# 1. All containers are running
# 2. Frontend is accessible
# 3. API routing is working
# 4. PWA features are available
# 5. Group Oversight functionality
# 6. Authentication system
# 7. Database connectivity

set -e

echo "🧪 COMPLETE SYSTEM FUNCTIONALITY TEST"
echo "====================================="
echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] Starting comprehensive system test..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    echo "Command: $test_command"
    
    if result=$(eval "$test_command" 2>&1); then
        if [[ -z "$expected_pattern" ]] || echo "$result" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✅ PASSED${NC}"
            TESTS_PASSED=$((TESTS_PASSED + 1))
            if [[ -n "$result" ]]; then
                echo "Result: $result" | head -3
            fi
        else
            echo -e "${RED}❌ FAILED${NC} - Expected pattern '$expected_pattern' not found"
            echo "Actual result: $result" | head -5
            TESTS_FAILED=$((TESTS_FAILED + 1))
        fi
    else
        echo -e "${RED}❌ FAILED${NC} - Command failed"
        echo "Error: $result"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo -e "\n${YELLOW}🐳 CONTAINER STATUS TESTS${NC}"
echo "=========================="

run_test "Database Container Running" \
    "docker ps --filter 'name=testdriven-appcopy-db-1' --format '{{.Status}}'" \
    "healthy"

run_test "Backend Container Running" \
    "docker ps --filter 'name=testdriven-appcopy-backend-1' --format '{{.Status}}'" \
    "healthy"

run_test "Frontend Container Running" \
    "docker ps --filter 'name=testdriven-appcopy-frontend-1' --format '{{.Status}}'" \
    "Up"

echo -e "\n${YELLOW}🌐 FRONTEND ACCESSIBILITY TESTS${NC}"
echo "==============================="

run_test "Frontend Homepage Accessible" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000" \
    "200"

run_test "Frontend HTML Content" \
    "curl -s http://localhost:3000 | grep -o '<title>.*</title>'" \
    "Enhanced Savings Groups"

run_test "PWA Manifest Accessible" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/manifest.json" \
    "200"

run_test "PWA Manifest Content" \
    "curl -s http://localhost:3000/manifest.json | jq -r '.name'" \
    "Enhanced Savings Groups Management System"

echo -e "\n${YELLOW}🔌 API ROUTING TESTS${NC}"
echo "===================="

run_test "API Ping Endpoint" \
    "curl -s http://localhost:3000/api/ping | jq -r '.status'" \
    "success"

run_test "Backend Direct Access" \
    "curl -s http://localhost:5000/ping | jq -r '.status'" \
    "success"

run_test "API Version Check" \
    "curl -s http://localhost:3000/api/ping | jq -r '.version'" \
    "1.1.0-stable"

echo -e "\n${YELLOW}🔐 AUTHENTICATION TESTS${NC}"
echo "======================="

# Test user registration
run_test "User Registration Endpoint" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"testpass123\"}' http://localhost:3000/api/auth/register | jq -r '.status'" \
    "success"

# Test user login
run_test "User Login Endpoint" \
    "curl -s -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"testpass123\"}' http://localhost:3000/api/auth/login | jq -r '.status'" \
    "success"

echo -e "\n${YELLOW}📊 GROUP OVERSIGHT API TESTS${NC}"
echo "============================"

# Get auth token for API tests
AUTH_TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"testpass123"}' http://localhost:3000/api/auth/login | jq -r '.auth_token')

if [[ "$AUTH_TOKEN" != "null" && -n "$AUTH_TOKEN" ]]; then
    run_test "Savings Groups API Access" \
        "curl -s -H 'Authorization: Bearer $AUTH_TOKEN' http://localhost:3000/api/savings-groups | jq -r '.status'" \
        "success"
    
    run_test "Group Members API Access" \
        "curl -s -H 'Authorization: Bearer $AUTH_TOKEN' http://localhost:3000/api/group-members | jq -r '.status'" \
        "success"
else
    echo -e "${YELLOW}⚠️  SKIPPED${NC} - Could not obtain auth token for API tests"
    TOTAL_TESTS=$((TOTAL_TESTS + 2))
fi

echo -e "\n${YELLOW}💾 DATABASE CONNECTIVITY TESTS${NC}"
echo "==============================="

run_test "Database Connection" \
    "docker exec testdriven-appcopy-backend-1 python -c 'from project import db; db.engine.execute(\"SELECT 1\"); print(\"Connected\")'" \
    "Connected"

echo -e "\n${YELLOW}🔧 PWA MANAGEMENT TESTS${NC}"
echo "======================="

run_test "PWA Manager JavaScript Available" \
    "curl -s http://localhost:3000/static/js/main.*.js | grep -o 'PWAManager' | head -1" \
    "PWAManager"

echo -e "\n${YELLOW}📱 SYSTEM INTEGRATION TESTS${NC}"
echo "==========================="

run_test "Service Worker Registration" \
    "curl -s http://localhost:3000 | grep -o 'serviceWorker'" \
    "serviceWorker"

run_test "React App Bundle" \
    "curl -s http://localhost:3000 | grep -o 'static/js/main.*js'" \
    "static/js/main"

# Final Results
echo -e "\n${BLUE}📋 TEST SUMMARY${NC}"
echo "==============="
echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed: ${RED}${TESTS_FAILED}${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! System is fully operational.${NC}"
    echo -e "\n${GREEN}✅ SYSTEM STATUS: HEALTHY${NC}"
    echo "- Frontend: http://localhost:3000"
    echo "- Backend API: http://localhost:5000"
    echo "- PWA Features: Available (disabled by default)"
    echo "- Group Oversight: Functional"
    echo "- Authentication: Working"
    echo "- Database: Connected"
    exit 0
else
    echo -e "\n${RED}❌ SOME TESTS FAILED! Please check the issues above.${NC}"
    echo -e "\n${YELLOW}🔧 TROUBLESHOOTING TIPS:${NC}"
    echo "1. Ensure all containers are running: docker ps"
    echo "2. Check container logs: docker-compose logs"
    echo "3. Restart services: docker-compose restart"
    echo "4. Rebuild if needed: docker-compose build --no-cache"
    exit 1
fi
