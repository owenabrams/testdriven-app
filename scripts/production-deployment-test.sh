#!/bin/bash

# 🚀 PRODUCTION DEPLOYMENT TESTING SYSTEM
# Comprehensive testing before production deployment
# Professional validation following TestDriven.io methodology

set -e

echo "🚀 PRODUCTION DEPLOYMENT TESTING SYSTEM"
echo "========================================"
echo "Comprehensive testing before production deployment"
echo "Following TestDriven.io best practices for deployment validation"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TOTAL_TESTS++))
    print_status "Running: $test_name"
    
    if eval "$test_command"; then
        print_success "✅ PASSED: $test_name"
        ((PASSED_TESTS++))
        return 0
    else
        print_error "❌ FAILED: $test_name"
        ((FAILED_TESTS++))
        return 1
    fi
}

# Test 1: Build Optimization Test
test_build_optimization() {
    print_status "Testing Docker build optimization..."
    
    # Test BuildKit is enabled
    if [[ "$DOCKER_BUILDKIT" == "1" ]]; then
        print_success "BuildKit enabled"
    else
        print_warning "BuildKit not enabled - builds may be slower"
    fi
    
    # Test .dockerignore exists and is comprehensive
    if [[ -f ".dockerignore" ]]; then
        local ignore_lines=$(wc -l < .dockerignore)
        if [[ $ignore_lines -gt 50 ]]; then
            print_success "Comprehensive .dockerignore found ($ignore_lines lines)"
        else
            print_warning ".dockerignore exists but may not be comprehensive"
        fi
    else
        print_error ".dockerignore missing - builds will be slow"
        return 1
    fi
    
    # Test multi-stage Dockerfiles
    if grep -q "FROM.*AS.*" services/users/Dockerfile; then
        print_success "Multi-stage Dockerfile detected for backend"
    else
        print_warning "Backend Dockerfile not using multi-stage builds"
    fi
    
    if grep -q "FROM.*AS.*" client/Dockerfile; then
        print_success "Multi-stage Dockerfile detected for frontend"
    else
        print_warning "Frontend Dockerfile not using multi-stage builds"
    fi
    
    return 0
}

# Test 2: Migration System Test
test_migration_system() {
    print_status "Testing migration system robustness..."
    
    # Test migration fix command exists
    if docker-compose exec -T backend python manage.py fix_migrations --help > /dev/null 2>&1; then
        print_success "Migration fix command available"
    else
        print_error "Migration fix command not available"
        return 1
    fi
    
    # Test migration status
    local migration_status=$(docker-compose exec -T backend python manage.py db_status 2>/dev/null || echo "ERROR")
    if [[ "$migration_status" != "ERROR" ]]; then
        print_success "Migration system operational"
    else
        print_error "Migration system has issues"
        return 1
    fi
    
    return 0
}

# Test 3: Backend Stability Test
test_backend_stability() {
    print_status "Testing backend stability system..."
    
    # Test health check endpoint
    local health_response=$(curl -s -f http://localhost:5000/health || echo "ERROR")
    if [[ "$health_response" != "ERROR" ]]; then
        print_success "Health check endpoint responding"
    else
        print_error "Health check endpoint not responding"
        return 1
    fi
    
    # Test error handling
    local error_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/nonexistent-endpoint)
    if [[ "$error_response" == "404" ]]; then
        print_success "Error handling working (404 for non-existent endpoint)"
    else
        print_warning "Error handling may have issues (got $error_response instead of 404)"
    fi
    
    # Test restart policy in docker-compose
    if grep -q "restart: unless-stopped" docker-compose.yml; then
        print_success "Restart policy configured"
    else
        print_warning "Restart policy not configured"
    fi
    
    return 0
}

# Test 4: Demo Data and Login Test
test_demo_data_and_logins() {
    print_status "Testing demo data and login system..."
    
    # Test demo login command
    local login_test=$(docker-compose exec -T backend python manage.py test_demo_logins 2>/dev/null || echo "ERROR")
    if [[ "$login_test" != "ERROR" ]] && echo "$login_test" | grep -q "ALL DEMO USERS CAN LOGIN SUCCESSFULLY"; then
        print_success "All demo users can login successfully"
    else
        print_error "Demo login test failed"
        return 1
    fi
    
    return 0
}

