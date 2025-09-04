#!/bin/bash

# Health Check Script for Local Development
# Checks if services are running and healthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost"
FRONTEND_PORT="3000"
BACKEND_PORT="5001"
TIMEOUT=10

failed_checks=0

# Function to check service health
check_service() {
    local service_name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    
    echo -n "🔍 Checking $service_name... "
    
    if response=$(curl -s -w "%{http_code}" -o /dev/null --max-time $TIMEOUT "$url" 2>/dev/null); then
        if [[ "$response" == "$expected_status" ]]; then
            echo -e "${GREEN}✅ HEALTHY (HTTP $response)${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠️  UNEXPECTED STATUS (HTTP $response, expected $expected_status)${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ UNREACHABLE${NC}"
        return 1
    fi
}

# Function to check if port is open
check_port() {
    local service_name="$1"
    local port="$2"
    
    echo -n "🔍 Checking $service_name port $port... "
    
    if nc -z localhost "$port" 2>/dev/null; then
        echo -e "${GREEN}✅ OPEN${NC}"
        return 0
    else
        echo -e "${RED}❌ CLOSED${NC}"
        return 1
    fi
}

echo "🏥 Health Check Report"
echo "====================="
echo "Timestamp: $(date)"
echo "Environment: Local Development"
echo ""

echo -e "${BLUE}Phase 1: Port Availability${NC}"
echo "=========================="

# Check if ports are open
check_port "Frontend" "$FRONTEND_PORT" || ((failed_checks++))
check_port "Backend" "$BACKEND_PORT" || ((failed_checks++))

echo -e "\n${BLUE}Phase 2: Service Health${NC}"
echo "========================"

# Check service endpoints
check_service "Frontend" "$BASE_URL:$FRONTEND_PORT/" || ((failed_checks++))
check_service "Backend API" "$BASE_URL:$BACKEND_PORT/users/ping" || ((failed_checks++))
check_service "Users Endpoint" "$BASE_URL:$BACKEND_PORT/users" || ((failed_checks++))

echo -e "\n${BLUE}Phase 3: Database Connectivity${NC}"
echo "==============================="

# Check database connectivity (if backend is running)
if curl -s "$BASE_URL:$BACKEND_PORT/users/ping" > /dev/null; then
    echo -n "🔍 Checking database connection... "
    
    # Try to get users list as a database connectivity test
    if curl -s "$BASE_URL:$BACKEND_PORT/users" | grep -q "users"; then
        echo -e "${GREEN}✅ DATABASE CONNECTED${NC}"
    else
        echo -e "${RED}❌ DATABASE CONNECTION FAILED${NC}"
        ((failed_checks++))
    fi
else
    echo -e "${YELLOW}⚠️  Backend not running, skipping database check${NC}"
fi

echo -e "\n${BLUE}Phase 4: Frontend-Backend Integration${NC}"
echo "====================================="

# Check if frontend can reach backend
echo -n "🔍 Checking frontend-backend integration... "
if curl -s "$BASE_URL:$FRONTEND_PORT/" | grep -q "TestDriven"; then
    echo -e "${GREEN}✅ FRONTEND LOADED${NC}"
else
    echo -e "${RED}❌ FRONTEND INTEGRATION FAILED${NC}"
    ((failed_checks++))
fi

# Summary
echo -e "\n${BLUE}Health Check Summary${NC}"
echo "==================="

if [ $failed_checks -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo "🎉 System is healthy and ready for development!"
    exit 0
else
    echo -e "${RED}❌ $failed_checks CHECK(S) FAILED${NC}"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  • Make sure both services are running:"
    echo "    - Frontend: cd services/client && npm start"
    echo "    - Backend: cd services/users && source venv/bin/activate && python run_flask.py"
    echo "  • Check that no other services are using ports $FRONTEND_PORT or $BACKEND_PORT"
    echo "  • Verify database is properly configured and accessible"
    exit 1
fi