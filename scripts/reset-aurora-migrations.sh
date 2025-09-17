#!/bin/bash

# Reset Aurora Database Migration State
# This script resets the migration state in Aurora PostgreSQL

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    echo "🔄 $1"
    echo "=============================================="
}

# Get Aurora connection details
get_aurora_connection() {
    print_status "Getting Aurora connection details..."
    
    if [ -f "/tmp/aurora_password.txt" ]; then
        AURORA_PASSWORD=$(cat /tmp/aurora_password.txt)
    else
        print_error "Aurora password not found. Run ./scripts/setup-aurora-password.sh first"
        exit 1
    fi
    
    AURORA_ENDPOINT=$(aws rds describe-db-clusters \
        --db-cluster-identifier testdriven-production-aurora \
        --query 'DBClusters[0].Endpoint' \
        --output text)
    
    if [ "$AURORA_ENDPOINT" = "None" ] || [ -z "$AURORA_ENDPOINT" ]; then
        print_error "Aurora cluster not found or not available"
        exit 1
    fi
    
    print_success "Aurora endpoint: $AURORA_ENDPOINT"
}

# Reset migration state
reset_migration_state() {
    print_header "Resetting Migration State"
    
    print_warning "This will reset the migration state in Aurora PostgreSQL"
    print_warning "All existing data will be preserved, but migration history will be reset"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " confirm
    
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_status "Operation cancelled"
        exit 0
    fi
    
    # Connect to Aurora and reset migration state
    print_status "Connecting to Aurora PostgreSQL..."
    
    # Drop and recreate alembic_version table
    PGPASSWORD="$AURORA_PASSWORD" psql \
        -h "$AURORA_ENDPOINT" \
        -p 5432 \
        -U webapp \
        -d users_production \
        -c "DROP TABLE IF EXISTS alembic_version;" \
        -c "CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL, CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num));"
    
    if [ $? -eq 0 ]; then
        print_success "Migration state reset successfully"
    else
        print_error "Failed to reset migration state"
        exit 1
    fi
}

# Initialize with current migration head
initialize_migration_head() {
    print_header "Initializing Migration Head"
    
    # Get current migration head from local repository
    cd services/users
    export APP_SETTINGS=project.config.DevelopmentConfig
    
    CURRENT_HEAD=$(python manage.py db heads | tail -1 | awk '{print $1}')
    
    if [ -z "$CURRENT_HEAD" ]; then
        print_error "Could not determine current migration head"
        exit 1
    fi
    
    print_status "Current migration head: $CURRENT_HEAD"
    
    # Set this as the current version in Aurora
    PGPASSWORD="$AURORA_PASSWORD" psql \
        -h "$AURORA_ENDPOINT" \
        -p 5432 \
        -U webapp \
        -d users_production \
        -c "INSERT INTO alembic_version (version_num) VALUES ('$CURRENT_HEAD');"
    
    if [ $? -eq 0 ]; then
        print_success "Migration head initialized: $CURRENT_HEAD"
    else
        print_error "Failed to initialize migration head"
        exit 1
    fi
    
    cd ../..
}

# Verify migration state
verify_migration_state() {
    print_header "Verifying Migration State"
    
    # Check current version in Aurora
    AURORA_VERSION=$(PGPASSWORD="$AURORA_PASSWORD" psql \
        -h "$AURORA_ENDPOINT" \
        -p 5432 \
        -U webapp \
        -d users_production \
        -t -c "SELECT version_num FROM alembic_version;" | tr -d ' ')
    
    print_status "Aurora migration version: $AURORA_VERSION"
    
    # Check local head
    cd services/users
    export APP_SETTINGS=project.config.DevelopmentConfig
    LOCAL_HEAD=$(python manage.py db heads | tail -1 | awk '{print $1}')
    print_status "Local migration head: $LOCAL_HEAD"
    
    if [ "$AURORA_VERSION" = "$LOCAL_HEAD" ]; then
        print_success "Migration state is synchronized!"
    else
        print_warning "Migration versions don't match"
        print_status "This is normal if you have new migrations to apply"
    fi
    
    cd ../..
}

# Main function
main() {
    print_header "Aurora Migration State Reset"
    
    # Check if psql is installed
    if ! command -v psql >/dev/null 2>&1; then
        print_error "PostgreSQL client (psql) is not installed"
        print_status "Install with: brew install postgresql"
        exit 1
    fi
    
    get_aurora_connection
    reset_migration_state
    initialize_migration_head
    verify_migration_state
    
    print_success "Aurora migration state has been reset successfully!"
    print_status "You can now deploy your application and migrations will work correctly"
}

# Run main function
main "$@"
