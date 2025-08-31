#!/bin/bash

# Comprehensive Health Check Script
# Ensures all services are working correctly after deployment

set -e  # Exit on any error

echo "🏥 COMPREHENSIVE HEALTH CHECK STARTING..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAX_RETRIES=30
RETRY_DELAY=2
BASE_URL="http://localhost"

# Health check functions
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    local retries=0
    
    echo -n "🔍 Checking $service_name... "
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
            echo -e "${GREEN}✅ PASS${NC}"
            return 0
        fi
        retries=$((retries + 1))
        sleep $RETRY_DELAY
        echo -n "."
    done
    
    echo -e "${RED}❌ FAIL${NC}"
    return 1
}

check_json_response() {
    local service_name=$1
    local url=$2
    local expected_key=$3
    
    echo -n "🔍 Checking $service_name JSON response... "
    
    local response=$(curl -s "$url")
    if echo "$response" | jq -e ".$expected_key" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "Response: $response"
        return 1
    fi
}

check_database() {
    echo -n "🔍 Checking database connection... "

    if docker-compose exec -T users python -c "
from project import create_app, db
from project.api.models import User
app, _ = create_app()
with app.app_context():
    User.query.first()
print('Database connection successful')
" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        return 1
    fi
}

check_pwa_files() {
    local files=("manifest.json" "sw-safe.js" "favicon.ico")
    
    for file in "${files[@]}"; do
        echo -n "🔍 Checking PWA file $file... "
        if check_service "PWA $file" "$BASE_URL/$file" "200"; then
            continue
        else
            return 1
        fi
    done
}

# Main health checks
main() {
    local failed_checks=0
    
    echo -e "${BLUE}Phase 1: Container Health${NC}"
    echo "========================"
    
    # Check if all containers are running
    echo -n "🔍 Checking container status... "
    if docker-compose ps | grep -q "Exit\|unhealthy"; then
        echo -e "${RED}❌ FAIL - Some containers are not healthy${NC}"
        docker-compose ps
        ((failed_checks++))
    else
        echo -e "${GREEN}✅ PASS${NC}"
    fi
    
    echo -e "\n${BLUE}Phase 2: Service Connectivity${NC}"
    echo "============================="
    
    # Basic service checks
    check_service "Frontend" "$BASE_URL/" || ((failed_checks++))
    check_service "Backend Health" "$BASE_URL/users/ping" || ((failed_checks++))
    check_service "Auth Endpoint" "$BASE_URL/auth/register" "405" || ((failed_checks++))  # Method not allowed is expected
    
    echo -e "\n${BLUE}Phase 3: API Functionality${NC}"
    echo "=========================="
    
    # API response checks
    check_json_response "Users API" "$BASE_URL/users" "data" || ((failed_checks++))
    check_json_response "Health Check" "$BASE_URL/users/ping" "status" || ((failed_checks++))
    
    echo -e "\n${BLUE}Phase 4: Database Connectivity${NC}"
    echo "=============================="
    
    check_database || ((failed_checks++))
    
    echo -e "\n${BLUE}Phase 5: PWA Infrastructure${NC}"
    echo "==========================="
    
    check_pwa_files || ((failed_checks++))
    
    echo -e "\n${BLUE}Phase 6: Authentication Flow${NC}"
    echo "============================"
    
    # Test full auth flow
    echo -n "🔍 Testing registration... "
    local timestamp=$(date +%s)
    local test_username="healthcheck-$timestamp"
    local test_email="healthcheck-$timestamp@test.com"
    local reg_response=$(curl -s -X POST "$BASE_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$test_username\",\"email\":\"$test_email\",\"password\":\"testpass123\"}")
    
    if echo "$reg_response" | jq -e '.auth_token' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        
        # Test login
        echo -n "🔍 Testing login... "
        local login_response=$(curl -s -X POST "$BASE_URL/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$test_email\",\"password\":\"testpass123\"}")
        
        if echo "$login_response" | jq -e '.auth_token' > /dev/null 2>&1; then
            echo -e "${GREEN}✅ PASS${NC}"
        else
            echo -e "${RED}❌ FAIL${NC}"
            ((failed_checks++))
        fi
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((failed_checks++))
    fi
    
    # Final report
    echo -e "\n${BLUE}HEALTH CHECK SUMMARY${NC}"
    echo "===================="
    
    if [ $failed_checks -eq 0 ]; then
        echo -e "${GREEN}🎉 ALL CHECKS PASSED! System is healthy.${NC}"
        exit 0
    else
        echo -e "${RED}❌ $failed_checks checks failed. System needs attention.${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
