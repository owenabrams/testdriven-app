#!/bin/bash

# 🚀 COMPREHENSIVE DEPLOYMENT VALIDATION SCRIPT
# This script automatically validates deployment checklist items

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
    else
        echo -e "${BLUE}ℹ️  INFO${NC}: $message"
    fi
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local timeout=${2:-30}
    local count=0
    
    while [ $count -lt $timeout ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    return 1
}

echo -e "${BLUE}🚀 STARTING COMPREHENSIVE DEPLOYMENT VALIDATION${NC}"
echo "=================================================="

# PHASE 1: ENVIRONMENT VALIDATION
echo -e "\n${BLUE}📋 PHASE 1: ENVIRONMENT VALIDATION${NC}"
echo "-----------------------------------"

# Check Docker
if command_exists docker; then
    if docker info >/dev/null 2>&1; then
        print_status "PASS" "Docker daemon is running"
    else
        print_status "FAIL" "Docker daemon is not running"
    fi
else
    print_status "FAIL" "Docker is not installed"
fi

# Check Docker Compose
if command_exists docker-compose; then
    print_status "PASS" "Docker Compose is available"
else
    print_status "FAIL" "Docker Compose is not installed"
fi

# Check disk space
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    print_status "PASS" "Disk space sufficient ($DISK_USAGE% used)"
else
    print_status "WARN" "Disk space getting low ($DISK_USAGE% used)"
fi

# PHASE 2: CONTAINER VALIDATION
echo -e "\n${BLUE}🏗️ PHASE 2: CONTAINER VALIDATION${NC}"
echo "--------------------------------"

# Check if containers are running
CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep testdriven-appcopy || true)
if [ -n "$CONTAINERS" ]; then
    print_status "PASS" "Containers are running"
    echo "$CONTAINERS"
else
    print_status "FAIL" "No containers are running"
fi

# Check container health
BACKEND_HEALTH=$(docker ps --filter "name=testdriven-appcopy-backend" --format "{{.Status}}" | grep -o "healthy\|unhealthy\|starting" || echo "unknown")
FRONTEND_HEALTH=$(docker ps --filter "name=testdriven-appcopy-frontend" --format "{{.Status}}" | grep -o "healthy\|unhealthy\|starting" || echo "unknown")
DB_HEALTH=$(docker ps --filter "name=testdriven-appcopy-db" --format "{{.Status}}" | grep -o "healthy\|unhealthy\|starting" || echo "unknown")

if [ "$BACKEND_HEALTH" = "healthy" ]; then
    print_status "PASS" "Backend container is healthy"
else
    print_status "FAIL" "Backend container health: $BACKEND_HEALTH"
fi

if [ "$FRONTEND_HEALTH" = "healthy" ] || [ "$FRONTEND_HEALTH" = "starting" ]; then
    print_status "PASS" "Frontend container is healthy/starting"
else
    print_status "FAIL" "Frontend container health: $FRONTEND_HEALTH"
fi

if [ "$DB_HEALTH" = "healthy" ]; then
    print_status "PASS" "Database container is healthy"
else
    print_status "FAIL" "Database container health: $DB_HEALTH"
fi

# PHASE 3: SERVICE CONNECTIVITY
echo -e "\n${BLUE}🔗 PHASE 3: SERVICE CONNECTIVITY${NC}"
echo "-------------------------------"

# Wait a moment for services to be ready
sleep 5

# Test backend direct access
if wait_for_service "http://localhost:5000/ping" 10; then
    BACKEND_RESPONSE=$(curl -s "http://localhost:5000/ping" | jq -r '.status' 2>/dev/null || echo "unknown")
    if [ "$BACKEND_RESPONSE" = "success" ]; then
        print_status "PASS" "Backend direct access working"
    else
        print_status "FAIL" "Backend ping returned: $BACKEND_RESPONSE"
    fi
else
    print_status "FAIL" "Backend not accessible at localhost:5000"
fi

# Test frontend access
if wait_for_service "http://localhost:3000" 10; then
    FRONTEND_TITLE=$(curl -s "http://localhost:3000" | grep -o '<title>.*</title>' || echo "")
    if [[ "$FRONTEND_TITLE" == *"Enhanced Savings Groups"* ]]; then
        print_status "PASS" "Frontend accessible and serving correct app"
    else
        print_status "FAIL" "Frontend not serving expected content"
    fi
else
    print_status "FAIL" "Frontend not accessible at localhost:3000"
fi

# Test API proxy
if wait_for_service "http://localhost:3000/api/ping" 10; then
    API_RESPONSE=$(curl -s "http://localhost:3000/api/ping" | jq -r '.status' 2>/dev/null || echo "unknown")
    if [ "$API_RESPONSE" = "success" ]; then
        print_status "PASS" "API proxy routing working"
    else
        print_status "FAIL" "API proxy returned: $API_RESPONSE"
    fi
