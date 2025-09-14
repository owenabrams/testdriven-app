#!/bin/bash

# Complete Test Execution Script
# Runs all tests and generates detailed results

set -e

# Test results file
RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=""

log_and_print() {
    echo -e "$1" | tee -a "$RESULTS_FILE"
}

print_header() {
    log_and_print "${BLUE}=============================================="
    log_and_print "$1"
    log_and_print "===============================================${NC}"
}

print_section() {
    log_and_print "${YELLOW}----------------------------------------------"
    log_and_print "$1"
    log_and_print "----------------------------------------------${NC}"
}

inspect() {
    if [ $1 -ne 0 ]; then
        FAILED_TESTS="${FAILED_TESTS} $2"
        ((TESTS_FAILED++))
        log_and_print "${RED}❌ FAILED: $2${NC}"
    else
        ((TESTS_PASSED++))
        log_and_print "${GREEN}✅ PASSED: $2${NC}"
    fi
}

# Phase 1: Environment Setup
test_environment() {
    print_header "🔧 PHASE 1: ENVIRONMENT SETUP"
    
    log_and_print "🧹 Cleaning up any existing containers..."
    docker-compose down --volumes --remove-orphans 2>/dev/null || true
    
    log_and_print "🐳 Checking Docker setup..."
    if docker --version > /dev/null 2>&1; then
        inspect 0 "Docker Installation"
        docker --version >> "$RESULTS_FILE"
    else
        inspect 1 "Docker Installation"
    fi
    
    if docker-compose --version > /dev/null 2>&1; then
        inspect 0 "Docker Compose Installation"
        docker-compose --version >> "$RESULTS_FILE"
    else
        inspect 1 "Docker Compose Installation"
    fi
    
    log_and_print "📁 Checking project structure..."
    [ -f "docker-compose.yml" ] && inspect 0 "Docker Compose File" || inspect 1 "Docker Compose File"
    [ -f "cypress.config.js" ] && inspect 0 "Cypress Configuration" || inspect 1 "Cypress Configuration"
    [ -d "services/users" ] && inspect 0 "Backend Service Directory" || inspect 1 "Backend Service Directory"
    [ -d "client" ] && inspect 0 "Frontend Service Directory" || inspect 1 "Frontend Service Directory"
    [ -d "cypress/e2e" ] && inspect 0 "E2E Tests Directory" || inspect 1 "E2E Tests Directory"
}

# Phase 2: Backend Tests
test_backend() {
    print_header "🧪 PHASE 2: BACKEND UNIT TESTS"
    
    print_section "Starting Backend Services"
    log_and_print "🚀 Building and starting backend services..."
    
    if docker-compose up -d --build db backend >> "$RESULTS_FILE" 2>&1; then
        inspect 0 "Backend Services Startup"
    else
        inspect 1 "Backend Services Startup"
        return
    fi
    
    log_and_print "⏳ Waiting for services to be ready..."
    sleep 20
    
    print_section "Database Setup"
    log_and_print "🗄️  Setting up test database..."
    if docker-compose exec -T backend python manage.py recreate_db >> "$RESULTS_FILE" 2>&1; then
        inspect 0 "Database Recreation"
    else
        inspect 1 "Database Recreation"
    fi
    
    print_section "Backend Unit Tests"
    log_and_print "🧪 Running backend unit tests..."
    if docker-compose exec -T backend python manage.py test >> "$RESULTS_FILE" 2>&1; then
        inspect 0 "Backend Unit Tests"
    else
        inspect 1 "Backend Unit Tests"
    fi
    
    print_section "Code Quality"
    log_and_print "🔍 Running backend linting..."
    if docker-compose exec -T backend flake8 project >> "$RESULTS_FILE" 2>&1; then
        inspect 0 "Backend Linting"
    else
        inspect 1 "Backend Linting"
    fi
    
    log_and_print "🛑 Stopping backend services..."
    docker-compose stop backend db >> "$RESULTS_FILE" 2>&1
}

