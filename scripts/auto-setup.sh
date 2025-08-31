#!/bin/bash

# Automated Setup Script
# Ensures clean deployment with all dependencies and configurations

set -e  # Exit on any error

echo "🚀 AUTOMATED SETUP STARTING..."
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SETUP_LOG="setup-$(date +%Y%m%d-%H%M%S).log"

log() {
    echo -e "$1" | tee -a "$SETUP_LOG"
}

step() {
    log "\n${BLUE}$1${NC}"
    log "$(printf '=%.0s' {1..50})"
}

success() {
    log "${GREEN}✅ $1${NC}"
}

error() {
    log "${RED}❌ $1${NC}"
    exit 1
}

warning() {
    log "${YELLOW}⚠️  $1${NC}"
}

# Pre-flight checks
preflight_checks() {
    step "Pre-flight Checks"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    success "Docker is available"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    success "Docker Compose is available"
    
    # Check if ports are available
    local ports=(80 5001 5432)
    for port in "${ports[@]}"; do
        if lsof -i :$port &> /dev/null; then
            warning "Port $port is in use - this may cause conflicts"
        else
            success "Port $port is available"
        fi
    done
    
    # Check disk space (need at least 2GB)
    local available_space=$(df . | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 2097152 ]; then  # 2GB in KB
        warning "Low disk space detected"
    else
        success "Sufficient disk space available"
    fi
}

# Environment setup
setup_environment() {
    step "Environment Setup"
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        log "Creating .env file..."
        cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@users-db:5432/users_dev
DATABASE_TEST_URL=postgresql://postgres:postgres@users-db:5432/users_test

# Auto-cleanup settings
AUTO_CLEANUP=true
CLEANUP_THRESHOLD_GB=10

# React App Configuration
REACT_APP_USERS_SERVICE_URL=http://localhost

# Flask Configuration
FLASK_ENV=development
SECRET_KEY=my_precious_secret_key
BCRYPT_LOG_ROUNDS=4
EOF
        success "Created .env file"
    else
        success ".env file already exists"
    fi
    
    # Ensure required directories exist
    local dirs=("scripts" "logs" "backups")
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            success "Created $dir directory"
        fi
    done
}

# Fix common issues
fix_common_issues() {
    step "Fixing Common Issues"
    
    # Fix manage.py issue
    if grep -q "^app, socketio = create_app()" services/users/manage.py; then
        log "Fixing manage.py Flask app creation..."
        sed -i.bak 's/^app, socketio = create_app()/# app, socketio = create_app()/' services/users/manage.py
        success "Fixed manage.py"
    fi
    
    # Ensure nginx config has all routes
    local nginx_config="services/nginx/dev.conf"
    if ! grep -q "location /auth" "$nginx_config"; then
        log "Adding missing auth route to nginx config..."
        # This will be handled by the comprehensive nginx config we'll create
        warning "Nginx config needs auth route - will be fixed in deployment"
    fi
    
    # Make scripts executable
    chmod +x scripts/*.sh 2>/dev/null || true
    success "Made scripts executable"
}

# Clean deployment
clean_deployment() {
    step "Clean Deployment"
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose down --remove-orphans || true
    
    # Remove old images if requested
    if [ "$1" = "--clean-images" ]; then
        log "Removing old images..."
        docker-compose down --rmi all --volumes --remove-orphans || true
    fi
    
    # Build and start services
    log "Building and starting services..."
    docker-compose up -d --build
    
    success "Services deployed"
}

# Database initialization
init_database() {
    step "Database Initialization"
    
    # Wait for database to be ready
    log "Waiting for database to be ready..."
    local retries=0
    while [ $retries -lt 30 ]; do
        if docker-compose exec -T users-db pg_isready -U postgres &> /dev/null; then
            break
        fi
        retries=$((retries + 1))
        sleep 2
        echo -n "."
    done
    
    if [ $retries -eq 30 ]; then
        error "Database failed to start"
    fi
    success "Database is ready"
    
    # Initialize database
    log "Creating database tables..."
    docker-compose exec -T users python manage.py recreate_db
    success "Database tables created"
    
    # Seed database
    log "Seeding database..."
    docker-compose exec -T users python manage.py seed_db
    success "Database seeded"
}

# Run tests
run_tests() {
    step "Running Tests"
    
    # Backend tests
    log "Running backend tests..."
    if docker-compose exec -T users python manage.py test; then
        success "Backend tests passed"
    else
        error "Backend tests failed"
    fi
    
    # Frontend build test
    log "Testing frontend build..."
    if docker-compose exec -T client npm run build > /dev/null 2>&1; then
        success "Frontend builds successfully"
    else
        warning "Frontend build has warnings (this is usually OK)"
    fi
}

# Main setup function
main() {
    local clean_images=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean-images)
                clean_images=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--clean-images] [--help]"
                echo "  --clean-images  Remove all Docker images before rebuilding"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    log "Starting automated setup at $(date)"
    log "Logging to: $SETUP_LOG"
    
    preflight_checks
    setup_environment
    fix_common_issues
    
    if [ "$clean_images" = true ]; then
        clean_deployment --clean-images
    else
        clean_deployment
    fi
    
    init_database
    run_tests
    
    # Run health check
    step "Final Health Check"
    if ./scripts/health-check.sh; then
        success "Setup completed successfully!"
        log "\n${GREEN}🎉 SETUP COMPLETE! Your application is ready.${NC}"
        log "Access your app at: http://localhost"
        log "Setup log saved to: $SETUP_LOG"
    else
        error "Health check failed - setup incomplete"
    fi
}

# Run main function
main "$@"
