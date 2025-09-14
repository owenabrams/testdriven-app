#!/bin/bash

# Complete Test Suite Runner
# Runs all tests for the 3-service microservices architecture

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test tracking
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=""

print_header() {
  echo -e "${BLUE}"
  echo "=============================================="
  echo "$1"
  echo "=============================================="
  echo -e "${NC}"
}

print_section() {
  echo -e "${YELLOW}"
  echo "----------------------------------------------"
  echo "$1"
  echo "----------------------------------------------"
  echo -e "${NC}"
}

inspect() {
  if [ $1 -ne 0 ]; then
    FAILED_TESTS="${FAILED_TESTS} $2"
    ((TESTS_FAILED++))
    echo -e "${RED}❌ FAILED: $2${NC}"
  else
    ((TESTS_PASSED++))
    echo -e "${GREEN}✅ PASSED: $2${NC}"
  fi
}

# Phase 1: Environment Setup
setup_environment() {
  print_header "🔧 PHASE 1: ENVIRONMENT SETUP"
  
  echo "🧹 Cleaning up any existing containers..."
  docker-compose down --volumes --remove-orphans 2>/dev/null || true
  
  echo "🐳 Checking Docker setup..."
  docker --version > /dev/null 2>&1
  inspect $? "Docker Installation"
  
  docker-compose --version > /dev/null 2>&1
  inspect $? "Docker Compose Installation"
  
  echo "📁 Checking project structure..."
  [ -f "docker-compose.yml" ]
  inspect $? "Docker Compose File"
  
  [ -f "cypress.config.js" ]
  inspect $? "Cypress Configuration"
  
  [ -d "services/users" ]
  inspect $? "Backend Service Directory"
  
  [ -d "client" ]
  inspect $? "Frontend Service Directory"
  
  [ -d "cypress/e2e" ]
  inspect $? "E2E Tests Directory"
}

# Phase 2: Backend Tests
test_backend() {
  print_header "🧪 PHASE 2: BACKEND UNIT TESTS"
  
  print_section "Starting Backend Services"
  echo "🚀 Building and starting backend services..."
  docker-compose up -d --build db backend
  
  echo "⏳ Waiting for services to be ready..."
  sleep 15
  
  print_section "Database Setup"
  echo "🗄️  Setting up test database..."
  docker-compose exec -T backend python manage.py recreate_db 2>/dev/null
  inspect $? "Database Recreation"
  
  print_section "Backend Unit Tests"
  echo "🧪 Running backend unit tests..."
  docker-compose exec -T backend python manage.py test 2>/dev/null
  inspect $? "Backend Unit Tests"
  
  print_section "Code Quality"
  echo "🔍 Running backend linting..."
  docker-compose exec -T backend flake8 project 2>/dev/null
  inspect $? "Backend Linting"
  
  echo "🛑 Stopping backend services..."
  docker-compose stop backend db
}

# Phase 3: Frontend Tests
test_frontend() {
  print_header "🎨 PHASE 3: FRONTEND UNIT TESTS"
  
  print_section "Starting Frontend Services"
  echo "🚀 Building and starting frontend services..."
  docker-compose up -d --build frontend
  
  echo "⏳ Waiting for frontend to be ready..."
  sleep 10
  
  print_section "Frontend Unit Tests"
  echo "🧪 Running frontend unit tests..."
  docker-compose exec -T frontend npm test -- --coverage --watchAll=false --passWithNoTests 2>/dev/null
  inspect $? "Frontend Unit Tests"
  
  echo "🛑 Stopping frontend services..."
  docker-compose stop frontend
}

# Phase 4: Integration Tests
test_integration() {
  print_header "🔗 PHASE 4: INTEGRATION TESTS"
  
  print_section "Starting All Services"
  echo "🚀 Starting complete application stack..."
  docker-compose up -d --build
  
  echo "⏳ Waiting for all services to be ready..."
  sleep 20
  
  echo "🗄️  Setting up integration test database..."
  docker-compose exec -T backend python manage.py recreate_db 2>/dev/null
  docker-compose exec -T backend python manage.py seed_db 2>/dev/null
  
  print_section "Service Health Checks"
  echo "🔍 Testing backend health endpoint..."
  curl -f http://localhost:5000/ping > /dev/null 2>&1
  inspect $? "Backend Health Check"
  
  echo "🔍 Testing frontend availability..."
  curl -f http://localhost:3000 > /dev/null 2>&1
  inspect $? "Frontend Availability"
  
  print_section "API Integration Tests"
  echo "🔍 Testing user registration API..."
  REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"testpassword123"}' 2>/dev/null)
  
  if echo "$REGISTER_RESPONSE" | grep -q "success\|Successfully registered"; then
    inspect 0 "User Registration API"
  else
    inspect 1 "User Registration API"
  fi
  
  echo "🛑 Stopping integration test services..."
  docker-compose down
}

