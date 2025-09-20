#!/bin/bash

# Production Data Setup Script for CI/CD
# Ensures database schema and calendar data are properly initialized in all environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
CONTAINER_NAME=${2:-""}

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

# Function to run commands in container or locally
run_command() {
    local cmd="$1"
    
    if [ -n "$CONTAINER_NAME" ]; then
        # Running in containerized environment (ECS, Docker)
        log_info "Running in container: $CONTAINER_NAME"
        docker exec "$CONTAINER_NAME" bash -c "$cmd"
    else
        # Running locally or in CI environment
        log_info "Running locally"
        eval "$cmd"
    fi
}

# Function to setup database schema
setup_database_schema() {
    log_info "Setting up database schema for $ENVIRONMENT environment..."
    
    local schema_cmd="cd /usr/src/app && python scripts/ensure_database_schema.py"
    
    if run_command "$schema_cmd"; then
        log_success "Database schema setup completed"
    else
        log_error "Database schema setup failed"
        return 1
    fi
}

# Function to setup calendar data
setup_calendar_data() {
    log_info "Setting up calendar data for $ENVIRONMENT environment..."
    
    local calendar_cmd="cd /usr/src/app && python scripts/ensure_calendar_data.py"
    
    if run_command "$calendar_cmd"; then
        log_success "Calendar data setup completed"
    else
        log_error "Calendar data setup failed"
        return 1
    fi
}

# Function to verify setup
verify_setup() {
    log_info "Verifying production data setup..."
    
    local verify_cmd="cd /usr/src/app && python -c \"
from project import create_app, db
from project.api.models import SavingsGroup, GroupMember, GroupTransaction, CalendarEvent

app, _ = create_app()
with app.app_context():
    groups = SavingsGroup.query.count()
    members = GroupMember.query.count()
    transactions = GroupTransaction.query.count()
    events = CalendarEvent.query.count()
    
    print(f'📊 Data Summary:')
    print(f'   - Savings Groups: {groups}')
    print(f'   - Group Members: {members}')
    print(f'   - Transactions: {transactions}')
    print(f'   - Calendar Events: {events}')
    
    if groups > 0 and members > 0 and events > 0:
        print('✅ Production data setup verification PASSED')
        exit(0)
    else:
        print('❌ Production data setup verification FAILED')
        exit(1)
\""
    
    if run_command "$verify_cmd"; then
        log_success "Production data verification passed"
        return 0
    else
        log_error "Production data verification failed"
        return 1
    fi
}

# Function to handle different environments
setup_environment_specific() {
    case $ENVIRONMENT in
        "development"|"local")
            log_info "Setting up development environment data..."
            # Development might need more demo data
            ;;
        "staging")
            log_info "Setting up staging environment data..."
            # Staging should mirror production but with test data
            ;;
        "production")
            log_info "Setting up production environment data..."
            # Production needs minimal but functional data
            ;;
        *)
            log_warning "Unknown environment: $ENVIRONMENT, using default setup"
            ;;
    esac
}

# Function to handle ECS deployment
setup_ecs_environment() {
    log_info "Setting up data for ECS deployment..."
    
    # For ECS, we need to run commands inside the running container
    if [ -z "$ECS_CLUSTER" ] || [ -z "$ECS_SERVICE" ]; then
        log_error "ECS_CLUSTER and ECS_SERVICE environment variables must be set for ECS deployment"
        return 1
    fi
    
    # Get running task ARN
    TASK_ARN=$(aws ecs list-tasks \
        --cluster "$ECS_CLUSTER" \
        --service-name "$ECS_SERVICE" \
        --desired-status RUNNING \
        --query 'taskArns[0]' \
        --output text)
    
    if [ "$TASK_ARN" = "None" ] || [ -z "$TASK_ARN" ]; then
        log_error "No running tasks found for service $ECS_SERVICE"
        return 1
    fi
    
    log_info "Found running task: $TASK_ARN"
    
    # Run setup commands in the ECS task
    log_info "Running database schema setup in ECS task..."
    aws ecs execute-command \
        --cluster "$ECS_CLUSTER" \
        --task "$TASK_ARN" \
        --container backend \
        --interactive \
        --command "python scripts/ensure_database_schema.py"
    
    log_info "Running calendar data setup in ECS task..."
    aws ecs execute-command \
        --cluster "$ECS_CLUSTER" \
        --task "$TASK_ARN" \
        --container backend \
        --interactive \
        --command "python scripts/ensure_calendar_data.py"
    
    log_success "ECS environment setup completed"
}

# Main execution
main() {
    echo "🚀 Production Data Setup for CI/CD"
    echo "Environment: $ENVIRONMENT"
    echo "=================================="
    
    # Check if running in ECS environment
    if [ -n "$ECS_CLUSTER" ] && [ -n "$ECS_SERVICE" ]; then
        setup_ecs_environment
        return $?
    fi
    
    # Handle environment-specific setup
    setup_environment_specific
    
    # Setup database schema
    if ! setup_database_schema; then
        log_error "Database schema setup failed"
        exit 1
    fi
    
    # Setup calendar data
    if ! setup_calendar_data; then
        log_error "Calendar data setup failed"
        exit 1
    fi
    
    # Verify setup
    if ! verify_setup; then
        log_error "Setup verification failed"
        exit 1
    fi
    
    log_success "🎉 Production data setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Verify application is accessible"
    echo "  2. Test calendar functionality"
    echo "  3. Check advanced filters"
    echo "  4. Verify event drill-down functionality"
}

# Help function
show_help() {
    echo "Production Data Setup Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [CONTAINER_NAME]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  development  - Setup for development environment"
    echo "  staging      - Setup for staging environment"
    echo "  production   - Setup for production environment (default)"
    echo ""
    echo "CONTAINER_NAME:"
    echo "  Optional container name for Docker environments"
    echo ""
    echo "Environment Variables:"
    echo "  ECS_CLUSTER  - ECS cluster name for ECS deployments"
    echo "  ECS_SERVICE  - ECS service name for ECS deployments"
    echo ""
    echo "Examples:"
    echo "  $0                              # Setup production locally"
    echo "  $0 development                  # Setup development locally"
    echo "  $0 production backend-container # Setup in Docker container"
    echo "  ECS_CLUSTER=my-cluster ECS_SERVICE=backend $0 production  # Setup in ECS"
}

# Parse arguments
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

# Run main function
main
