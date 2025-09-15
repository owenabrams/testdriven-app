#!/bin/bash

# =============================================================================
# TESTDRIVEN END-TO-END VALIDATION SCRIPT
# =============================================================================
# Comprehensive validation following TestDriven.io best practices
# Tests database compatibility, microservices architecture, and deployment readiness
# =============================================================================

set -e

echo "🔍 TESTDRIVEN DEPLOYMENT VALIDATION"
echo "===================================="
echo "Following TestDriven.io best practices for deployment validation"
echo "===================================="

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

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${BLUE}🧪 Testing: $test_name${NC}"
    echo "----------------------------------------"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test 1: Docker Compose Configuration
test_docker_compose() {
    echo "Validating docker-compose.yml..."
    docker-compose config > /dev/null 2>&1
}

# Test 2: PostgreSQL Database Compatibility
test_postgresql_compatibility() {
    echo "Testing PostgreSQL compatibility..."
    
    # Check if PostgreSQL service is defined
    if ! docker-compose config | grep -q "postgres:13"; then
        echo "ERROR: PostgreSQL 13 not found in docker-compose.yml"
        return 1
    fi
    
    # Check if DATABASE_URL uses PostgreSQL
    if ! docker-compose config | grep -q "postgresql://"; then
        echo "ERROR: DATABASE_URL not configured for PostgreSQL"
        return 1
    fi
    
    echo "PostgreSQL 13 configuration validated"
    return 0
}

# Test 3: Microservices Architecture Validation
test_microservices_architecture() {
    echo "Validating 3-service microservices architecture..."
    
    # Check for required services
    local services=$(docker-compose config --services)
    local required_services=("backend" "frontend" "db")
    
    for service in "${required_services[@]}"; do
        if ! echo "$services" | grep -q "^$service$"; then
            echo "ERROR: Required service '$service' not found"
            return 1
        fi
    done
    
    # Ensure we don't have extra services (like swagger)
    local service_count=$(echo "$services" | wc -l)
    if [ "$service_count" -ne 3 ]; then
        echo "ERROR: Expected 3 services, found $service_count"
        echo "Services found: $services"
        return 1
    fi
    
    echo "3-service architecture validated (backend, frontend, db)"
    return 0
}

# Test 4: Database Commands Validation
test_database_commands() {
    echo "Testing database management commands..."
    
    # Start services
    docker-compose up -d db
    sleep 5
    
    # Test database commands exist
    docker-compose run --rm backend python manage.py --help | grep -q "migrate_and_seed" || {
        echo "ERROR: migrate_and_seed command not found"
        return 1
    }
    
    docker-compose run --rm backend python manage.py --help | grep -q "db_status" || {
        echo "ERROR: db_status command not found"
        return 1
    }
    
    echo "Database commands validated"
    return 0
}

# Test 5: Application Startup Test
test_application_startup() {
    echo "Testing complete application startup..."
    
    # Clean start
    docker-compose down -v
    sleep 2
    
    # Start all services
    docker-compose up -d
    
    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 30
    
    # Check if all containers are running
    local running_containers=$(docker-compose ps --services --filter "status=running" | wc -l)
    if [ "$running_containers" -ne 3 ]; then
        echo "ERROR: Not all services are running"
        docker-compose ps
        return 1
    fi
    
    echo "All services started successfully"
    return 0
}

# Test 6: API Endpoint Validation
test_api_endpoints() {
    echo "Testing API endpoints..."
    
    # Test backend health
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:5000/ping > /dev/null 2>&1; then
            echo "Backend API responding"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo "ERROR: Backend API not responding after $max_attempts attempts"
            return 1
        fi
        
        echo "Attempt $attempt/$max_attempts: Waiting for backend..."
        sleep 3
        attempt=$((attempt + 1))
    done
    
    # Test frontend
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "ERROR: Frontend not responding"
        return 1
    fi
    
    echo "API endpoints validated"
    return 0
}

# Test 7: Database Data Validation
test_database_data() {
    echo "Testing database data integrity..."
    
    # Check if database has expected data
    local user_count=$(docker-compose exec -T backend python -c "
from project import create_app
from project.api.models import User
app = create_app()
with app.app_context():
    print(User.query.count())
" 2>/dev/null | tail -1)
    
    if [ "$user_count" -lt 1 ]; then
        echo "ERROR: No users found in database"
        return 1
    fi
    
    echo "Database contains $user_count users"
    return 0
}

# Test 8: Docker Resource Usage
test_docker_resources() {
    echo "Checking Docker resource usage..."
    
    # Check disk usage
    local disk_usage=$(docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}" | tail -n +2)
    echo "Docker disk usage:"
    echo "$disk_usage"
    
    # Warn if usage is high (this is informational, not a failure)
    echo "Docker resource check completed"
    return 0
}

# Main execution
main() {
    echo "Starting comprehensive deployment validation..."
    echo ""
    
    # Run all tests
    run_test "Docker Compose Configuration" "test_docker_compose"
    run_test "PostgreSQL Database Compatibility" "test_postgresql_compatibility"
    run_test "Microservices Architecture" "test_microservices_architecture"
    run_test "Database Commands" "test_database_commands"
    run_test "Application Startup" "test_application_startup"
    run_test "API Endpoints" "test_api_endpoints"
    run_test "Database Data Integrity" "test_database_data"
    run_test "Docker Resource Usage" "test_docker_resources"
    
    # Final results
    echo ""
    echo "🎯 VALIDATION RESULTS"
    echo "===================="
    echo -e "Total Tests: $TOTAL_TESTS"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
        echo -e "${GREEN}Your TestDriven application is ready for deployment!${NC}"
        echo ""
        echo "✅ PostgreSQL compatibility confirmed"
        echo "✅ 3-service microservices architecture validated"
        echo "✅ Database management working correctly"
        echo "✅ All services running properly"
        echo ""
        echo "🚀 Ready for AWS deployment!"
        return 0
    else
        echo ""
        echo -e "${RED}❌ VALIDATION FAILED${NC}"
        echo -e "${RED}Please fix the failed tests before deployment${NC}"
        return 1
    fi
}

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up test environment..."
    docker-compose down -v > /dev/null 2>&1 || true
}

# Set trap for cleanup
trap cleanup EXIT

# Execute main function
main "$@"
