#!/bin/bash

# =============================================================================
# TESTDRIVEN LOCAL DEPLOYMENT SCRIPT
# =============================================================================
# Complete local deployment following TestDriven.io best practices
# Includes Docker cleanup, validation, and deployment
# =============================================================================

set -e

echo "🚀 TESTDRIVEN LOCAL DEPLOYMENT"
echo "==============================="
echo "Following TestDriven.io best practices for local deployment"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "🔍 Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "ERROR: Docker is not installed"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "ERROR: Docker Compose is not installed"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "ERROR: Docker is not running"
        exit 1
    fi
    
    print_success "✅ Prerequisites check passed"
}

# Function to perform Docker cleanup
perform_cleanup() {
    print_status "🧹 Performing Docker cleanup..."
    
    # Stop existing containers
    docker-compose down -v 2>/dev/null || true
    
    # Clean up Docker resources
    echo "Removing unused Docker resources..."
    docker system prune -f
    
    print_success "✅ Docker cleanup completed"
}

# Function to build and start services
build_and_start() {
    print_status "🏗️ Building and starting services..."
    
    # Build services
    echo "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    echo "Starting services..."
    docker-compose up -d
    
    print_success "✅ Services started"
}

# Function to wait for services
wait_for_services() {
    print_status "⏳ Waiting for services to be ready..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        # Check if all containers are running
        local running_containers=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
        
        if [ "$running_containers" -eq 3 ]; then
            print_success "✅ All services are running"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "ERROR: Services failed to start within timeout"
            docker-compose ps
            docker-compose logs
            exit 1
        fi
        
        echo "Attempt $attempt/$max_attempts: Waiting for services..."
        sleep 5
        attempt=$((attempt + 1))
    done
}

# Function to validate deployment
validate_deployment() {
    print_status "🔍 Validating deployment..."
    
    # Test backend API
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:5000/ping > /dev/null 2>&1; then
            print_success "✅ Backend API is responding"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "ERROR: Backend API not responding"
            return 1
        fi
        
        echo "Attempt $attempt/$max_attempts: Testing backend API..."
        sleep 3
        attempt=$((attempt + 1))
    done
    
    # Test frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "✅ Frontend is responding"
    else
        print_warning "⚠️ Frontend may still be starting up"
    fi
    
    # Test database
    if docker-compose exec -T backend python manage.py db_status > /dev/null 2>&1; then
        print_success "✅ Database is healthy"
    else
        print_error "ERROR: Database health check failed"
        return 1
    fi
}

# Function to show deployment status
show_status() {
    print_status "📊 Deployment Status"
    echo "===================="
    
    # Show running containers
    echo "Running containers:"
    docker-compose ps
    
    echo ""
    echo "Service URLs:"
    echo "- Frontend: http://localhost:3000"
    echo "- Backend API: http://localhost:5000"
    echo "- Database: localhost:5432"
    
    echo ""
    echo "Available login credentials:"
    echo "- Super Admin: superadmin@testdriven.io / superpassword123"
    echo "- Service Admin: admin@savingsgroups.ug / admin123"
    
    echo ""
    echo "Management commands:"
    echo "- View logs: docker-compose logs [service]"
    echo "- Stop services: docker-compose down"
    echo "- Database status: docker-compose exec backend python manage.py db_status"
    echo "- Run tests: ./tdd-workflow.sh"
}

# Function to run comprehensive validation
run_validation() {
    if [ -f "$SCRIPT_DIR/validate-deployment.sh" ]; then
        print_status "🧪 Running comprehensive validation..."
        if "$SCRIPT_DIR/validate-deployment.sh"; then
            print_success "✅ Comprehensive validation passed"
        else
            print_error "❌ Comprehensive validation failed"
            return 1
        fi
    else
        print_warning "⚠️ Comprehensive validation script not found"
    fi
}

# Main execution
main() {
    cd "$PROJECT_ROOT"
    
    echo "Starting TestDriven local deployment process..."
    echo ""
    
    # Check if user wants to skip cleanup
    if [[ "$1" != "--no-cleanup" ]]; then
        check_prerequisites
        perform_cleanup
    else
        print_warning "⚠️ Skipping Docker cleanup (--no-cleanup flag used)"
    fi
    
    build_and_start
    wait_for_services
    
    # Give services a bit more time to fully initialize
    print_status "⏳ Allowing services to fully initialize..."
    sleep 10
    
    validate_deployment
    
    # Run comprehensive validation if requested
    if [[ "$1" == "--validate" ]] || [[ "$2" == "--validate" ]]; then
        run_validation
    fi
    
    show_status
    
    print_success ""
    print_success "🎉 DEPLOYMENT SUCCESSFUL!"
    print_success "========================="
    print_success "Your TestDriven application is now running locally"
    print_success "with full PostgreSQL compatibility for AWS deployment!"
    print_success ""
    print_success "Next steps:"
    print_success "1. Test your application at http://localhost:3000"
    print_success "2. Run comprehensive tests: ./tdd-workflow.sh"
    print_success "3. Deploy to AWS: Add GitHub secrets and push to production branch"
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        print_error ""
        print_error "❌ DEPLOYMENT FAILED"
        print_error "==================="
        print_error "Check the logs above for error details"
        print_error ""
        print_error "Troubleshooting:"
        print_error "- Run: docker-compose logs"
        print_error "- Clean restart: ./scripts/deploy-local.sh"
        print_error "- Docker cleanup: ./scripts/docker-cleanup.sh"
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Execute main function
main "$@"
