#!/bin/bash

# Development to Production Workflow Script
# This script helps you smoothly deploy changes from development to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

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
    echo "🚀 $1"
    echo "=============================================="
}

# Check if we're in the right directory
check_directory() {
    if [ ! -f "docker-compose.yml" ] || [ ! -d "services/users" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
}

# Run local tests
run_local_tests() {
    print_header "Running Local Tests"
    
    cd services/users
    
    # Set up development environment
    export APP_SETTINGS=project.config.DevelopmentConfig
    
    print_status "Running unit tests..."
    if python -m pytest project/tests/ -v; then
        print_success "All tests passed!"
    else
        print_error "Tests failed. Please fix issues before deploying."
        exit 1
    fi
    
    print_status "Running Aurora integration tests..."
    if python -m pytest project/tests/test_aurora_integration.py -v; then
        print_success "Aurora integration tests passed!"
    else
        print_warning "Some Aurora tests failed (this is OK for local development)"
    fi
    
    cd ../..
}

# Check for database migrations
check_migrations() {
    print_header "Checking Database Migrations"
    
    cd services/users
    export APP_SETTINGS=project.config.DevelopmentConfig
    
    # Check if there are pending migrations
    if python manage.py db current | grep -q "head"; then
        print_success "Database is up to date"
    else
        print_warning "There may be pending migrations"
        print_status "Current migration status:"
        python manage.py db current
        
        echo ""
        read -p "Do you want to run migrations locally? (y/n): " run_migrations
        if [ "$run_migrations" = "y" ]; then
            print_status "Running migrations..."
            python manage.py db upgrade
            print_success "Migrations completed"
        fi
    fi
    
    cd ../..
}

# Show production status
show_production_status() {
    print_header "Production Status"
    
    print_status "Checking Aurora cluster..."
    AURORA_STATUS=$(aws rds describe-db-clusters \
        --db-cluster-identifier testdriven-production-aurora \
        --query 'DBClusters[0].Status' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$AURORA_STATUS" = "available" ]; then
        print_success "Aurora cluster is available"
    else
        print_warning "Aurora cluster status: $AURORA_STATUS"
    fi
    
    print_status "Checking ECS services..."
    aws ecs describe-services \
        --cluster testdriven-production-cluster \
        --services testdriven-users-production-service testdriven-client-production-service \
        --query 'services[].{Name:serviceName,Status:status,Running:runningCount,Desired:desiredCount}' \
        --output table
    
    print_status "Production URLs:"
    echo "🖥️  Frontend: http://35.172.194.242"
    echo "🔧 Backend API: http://18.234.250.255:5000"
    echo "📊 Health Check: http://18.234.250.255:5000/monitoring/health"
}

# Deploy to production
deploy_to_production() {
    print_header "Deploying to Production"
    
    # Check git status
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "You have uncommitted changes:"
        git status --short
        echo ""
        read -p "Do you want to commit these changes? (y/n): " commit_changes
        
        if [ "$commit_changes" = "y" ]; then
            read -p "Enter commit message: " commit_message
            git add .
            git commit -m "$commit_message"
            print_success "Changes committed"
        else
            print_error "Please commit or stash your changes before deploying"
            exit 1
        fi
    fi
    
    # Push to production
    print_status "Pushing to production branch..."
    git push origin production
    
    print_success "Deployment triggered!"
    print_status "Monitor the deployment at: https://github.com/owenabrams/testdriven-app/actions"
    
    # Open GitHub Actions
    if command -v open >/dev/null 2>&1; then
        open "https://github.com/owenabrams/testdriven-app/actions"
    fi
}

# Main menu
main() {
    print_header "Development to Production Workflow"
    
    check_directory
    
    echo ""
    echo "What would you like to do?"
    echo "1) Run local tests"
    echo "2) Check database migrations"
    echo "3) Show production status"
    echo "4) Deploy to production (full workflow)"
    echo "5) Quick deploy (skip tests)"
    echo "6) Exit"
    echo ""
    
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            run_local_tests
            ;;
        2)
            check_migrations
            ;;
        3)
            show_production_status
            ;;
        4)
            run_local_tests
            check_migrations
            show_production_status
            echo ""
            read -p "Deploy to production? (y/n): " deploy_confirm
            if [ "$deploy_confirm" = "y" ]; then
                deploy_to_production
            fi
            ;;
        5)
            deploy_to_production
            ;;
        6)
            print_status "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
