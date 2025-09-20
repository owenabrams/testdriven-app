#!/bin/bash

# 🏠 DEVELOPMENT ENVIRONMENT DEPLOYMENT SCRIPT
# Enforces development environment separation
# This script ONLY works for local development

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validate this is for local development only
validate_local_environment() {
    log_info "Validating local development environment..."
    
    # Check if we're in a production-like environment
    if [[ -n "$AWS_EXECUTION_ENV" ]] || [[ -n "$ECS_CONTAINER_METADATA_URI" ]]; then
        log_error "This script is for LOCAL DEVELOPMENT ONLY!"
        log_error "Detected cloud environment. Use environment-specific deployment scripts."
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    
    log_success "Local environment validated"
}

# Clean up any existing containers
cleanup_existing() {
    log_info "Cleaning up existing containers..."
    
    # Stop and remove containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Remove development images if they exist
    docker rmi testdriven-frontend-local:latest 2>/dev/null || true
    docker rmi testdriven-backend-local:latest 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Build local development images
build_local_images() {
    log_info "Building local development images..."
    
    # Set build variables
    export BUILD_VERSION="dev-local-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
    export BUILD_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    
    log_info "Build version: $BUILD_VERSION"
    log_info "Build timestamp: $BUILD_TIMESTAMP"
    
    # Build using docker-compose (development environment)
    docker-compose build --no-cache
    
    log_success "Local images built successfully"
}

# Start local development environment
start_local_environment() {
    log_info "Starting local development environment..."
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    
    # Wait for database
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose exec -T db pg_isready -U postgres > /dev/null 2>&1; then
            log_success "Database is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Database failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for backend
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:5000/ping > /dev/null 2>&1; then
            log_success "Backend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        log_error "Backend failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for frontend
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            log_success "Frontend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        log_warning "Frontend health check failed, but continuing..."
    fi
    
    log_success "Local development environment started"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying local deployment..."
    
    # Check container status
    if ! docker-compose ps | grep -q "Up"; then
        log_error "Some containers are not running"
        docker-compose ps
        exit 1
    fi
    
    # Check build info endpoints
    log_info "Checking build information..."
    
    # Backend build info
    if curl -s http://localhost:5000/build-info > /dev/null 2>&1; then
        BACKEND_ENV=$(curl -s http://localhost:5000/build-info | grep -o '"environment":"[^"]*' | cut -d'"' -f4)
        if [[ "$BACKEND_ENV" == "development" ]]; then
            log_success "Backend environment verified: $BACKEND_ENV"
        else
            log_error "Backend environment mismatch: $BACKEND_ENV (expected: development)"
            exit 1
        fi
    else
        log_warning "Backend build-info endpoint not available"
    fi
    
    # Frontend build info
    if curl -s http://localhost:3000/build-info > /dev/null 2>&1; then
        FRONTEND_INFO=$(curl -s http://localhost:3000/build-info)
        if echo "$FRONTEND_INFO" | grep -q "Environment: development"; then
            log_success "Frontend environment verified: development"
        else
            log_error "Frontend environment mismatch"
            echo "$FRONTEND_INFO"
            exit 1
        fi
    else
        log_warning "Frontend build-info endpoint not available"
    fi
    
    log_success "Deployment verification completed"
}

# Show deployment summary
show_summary() {
    echo ""
    echo "🎉 LOCAL DEVELOPMENT ENVIRONMENT READY!"
    echo "======================================"
    echo ""
    echo "📱 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:5000"
    echo "🗄️  Database: localhost:5432"
    echo ""
    echo "🔍 Build Information:"
    echo "   Frontend: http://localhost:3000/build-info"
    echo "   Backend: http://localhost:5000/build-info"
    echo ""
    echo "📋 Useful Commands:"
    echo "   View logs: docker-compose logs -f"
    echo "   Stop: docker-compose down"
    echo "   Restart: docker-compose restart"
    echo ""
    echo "⚠️  IMPORTANT: This is LOCAL DEVELOPMENT ONLY"
    echo "   - Images tagged as 'testdriven-*-local:latest'"
    echo "   - Never pushed to ECR"
    echo "   - Not suitable for production deployment"
    echo ""
}

# Main execution
main() {
    echo "🏠 Local Development Deployment"
    echo "==============================="
    echo ""
    
    validate_local_environment
    cleanup_existing
    build_local_images
    start_local_environment
    verify_deployment
    show_summary
}

# Help function
show_help() {
    echo "Local Development Deployment Script"
    echo ""
    echo "This script builds and runs the Enhanced Savings Groups Management System"
    echo "in a local development environment with proper environment separation."
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help, -h    Show this help message"
    echo "  --clean       Clean up and rebuild everything"
    echo ""
    echo "Features:"
    echo "  ✅ Environment validation (local development only)"
    echo "  ✅ Automatic cleanup of existing containers"
    echo "  ✅ Local image building with development tags"
    echo "  ✅ Health checks for all services"
    echo "  ✅ Build information verification"
    echo "  ✅ Never pushes to ECR (development safety)"
    echo ""
    echo "Access URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend:  http://localhost:5000"
    echo "  Database: localhost:5432"
}

# Parse arguments
case "${1:-}" in
    --help|-h)
        show_help
        exit 0
        ;;
    --clean)
        log_info "Clean rebuild requested"
        export CLEAN_BUILD=true
        ;;
esac

# Run main function
main
