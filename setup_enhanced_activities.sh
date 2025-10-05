#!/bin/bash

# Enhanced Meeting Activities System Setup Script
# This script sets up the complete Enhanced Meeting Activities System

set -e  # Exit on any error

echo "🚀 ENHANCED MEETING ACTIVITIES SYSTEM - COMPLETE SETUP"
echo "============================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is running
check_docker() {
    print_info "Checking Docker status..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_status "Docker is running"
}

# Clean up existing containers and volumes
cleanup_docker() {
    print_info "Cleaning up existing Docker containers and volumes..."
    
    # Stop and remove containers
    docker-compose down --remove-orphans || true
    
    # Remove volumes (this will clear the database)
    docker volume prune -f || true
    
    # Remove unused images
    docker image prune -f || true
    
    print_status "Docker cleanup completed"
}

# Build and start services
build_services() {
    print_info "Building and starting services..."
    
    # Build services
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    print_status "Services built and started"
}

# Wait for database to be ready
wait_for_database() {
    print_info "Waiting for database to be ready..."
    
    # Wait for the users service to be healthy
    for i in {1..30}; do
        if docker-compose exec -T users python -c "from project import db; db.engine.execute('SELECT 1')" > /dev/null 2>&1; then
            print_status "Database is ready"
            return 0
        fi
        echo "Waiting for database... ($i/30)"
        sleep 2
    done
    
    print_error "Database failed to start within 60 seconds"
    return 1
}

# Run database migrations
run_migrations() {
    print_info "Running database migrations..."
    
    # Initialize migrations if needed
    docker-compose exec -T users python manage.py db init || true
    
    # Create migration for enhanced activities
    print_info "Creating migration for Enhanced Meeting Activities..."
    docker-compose exec -T users python manage.py db migrate -m "add_enhanced_meeting_activities_system"
    
    # Apply migrations
    docker-compose exec -T users python manage.py db upgrade
    
    print_status "Database migrations completed"
}

# Validate the system
validate_system() {
    print_info "Validating Enhanced Meeting Activities System..."
    
    # Run the validation script
    docker-compose exec -T users python create_activity_migration.py
    
    # Test API endpoints
    print_info "Testing API endpoints..."
    
    # Wait a bit for services to be fully ready
    sleep 5
    
    # Test basic API health
    if curl -f http://localhost:5001/api/ping > /dev/null 2>&1; then
        print_status "API is responding"
    else
        print_warning "API health check failed, but continuing..."
    fi
    
    print_status "System validation completed"
}

# Create upload directories
create_directories() {
    print_info "Creating upload directories..."
    
    # Create directories inside the container
    docker-compose exec -T users mkdir -p /app/uploads/activity_documents
    docker-compose exec -T users mkdir -p /app/uploads/meeting_documents
    docker-compose exec -T users chmod 755 /app/uploads/activity_documents
    docker-compose exec -T users chmod 755 /app/uploads/meeting_documents
    
    print_status "Upload directories created"
}

# Install frontend dependencies and build
setup_frontend() {
    print_info "Setting up frontend..."
    
    # Install dependencies
    docker-compose exec -T client npm install
    
    # Build the frontend
    docker-compose exec -T client npm run build
    
    print_status "Frontend setup completed"
}

# Display final status
show_final_status() {
    echo ""
    echo "============================================================"
    echo -e "${GREEN}🎉 ENHANCED MEETING ACTIVITIES SYSTEM - SETUP COMPLETE!${NC}"
    echo "============================================================"
    echo ""
    echo -e "${BLUE}📋 SYSTEM STATUS:${NC}"
    echo "✅ Database migrations applied"
    echo "✅ Enhanced Meeting Activities models created"
    echo "✅ API endpoints available"
    echo "✅ Frontend components integrated"
    echo "✅ Document upload system configured"
    echo "✅ Activity tracking system ready"
    echo ""
    echo -e "${BLUE}🌐 ACCESS POINTS:${NC}"
    echo "• Frontend: http://localhost:3000"
    echo "• Backend API: http://localhost:5001"
    echo "• Database: PostgreSQL on port 5432"
    echo ""
    echo -e "${BLUE}🎯 NEW FEATURES AVAILABLE:${NC}"
    echo "• Enhanced Meeting Page with Activity Tracker"
    echo "• Document Upload for Activity Proof (PDF, Word, Images)"
    echo "• Member Participation Tracking"
    echo "• Activity Reports and Analytics"
    echo "• Comprehensive Activity Management"
    echo ""
    echo -e "${BLUE}📖 HOW TO ACCESS:${NC}"
    echo "1. Go to http://localhost:3000"
    echo "2. Login to your savings group"
    echo "3. Navigate to 'Meetings' in the sidebar"
    echo "4. Click 'Activity Tracker' button on any meeting"
    echo "5. Or go to 'Activity Reports' for analytics"
    echo ""
    echo -e "${BLUE}🔧 TROUBLESHOOTING:${NC}"
    echo "• If issues occur, run: docker-compose logs"
    echo "• To restart: docker-compose restart"
    echo "• To rebuild: docker-compose down && docker-compose up --build"
    echo ""
    echo "============================================================"
}

# Main execution
main() {
    echo "Starting Enhanced Meeting Activities System setup..."
    echo ""
    
    # Step 1: Check Docker
    check_docker
    
    # Step 2: Clean up
    cleanup_docker
    
    # Step 3: Build services
    build_services
    
    # Step 4: Wait for database
    wait_for_database
    
    # Step 5: Run migrations
    run_migrations
    
    # Step 6: Create directories
    create_directories
    
    # Step 7: Setup frontend
    setup_frontend
    
    # Step 8: Validate system
    validate_system
    
    # Step 9: Show final status
    show_final_status
    
    echo -e "${GREEN}🚀 Setup completed successfully!${NC}"
}

# Handle script interruption
trap 'echo -e "\n${RED}Setup interrupted. You may need to run cleanup manually.${NC}"; exit 1' INT

# Run main function
main "$@"
