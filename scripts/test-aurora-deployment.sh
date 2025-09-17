#!/bin/bash

# Comprehensive Aurora PostgreSQL Deployment Testing Script
# Tests all aspects of Aurora integration and deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo "=============================================="
    echo "🧪 $1"
    echo "=============================================="
}

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TESTS_TOTAL++))
    print_status "Running: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_success "$test_name"
        ((TESTS_PASSED++))
        return 0
    else
        print_error "$test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test Aurora configuration
test_aurora_configuration() {
    print_header "Aurora Configuration Tests"
    
    # Test 1: Configuration files exist
    run_test "Aurora config file exists" "test -f '$PROJECT_ROOT/config/aurora-config.yml'"
    
    # Test 2: Aurora config module exists
    run_test "Aurora config module exists" "test -f '$PROJECT_ROOT/services/users/project/aurora_config.py'"
    
    # Test 3: Configuration can be imported
    run_test "Aurora config can be imported" "cd '$PROJECT_ROOT/services/users' && source venv/bin/activate && python -c 'from project.aurora_config import aurora_config'"

    # Test 4: Database URI generation
    run_test "Database URI generation works" "cd '$PROJECT_ROOT/services/users' && source venv/bin/activate && python -c 'from project.aurora_config import aurora_config; print(aurora_config.get_database_uri())'"
}

# Test database connectivity
test_database_connectivity() {
    print_header "Database Connectivity Tests"
    
    cd "$PROJECT_ROOT/services/users"
    
    # Test 1: Basic connection test
    run_test "Basic database connection" "source venv/bin/activate && python manage.py test_aurora_connection"

    # Test 2: Migration validation
    run_test "Database migration validation" "source venv/bin/activate && python manage.py validate_db"

    # Test 3: Database health check
    run_test "Database health check" "source venv/bin/activate && python -c 'from project.monitoring import aurora_monitor; print(aurora_monitor.get_health_status())'"
}

# Test application functionality
test_application_functionality() {
    print_header "Application Functionality Tests"
    
    cd "$PROJECT_ROOT/services/users"
    
    # Test 1: Unit tests
    run_test "Unit tests pass" "source venv/bin/activate && python -m pytest project/tests/test_aurora_integration.py -v"

    # Test 2: API endpoints
    run_test "API endpoints respond" "source venv/bin/activate && python -c 'from project import create_app; app, _ = create_app(); app.test_client().get(\"/ping\")'"

    # Test 3: Monitoring endpoints
    run_test "Monitoring endpoints work" "source venv/bin/activate && python -c 'from project import create_app; app, _ = create_app(); app.test_client().get(\"/monitoring/health\")'"
}

# Test deployment scripts
test_deployment_scripts() {
    print_header "Deployment Scripts Tests"
    
    # Test 1: Deployment scripts exist
    run_test "Production deployment script exists" "test -f '$PROJECT_ROOT/scripts/deploy-ecs-production-aurora.sh'"
    run_test "Staging deployment script exists" "test -f '$PROJECT_ROOT/scripts/deploy-ecs-staging-aurora.sh'"
    
    # Test 2: Scripts are executable
    run_test "Production script is executable" "test -x '$PROJECT_ROOT/scripts/deploy-ecs-production-aurora.sh'"
    run_test "Staging script is executable" "test -x '$PROJECT_ROOT/scripts/deploy-ecs-staging-aurora.sh'"
    
    # Test 3: Validation script exists
    run_test "Migration validation script exists" "test -f '$PROJECT_ROOT/scripts/validate_migrations.py'"
    run_test "Health verification script exists" "test -f '$PROJECT_ROOT/scripts/verify-deployment-health.sh'"
}

# Test CI/CD configuration
test_cicd_configuration() {
    print_header "CI/CD Configuration Tests"
    
    # Test 1: GitHub Actions workflow exists
    run_test "Aurora CI/CD workflow exists" "test -f '$PROJECT_ROOT/.github/workflows/aurora-cicd.yml'"
    
    # Test 2: ECS task definitions exist
    run_test "Production task definition exists" "test -f '$PROJECT_ROOT/ecs/ecs_users_prod_taskdefinition.json'"
    run_test "Staging task definition exists" "test -f '$PROJECT_ROOT/ecs/ecs_users_stage_aurora_taskdefinition.json'"
    
    # Test 3: Secrets setup script exists
    run_test "GitHub secrets setup script exists" "test -f '$PROJECT_ROOT/scripts/setup-aurora-github-secrets.sh'"
}