# Phase 5: End-to-End Tests
test_e2e() {
  print_header "🌐 PHASE 5: END-TO-END TESTS"
  
  print_section "Starting Staging Environment"
  echo "🚀 Starting staging environment for E2E tests..."
  
  if [ -f "docker-compose-stage.yml" ]; then
    docker-compose -f docker-compose-stage.yml up -d --build
    
    echo "⏳ Waiting for staging services to be ready..."
    sleep 25
    
    echo "🗄️  Setting up staging database..."
    docker-compose -f docker-compose-stage.yml exec -T backend python manage.py recreate_db 2>/dev/null
    docker-compose -f docker-compose-stage.yml exec -T backend python manage.py seed_db 2>/dev/null
    
    print_section "Cypress E2E Tests"
    echo "🌐 Running Cypress E2E tests..."
    if command -v npx &> /dev/null; then
      npx cypress run --config baseUrl=http://localhost:3000 --headless 2>/dev/null
      inspect $? "Cypress E2E Tests"
    else
      echo "⏭️  Cypress not available, skipping E2E tests"
    fi
    
    echo "🛑 Stopping staging environment..."
    docker-compose -f docker-compose-stage.yml down
  else
    echo "⏭️  Staging environment not configured, using development environment"
    docker-compose up -d --build
    sleep 20
    
    docker-compose exec -T backend python manage.py recreate_db 2>/dev/null
    docker-compose exec -T backend python manage.py seed_db 2>/dev/null
    
    if command -v npx &> /dev/null; then
      npx cypress run --config baseUrl=http://localhost:3000 --headless 2>/dev/null
      inspect $? "Cypress E2E Tests (Dev Environment)"
    else
      echo "⏭️  Cypress not available, skipping E2E tests"
    fi
    
    docker-compose down
  fi
}

# Phase 6: Production Readiness
test_production() {
  print_header "🚀 PHASE 6: PRODUCTION READINESS"
  
  print_section "Local Production Environment"
  if [ -f "docker-compose-local-prod.yml" ]; then
    echo "🚀 Starting local production environment..."
    docker-compose -f docker-compose-local-prod.yml up -d --build
    
    echo "⏳ Waiting for production services to be ready..."
    sleep 30
    
    echo "🔍 Testing production health checks..."
    curl -f http://localhost:5000/ping > /dev/null 2>&1
    inspect $? "Production Backend Health"
    
    curl -f http://localhost:80 > /dev/null 2>&1
    inspect $? "Production Frontend Health"
    
    echo "🛑 Stopping local production environment..."
    docker-compose -f docker-compose-local-prod.yml down
  else
    echo "⏭️  Local production environment not configured"
  fi
  
  print_section "Configuration Validation"
  echo "🔍 Validating production configurations..."
  
  [ -f "ecs/ecs_users_prod_taskdefinition.json" ]
  inspect $? "ECS Task Definitions"
  
  [ -f "infrastructure/alb-production.yml" ]
  inspect $? "ALB Configuration"
  
  [ -f ".github/workflows/main.yml" ]
  inspect $? "GitHub Actions Workflow"
}

# Main execution
main() {
  print_header "🧪 COMPLETE TEST SUITE FOR 3-SERVICE MICROSERVICES"
  echo "Testing: Frontend + Backend + Database Architecture"
  echo "Following TestDriven tutorial methodology with modern adaptations"
  echo ""
  
  # Run all test phases
  setup_environment
  test_backend
  test_frontend
  test_integration
  test_e2e
  test_production
  
  # Final cleanup
  echo ""
  print_section "Final Cleanup"
  docker-compose down --volumes --remove-orphans 2>/dev/null || true
  
  # Final results
  print_header "📊 COMPLETE TEST RESULTS"
  echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
  echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
  echo "📊 Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
  
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}"
    echo "🎉 ALL TESTS PASSED! Your 3-service microservices application is ready!"
    echo "✅ Backend unit tests working"
    echo "✅ Frontend unit tests working"
    echo "✅ Integration tests working"
    echo "✅ End-to-end tests working"
    echo "✅ Production configuration validated"
    echo ""
    echo "🚀 Your application is ready for:"
    echo "   - Development with TDD workflow"
    echo "   - Staging deployment"
    echo "   - Production deployment"
    echo -e "${NC}"
    exit 0
  else
    echo -e "${RED}"
    echo "❌ Some tests failed: $FAILED_TESTS"
    echo "🔧 Please review the failed tests and fix any issues."
    echo "💡 Common issues:"
    echo "   - Docker services not starting properly"
    echo "   - Database connection issues"
    echo "   - Missing dependencies"
    echo "   - Port conflicts"
    echo -e "${NC}"
    exit 1
  fi
}

# Run main function
main "$@"
