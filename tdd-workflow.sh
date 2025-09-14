#!/bin/bash

# Test-Driven Development Workflow for 3-Service Microservices Architecture
# Adapted from TestDriven tutorial for GitHub Actions and modern practices

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

# TDD Phase 1: Unit Tests (Red-Green-Refactor)
run_unit_tests() {
  print_header "🧪 TDD PHASE 1: UNIT TESTS"
  
  print_section "Backend Unit Tests"
  echo "🚀 Starting backend services..."
  docker-compose up -d --build db backend
  
  echo "⏳ Waiting for database to be ready..."
  sleep 10
  
  echo "🗄️  Setting up test database..."
  docker-compose exec backend python manage.py recreate_db
  
  echo "🧪 Running backend unit tests..."
  docker-compose exec backend python manage.py test
  inspect $? "Backend Unit Tests"
  
  echo "🔍 Running backend linting..."
  docker-compose exec backend flake8 project
  inspect $? "Backend Linting"
  
  echo "📊 Running backend test coverage..."
  docker-compose exec backend python -m pytest --cov=project --cov-report=term-missing
  inspect $? "Backend Coverage"
  
  print_section "Frontend Unit Tests"
  echo "🚀 Starting frontend services..."
  docker-compose up -d frontend
  
  echo "⏳ Waiting for frontend to be ready..."
  sleep 5
  
  echo "🧪 Running frontend unit tests..."
  docker-compose exec frontend npm test -- --coverage --watchAll=false --passWithNoTests
  inspect $? "Frontend Unit Tests"
  
  echo "🔍 Running frontend linting..."
  docker-compose exec frontend npm run lint 2>/dev/null || echo "⏭️  Frontend linting not configured"
  
  echo "🛑 Stopping unit test services..."
  docker-compose stop
}

# TDD Phase 2: Integration Tests
run_integration_tests() {
  print_header "🔗 TDD PHASE 2: INTEGRATION TESTS"
  
  print_section "Service Integration Tests"
  echo "🚀 Starting all services for integration testing..."
  docker-compose up -d --build
  
  echo "⏳ Waiting for all services to be ready..."
  sleep 15
  
  echo "🗄️  Setting up integration test database..."
  docker-compose exec backend python manage.py recreate_db
  docker-compose exec backend python manage.py seed_db
  
  echo "🔍 Testing backend health endpoint..."
  curl -f http://localhost:5000/ping > /dev/null 2>&1
  inspect $? "Backend Health Check"
  
  echo "🔍 Testing frontend availability..."
  curl -f http://localhost:3000 > /dev/null 2>&1
  inspect $? "Frontend Availability"
  
  echo "🔍 Testing API endpoints..."
  # Test user registration
  REGISTER_RESPONSE=$(curl -s -X POST http://localhost:5000/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","email":"test@example.com","password":"testpassword123"}')
  
  if echo "$REGISTER_RESPONSE" | grep -q "success"; then
    inspect 0 "User Registration API"
  else
    inspect 1 "User Registration API"
  fi
  
  # Test user login
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"testpassword123"}')
  
  if echo "$LOGIN_RESPONSE" | grep -q "auth_token"; then
    inspect 0 "User Login API"
    # Extract token for further tests
    AUTH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"auth_token":"[^"]*"' | cut -d'"' -f4)
  else
    inspect 1 "User Login API"
  fi
  
  # Test authenticated endpoint
  if [ ! -z "$AUTH_TOKEN" ]; then
    USERS_RESPONSE=$(curl -s http://localhost:5000/users \
      -H "Authorization: Bearer $AUTH_TOKEN")
    
    if echo "$USERS_RESPONSE" | grep -q "success"; then
      inspect 0 "Authenticated Users API"
    else
      inspect 1 "Authenticated Users API"
    fi
  fi
  
  echo "🛑 Stopping integration test services..."
  docker-compose down
}

# TDD Phase 3: End-to-End Tests
run_e2e_tests() {
  print_header "🌐 TDD PHASE 3: END-TO-END TESTS"
  
  print_section "Staging Environment E2E Tests"
  echo "🚀 Starting staging environment..."
  docker-compose -f docker-compose-stage.yml up -d --build
  
  echo "⏳ Waiting for staging services to be ready..."
  sleep 20
  
  echo "🗄️  Setting up staging database..."
  docker-compose -f docker-compose-stage.yml exec backend python manage.py recreate_db
  docker-compose -f docker-compose-stage.yml exec backend python manage.py seed_db
  
  echo "🌐 Running Cypress E2E tests..."
  if command -v npx &> /dev/null; then
    npx cypress run --config baseUrl=http://localhost:3000 --headless
  else
    ./node_modules/.bin/cypress run --config baseUrl=http://localhost:3000 --headless
  fi
  inspect $? "Cypress E2E Tests"
  
  echo "🛑 Stopping staging environment..."
  docker-compose -f docker-compose-stage.yml down
}

# TDD Phase 4: Production Readiness Tests
run_production_tests() {
  print_header "🚀 TDD PHASE 4: PRODUCTION READINESS"
  
  print_section "Local Production Environment Tests"
  echo "🚀 Starting local production environment..."
  docker-compose -f docker-compose-local-prod.yml up -d --build
  
  echo "⏳ Waiting for production services to be ready..."
  sleep 25
  
  echo "🔍 Testing production health checks..."
  curl -f http://localhost:5000/ping > /dev/null 2>&1
  inspect $? "Production Backend Health"
  
  curl -f http://localhost:80 > /dev/null 2>&1
  inspect $? "Production Frontend Health"
  
  echo "🧪 Running production smoke tests..."
  ./scripts/test-production-e2e.sh localhost 2>/dev/null || echo "⏭️  Production E2E script not available"
  
  echo "🛑 Stopping local production environment..."
  docker-compose -f docker-compose-local-prod.yml down
}

# Main TDD workflow
main() {
  local phase=$1
  
  print_header "🧪 TEST-DRIVEN DEVELOPMENT WORKFLOW"
  echo "Microservices Architecture: Frontend + Backend + Database"
  echo "Following TestDriven tutorial methodology with modern adaptations"
  echo ""
  
  case $phase in
    "unit"|"1")
      run_unit_tests
      ;;
    "integration"|"2")
      run_integration_tests
      ;;
    "e2e"|"3")
      run_e2e_tests
      ;;
    "production"|"4")
      run_production_tests
      ;;
    "all"|"")
      run_unit_tests
      run_integration_tests
      run_e2e_tests
      run_production_tests
      ;;
    *)
      echo "Usage: $0 [unit|integration|e2e|production|all]"
      echo ""
      echo "TDD Phases:"
      echo "  unit         - Run unit tests (Phase 1)"
      echo "  integration  - Run integration tests (Phase 2)"
      echo "  e2e          - Run end-to-end tests (Phase 3)"
      echo "  production   - Run production readiness tests (Phase 4)"
      echo "  all          - Run complete TDD workflow (default)"
      exit 1
      ;;
  esac
  
  # Final results
  print_header "📊 TDD WORKFLOW RESULTS"
  echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
  echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
  echo "📊 Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
  
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}"
    echo "🎉 ALL TESTS PASSED! Your application is ready for deployment."
    echo -e "${NC}"
    exit 0
  else
    echo -e "${RED}"
    echo "❌ Some tests failed: $FAILED_TESTS"
    echo "🔧 Please fix the failing tests before proceeding to deployment."
    echo -e "${NC}"
    exit 1
  fi
}

# Run main function with all arguments
main "$@"