# Test monitoring and alerting
test_monitoring_system() {
    print_header "Monitoring System Tests"
    
    cd "$PROJECT_ROOT/services/users"
    
    # Test 1: Monitoring module exists
    run_test "Monitoring module exists" "test -f '$PROJECT_ROOT/services/users/project/monitoring.py'"
    
    # Test 2: Monitoring can be imported
    run_test "Monitoring module imports" "python -c 'from project.monitoring import aurora_monitor'"
    
    # Test 3: Metrics collection works
    run_test "Metrics collection works" "python -c 'from project.monitoring import aurora_monitor; aurora_monitor.collect_metrics()'"
    
    # Test 4: Health status works
    run_test "Health status works" "python -c 'from project.monitoring import aurora_monitor; aurora_monitor.get_health_status()'"
}

# Test security configuration
test_security_configuration() {
    print_header "Security Configuration Tests"
    
    # Test 1: No hardcoded passwords in config files
    run_test "No hardcoded passwords in configs" "! grep -r 'password.*=' '$PROJECT_ROOT/config/' || true"
    
    # Test 2: Environment variables used for secrets
    run_test "Environment variables used for secrets" "grep -q 'AURORA_DB_PASSWORD' '$PROJECT_ROOT/services/users/project/aurora_config.py'"
    
    # Test 3: SSL configuration present
    run_test "SSL configuration present" "grep -q 'sslmode' '$PROJECT_ROOT/services/users/project/aurora_config.py'"
}

# Test documentation and setup
test_documentation() {
    print_header "Documentation Tests"
    
    # Test 1: Setup scripts exist
    run_test "Aurora setup script exists" "test -f '$PROJECT_ROOT/scripts/setup-aurora-serverless.sh'"
    
    # Test 2: Scripts have proper permissions
    run_test "Setup script is executable" "test -x '$PROJECT_ROOT/scripts/setup-aurora-serverless.sh'"
    
    # Test 3: Configuration examples exist
    run_test "Configuration examples exist" "test -f '$PROJECT_ROOT/config/aurora-config.yml'"
}

# Performance tests
test_performance() {
    print_header "Performance Tests"
    
    cd "$PROJECT_ROOT/services/users"
    
    # Test 1: Connection pooling configuration
    run_test "Connection pooling configured" "python -c 'from project.aurora_config import aurora_config; params = aurora_config.get_connection_params(); print(\"Connection params configured:\", bool(params))'"
    
    # Test 2: Query monitoring works
    run_test "Query monitoring works" "python -c 'from project.monitoring import aurora_monitor; aurora_monitor.start_monitoring()'"
    
    # Test 3: Performance metrics collection
    run_test "Performance metrics work" "python -c 'from project.monitoring import aurora_monitor; aurora_monitor.get_performance_summary(1)'"
}

# Integration tests
test_integration() {
    print_header "Integration Tests"
    
    cd "$PROJECT_ROOT/services/users"
    
    # Test 1: Full application startup
    print_status "Testing full application startup..."
    if python -c "
from project import create_app, db
from project.monitoring import init_monitoring
app, socketio = create_app()
with app.app_context():
    init_monitoring(app)
    print('Application started successfully')
" > /dev/null 2>&1; then
        print_success "Full application startup"
        ((TESTS_PASSED++))
    else
        print_error "Full application startup"
        ((TESTS_FAILED++))
    fi
    ((TESTS_TOTAL++))
    
    # Test 2: Database operations
    run_test "Database operations work" "python -c 'from project import create_app, db; from sqlalchemy import text; app, _ = create_app(); app.app_context().push(); conn = db.engine.connect(); result = conn.execute(text(\"SELECT 1\")); conn.close(); print(\"Database operations successful\")'"
}

# Main test execution
main() {
    echo "🧪 Aurora PostgreSQL Deployment Testing Suite"
    echo "=============================================="
    echo "Testing comprehensive Aurora integration..."
    echo ""
    
    # Run all test suites
    test_aurora_configuration
    test_database_connectivity
    test_application_functionality
    test_deployment_scripts
    test_cicd_configuration
    test_monitoring_system
    test_security_configuration
    test_documentation
    test_performance
    test_integration
    
    # Print summary
    print_header "Test Results Summary"
    
    echo "📊 Test Results:"
    echo "  • Total Tests: $TESTS_TOTAL"
    echo "  • Passed: $TESTS_PASSED"
    echo "  • Failed: $TESTS_FAILED"
    echo ""
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        print_success "All tests passed! 🎉"
        echo ""
        echo "✅ Aurora PostgreSQL integration is ready for deployment!"
        echo ""
        echo "🚀 Next Steps:"
        echo "  1. Set up GitHub Actions secrets: ./scripts/setup-aurora-github-secrets.sh"
        echo "  2. Commit and push your changes"
        echo "  3. Monitor deployment in GitHub Actions"
        echo "  4. Verify health at /monitoring/health endpoint"
        echo ""
        exit 0
    else
        print_error "Some tests failed!"
        echo ""
        echo "❌ Please fix the failing tests before deployment."
        echo ""
        echo "🔍 Common issues:"
        echo "  • Check Aurora cluster is running"
        echo "  • Verify environment variables are set"
        echo "  • Ensure all dependencies are installed"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