# Phase 3: Integration Tests
test_integration() {
    print_header "🔗 PHASE 3: INTEGRATION TESTS"
    
    print_section "Starting All Services"
    log_and_print "🚀 Starting complete application stack..."
    
    if docker-compose up -d --build >> "$RESULTS_FILE" 2>&1; then
        inspect 0 "Full Stack Startup"
    else
        inspect 1 "Full Stack Startup"
        return
    fi
    
    log_and_print "⏳ Waiting for all services to be ready..."
    sleep 30
    
    log_and_print "🗄️  Setting up integration test database..."
    docker-compose exec -T backend python manage.py recreate_db >> "$RESULTS_FILE" 2>&1
    docker-compose exec -T backend python manage.py seed_db >> "$RESULTS_FILE" 2>&1
    
    print_section "Service Health Checks"
    log_and_print "🔍 Testing backend health endpoint..."
    if curl -f http://localhost:5000/ping > /dev/null 2>&1; then
        inspect 0 "Backend Health Check"
    else
        inspect 1 "Backend Health Check"
    fi
    
    log_and_print "🔍 Testing frontend availability..."
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        inspect 0 "Frontend Availability"
    else
        inspect 1 "Frontend Availability"
    fi
    
    print_section "API Integration Tests"
    log_and_print "🔍 Testing user registration API..."
    REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/auth/register \
        -H "Content-Type: application/json" \
        -d '{"username":"testuser","email":"test@example.com","password":"testpassword123"}' 2>/dev/null)
    
    echo "Registration Response: $REGISTER_RESPONSE" >> "$RESULTS_FILE"
    
    if echo "$REGISTER_RESPONSE" | grep -q "success\|Successfully registered"; then
        inspect 0 "User Registration API"
    else
        inspect 1 "User Registration API"
    fi
    
    log_and_print "🛑 Stopping integration test services..."
    docker-compose down >> "$RESULTS_FILE" 2>&1
}

# Phase 4: Production Readiness
test_production_config() {
    print_header "🚀 PHASE 4: PRODUCTION READINESS"
    
    print_section "Configuration Validation"
    log_and_print "🔍 Validating production configurations..."
    
    [ -f "ecs/ecs_users_prod_taskdefinition.json" ] && inspect 0 "ECS Task Definitions" || inspect 1 "ECS Task Definitions"
    [ -f "infrastructure/alb-production.yml" ] && inspect 0 "ALB Configuration" || inspect 1 "ALB Configuration"
    [ -f ".github/workflows/main.yml" ] && inspect 0 "GitHub Actions Workflow" || inspect 1 "GitHub Actions Workflow"
    
    print_section "Production Scripts"
    log_and_print "🔍 Checking production deployment scripts..."
    [ -f "scripts/deploy-ecs-production-automated.sh" ] && inspect 0 "Production Deployment Script" || inspect 1 "Production Deployment Script"
    [ -f "scripts/test-production-e2e.sh" ] && inspect 0 "Production E2E Test Script" || inspect 1 "Production E2E Test Script"
    
    print_section "Secrets Configuration"
    log_and_print "🔍 Validating secrets setup..."
    [ -f "get-production-secrets.sh" ] && inspect 0 "Secrets Generation Script" || inspect 1 "Secrets Generation Script"
    
    if ./get-production-secrets.sh 72UWZ5Ez0tbtUqtB | grep -q "PRODUCTION_SECRET_KEY"; then
        inspect 0 "Secrets Generation"
    else
        inspect 1 "Secrets Generation"
    fi
}

# Main execution
main() {
    log_and_print "🧪 COMPLETE TEST SUITE FOR 3-SERVICE MICROSERVICES"
    log_and_print "Testing: Frontend + Backend + Database Architecture"
    log_and_print "Following TestDriven tutorial methodology with modern adaptations"
    log_and_print "Started at: $(date)"
    log_and_print ""
    
    # Run all test phases
    test_environment
    test_backend
    test_integration
    test_production_config
    
    # Final cleanup
    log_and_print ""
    print_section "Final Cleanup"
    docker-compose down --volumes --remove-orphans >> "$RESULTS_FILE" 2>&1 || true
    
    # Final results
    print_header "📊 COMPLETE TEST RESULTS"
    log_and_print "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
    log_and_print "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
    log_and_print "📊 Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
    log_and_print "📄 Detailed results saved to: $RESULTS_FILE"
    log_and_print "Completed at: $(date)"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        log_and_print "${GREEN}"
        log_and_print "🎉 ALL TESTS PASSED! Your application is ready for production deployment!"
        log_and_print "✅ Environment setup validated"
        log_and_print "✅ Backend unit tests passing"
        log_and_print "✅ Integration tests passing"
        log_and_print "✅ Production configuration validated"
        log_and_print ""
        log_and_print "🚀 Ready for production deployment:"
        log_and_print "   git push origin production"
        log_and_print "${NC}"
        exit 0
    else
        log_and_print "${RED}"
        log_and_print "❌ Some tests failed: $FAILED_TESTS"
        log_and_print "🔧 Please review the failed tests and fix any issues."
        log_and_print "📄 Check detailed logs in: $RESULTS_FILE"
        log_and_print "${NC}"
        exit 1
    fi
}

# Run main function
main "$@"