else
    print_status "FAIL" "API proxy not working at localhost:3000/api/ping"
fi

# PHASE 4: AUTHENTICATION VALIDATION
echo -e "\n${BLUE}🔐 PHASE 4: AUTHENTICATION VALIDATION${NC}"
echo "------------------------------------"

# Test super admin login
SUPER_ADMIN_AUTH=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"email":"superadmin@testdriven.io","password":"superpassword123"}' \
    "http://localhost:3000/api/auth/login" | jq -r '.status' 2>/dev/null || echo "fail")

if [ "$SUPER_ADMIN_AUTH" = "success" ]; then
    print_status "PASS" "Super admin authentication working"
    
    # Get auth token for further tests
    AUTH_TOKEN=$(curl -s -X POST -H "Content-Type: application/json" \
        -d '{"email":"superadmin@testdriven.io","password":"superpassword123"}' \
        "http://localhost:3000/api/auth/login" | jq -r '.auth_token' 2>/dev/null || echo "")
else
    print_status "FAIL" "Super admin authentication failed"
    AUTH_TOKEN=""
fi

# Test demo user login
DEMO_USER_AUTH=$(curl -s -X POST -H "Content-Type: application/json" \
    -d '{"email":"sarah@kampala.ug","password":"password123"}' \
    "http://localhost:3000/api/auth/login" | jq -r '.status' 2>/dev/null || echo "fail")

if [ "$DEMO_USER_AUTH" = "success" ]; then
    print_status "PASS" "Demo user authentication working"
else
    print_status "FAIL" "Demo user authentication failed"
fi

# PHASE 5: FRONTEND CONFIGURATION VALIDATION
echo -e "\n${BLUE}🔧 PHASE 5: FRONTEND CONFIGURATION VALIDATION${NC}"
echo "---------------------------------------------"

# Check API base URL configuration
API_CONFIG=$(docker exec testdriven-appcopy-frontend-1 grep -r "localhost:5000" /usr/share/nginx/html/static/js/ 2>/dev/null || echo "")
if [ -z "$API_CONFIG" ]; then
    print_status "PASS" "Frontend API configuration correct (no direct backend calls)"
else
    print_status "FAIL" "Frontend still configured to call backend directly (CORS risk)"
fi

# PHASE 6: DATA VALIDATION
echo -e "\n${BLUE}📊 PHASE 6: DATA VALIDATION${NC}"
echo "----------------------------"

if [ -n "$AUTH_TOKEN" ]; then
    # Test savings groups endpoint
    GROUPS_RESPONSE=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
        "http://localhost:3000/api/savings-groups" | jq -r '.status' 2>/dev/null || echo "fail")
    
    if [ "$GROUPS_RESPONSE" = "success" ]; then
        print_status "PASS" "Savings groups API working"
        
        # Count groups
        GROUPS_COUNT=$(curl -s -H "Authorization: Bearer $AUTH_TOKEN" \
            "http://localhost:3000/api/savings-groups" | jq '.data.pagination.total' 2>/dev/null || echo "0")
        
        if [ "$GROUPS_COUNT" -ge 3 ]; then
            print_status "PASS" "Demo groups seeded ($GROUPS_COUNT groups found)"
        else
            print_status "FAIL" "Insufficient demo groups ($GROUPS_COUNT groups found)"
        fi
    else
        print_status "FAIL" "Savings groups API not working"
    fi
else
    print_status "FAIL" "Cannot test data endpoints - no auth token"
fi

# Check database seeding via backend logs
DB_SEED_STATUS=$(docker logs testdriven-appcopy-backend-1 2>/dev/null | grep -i "demo data" | tail -1 || echo "")
if [[ "$DB_SEED_STATUS" == *"completed"* ]] || [[ "$DB_SEED_STATUS" == *"seeding"* ]]; then
    print_status "PASS" "Database seeding completed"
else
    print_status "WARN" "Database seeding status unclear"
fi

# PHASE 6: FINAL SUMMARY
echo -e "\n${BLUE}📋 VALIDATION SUMMARY${NC}"
echo "===================="
echo -e "Total Checks: ${BLUE}$TOTAL_CHECKS${NC}"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"

SUCCESS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo -e "Success Rate: ${BLUE}$SUCCESS_RATE%${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 DEPLOYMENT VALIDATION SUCCESSFUL!${NC}"
    echo -e "${GREEN}All critical systems are operational.${NC}"
    exit 0
elif [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "\n${YELLOW}⚠️  DEPLOYMENT MOSTLY SUCCESSFUL${NC}"
    echo -e "${YELLOW}Some non-critical issues found. Review failed checks.${NC}"
    exit 1
else
    echo -e "\n${RED}❌ DEPLOYMENT VALIDATION FAILED${NC}"
    echo -e "${RED}Critical issues found. Review and fix before proceeding.${NC}"
    exit 2
fi