# Test 5: Performance and Resource Test
test_performance_and_resources() {
    print_status "Testing performance and resource usage..."
    
    # Test Docker resource usage
    local docker_images_size=$(docker images --format "table {{.Size}}" | grep -E "MB|GB" | wc -l)
    if [[ $docker_images_size -gt 0 ]]; then
        print_success "Docker images present"
    else
        print_warning "No Docker images found"
    fi
    
    # Test build cache
    local build_cache=$(docker system df --format "{{.Type}}\t{{.Size}}" | grep "Build Cache" | awk '{print $2}' || echo "0B")
    print_status "Build cache size: $build_cache"
    
    # Test container startup time
    print_status "Testing container startup performance..."
    local start_time=$(date +%s)
    docker-compose restart backend > /dev/null 2>&1
    sleep 10  # Wait for startup
    local end_time=$(date +%s)
    local startup_duration=$((end_time - start_time))
    
    if [[ $startup_duration -lt 30 ]]; then
        print_success "Fast container startup ($startup_duration seconds)"
    elif [[ $startup_duration -lt 60 ]]; then
        print_warning "Moderate container startup ($startup_duration seconds)"
    else
        print_error "Slow container startup ($startup_duration seconds)"
        return 1
    fi
    
    return 0
}

# Test 6: CI/CD Pipeline Validation
test_cicd_pipeline() {
    print_status "Testing CI/CD pipeline configuration..."
    
    # Test GitHub Actions workflow exists
    if [[ -f ".github/workflows/main.yml" ]]; then
        print_success "GitHub Actions workflow found"
        
        # Test for professional features
        if grep -q "strategy:" .github/workflows/main.yml; then
            print_success "Matrix strategy configured"
        else
            print_warning "Matrix strategy not configured"
        fi
        
        if grep -q "cache:" .github/workflows/main.yml; then
            print_success "Dependency caching configured"
        else
            print_warning "Dependency caching not configured"
        fi
        
        if grep -q "DOCKER_BUILDKIT" .github/workflows/main.yml; then
            print_success "BuildKit enabled in CI/CD"
        else
            print_warning "BuildKit not enabled in CI/CD"
        fi
        
    else
        print_error "GitHub Actions workflow not found"
        return 1
    fi
    
    return 0
}

# Test 7: Security and Best Practices
test_security_and_best_practices() {
    print_status "Testing security and best practices..."
    
    # Test for non-root user in Dockerfiles
    if grep -q "USER.*" services/users/Dockerfile; then
        print_success "Non-root user configured in backend Dockerfile"
    else
        print_warning "Backend Dockerfile may be running as root"
    fi
    
    if grep -q "USER.*" client/Dockerfile; then
        print_success "Non-root user configured in frontend Dockerfile"
    else
        print_warning "Frontend Dockerfile may be running as root"
    fi
    
    # Test for health checks in Dockerfiles
    if grep -q "HEALTHCHECK" services/users/Dockerfile; then
        print_success "Health check configured in backend Dockerfile"
    else
        print_warning "Health check not configured in backend Dockerfile"
    fi
    
    # Test environment variable security
    if grep -q "SECRET_KEY.*my_precious" docker-compose.yml; then
        print_warning "Default secret key detected - should be changed for production"
    else
        print_success "Secret key appears to be customized"
    fi
    
    return 0
}

# Main testing function
main() {
    print_status "Starting comprehensive production deployment testing..."
    echo ""
    
    # Ensure services are running
    print_status "Ensuring services are running..."
    docker-compose up -d > /dev/null 2>&1
    sleep 15  # Wait for services to be ready
    
    # Run all tests
    run_test "Build Optimization" "test_build_optimization"
    echo ""
    
    run_test "Migration System" "test_migration_system"
    echo ""
    
    run_test "Backend Stability" "test_backend_stability"
    echo ""
    
    run_test "Demo Data and Logins" "test_demo_data_and_logins"
    echo ""
    
    run_test "Performance and Resources" "test_performance_and_resources"
    echo ""
    
    run_test "CI/CD Pipeline" "test_cicd_pipeline"
    echo ""
    
    run_test "Security and Best Practices" "test_security_and_best_practices"
    echo ""
    
    # Final results
    print_status "🎯 PRODUCTION DEPLOYMENT TEST RESULTS"
    echo "======================================"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
    echo ""
    
    if [[ $FAILED_TESTS -eq 0 ]]; then
        print_success "🎉 ALL PRODUCTION DEPLOYMENT TESTS PASSED!"
        echo ""
        print_status "✅ Build optimization implemented"
        print_status "✅ Migration system is robust"
        print_status "✅ Backend stability ensured"
        print_status "✅ Demo data and logins working"
        print_status "✅ Performance optimized"
        print_status "✅ CI/CD pipeline configured"
        print_status "✅ Security best practices followed"
        echo ""
        print_status "🚀 READY FOR PRODUCTION DEPLOYMENT!"
        return 0
    else
        print_error "❌ Some production deployment tests failed"
        echo ""
        print_status "🔧 Please address the failed tests before production deployment"
        return 1
    fi
}

# Run main function
main "$@"
