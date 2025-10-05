#!/bin/bash

# ============================================================================
# MEETING SCHEDULER SYSTEM - DATABASE MIGRATIONS
# Script: run_migrations.sh
# Description: Runs all PostgreSQL migrations for meeting scheduler system
# Date: 2025-10-02
# ============================================================================

set -e  # Exit on any error

# Configuration
DB_NAME="testdriven_dev"
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="${USER}"
MIGRATIONS_DIR="migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if database exists and is accessible
check_database() {
    log_info "Checking database connection..."
    
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "Cannot connect to database $DB_NAME"
        log_error "Please ensure PostgreSQL is running and database exists"
        exit 1
    fi
    
    log_success "Database connection successful"
}

# Function to create migrations table if it doesn't exist
create_migrations_table() {
    log_info "Creating migrations tracking table..."
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
);
EOF
    
    log_success "Migrations table ready"
}

# Function to check if migration has been applied
is_migration_applied() {
    local migration_name="$1"
    local count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE migration_name = '$migration_name';" | tr -d ' ')
    
    if [ "$count" -gt 0 ]; then
        return 0  # Migration applied
    else
        return 1  # Migration not applied
    fi
}

# Function to record migration as applied
record_migration() {
    local migration_name="$1"
    local checksum="$2"
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (migration_name, checksum) VALUES ('$migration_name', '$checksum');"
}

# Function to run a single migration
run_migration() {
    local migration_file="$1"
    local migration_name=$(basename "$migration_file" .sql)
    
    log_info "Checking migration: $migration_name"
    
    if is_migration_applied "$migration_name"; then
        log_warning "Migration $migration_name already applied, skipping"
        return 0
    fi
    
    log_info "Applying migration: $migration_name"
    
    # Calculate checksum
    local checksum=$(sha256sum "$migration_file" | cut -d' ' -f1)
    
    # Run the migration
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
        record_migration "$migration_name" "$checksum"
        log_success "Migration $migration_name applied successfully"
    else
        log_error "Migration $migration_name failed"
        exit 1
    fi
}

# Function to show migration status
show_migration_status() {
    log_info "Migration Status:"
    echo "============================================================================================================"
    printf "%-50s %-20s %-30s\n" "Migration Name" "Status" "Applied At"
    echo "============================================================================================================"
    
    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration_file" ]; then
            local migration_name=$(basename "$migration_file" .sql)
            
            if is_migration_applied "$migration_name"; then
                local applied_at=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT applied_at FROM schema_migrations WHERE migration_name = '$migration_name';" | tr -d ' ')
                printf "%-50s %-20s %-30s\n" "$migration_name" "APPLIED" "$applied_at"
            else
                printf "%-50s %-20s %-30s\n" "$migration_name" "PENDING" "Not Applied"
            fi
        fi
    done
    echo "============================================================================================================"
}

# Function to run all migrations
run_all_migrations() {
    log_info "Starting database migrations for Meeting Scheduler System"
    echo "============================================================================"
    
    # Check if migrations directory exists
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        log_error "Migrations directory '$MIGRATIONS_DIR' not found"
        exit 1
    fi
    
    # Run migrations in order
    local migration_count=0
    for migration_file in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration_file" ]; then
            run_migration "$migration_file"
            ((migration_count++))
        fi
    done
    
    log_success "All migrations completed successfully!"
    log_info "Total migrations processed: $migration_count"
}

# Function to rollback last migration (basic implementation)
rollback_migration() {
    log_warning "Rollback functionality is not implemented in this basic version"
    log_warning "For production use, implement proper rollback scripts"
}

# Function to validate database schema
validate_schema() {
    log_info "Validating database schema..."
    
    # Check if all expected tables exist
    local expected_tables=(
        "meeting_invitations"
        "planned_meeting_activities" 
        "meeting_templates"
        "meeting_activity_participants"
        "scheduler_calendar"
    )
    
    local missing_tables=()
    
    for table in "${expected_tables[@]}"; do
        local exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';" | tr -d ' ')
        
        if [ "$exists" -eq 0 ]; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        log_success "Schema validation passed - all tables exist"
    else
        log_error "Schema validation failed - missing tables: ${missing_tables[*]}"
        exit 1
    fi
    
    # Check if templates were created
    local template_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM meeting_templates;" | tr -d ' ')
    log_info "Meeting templates created: $template_count"
    
    if [ "$template_count" -gt 0 ]; then
        log_success "Meeting templates seeded successfully"
    else
        log_warning "No meeting templates found - check seed migration"
    fi
}

# Main execution
main() {
    echo "============================================================================"
    echo "🚀 MEETING SCHEDULER SYSTEM - DATABASE MIGRATIONS"
    echo "============================================================================"
    
    case "${1:-run}" in
        "run")
            check_database
            create_migrations_table
            run_all_migrations
            validate_schema
            show_migration_status
            ;;
        "status")
            check_database
            create_migrations_table
            show_migration_status
            ;;
        "validate")
            check_database
            validate_schema
            ;;
        "rollback")
            rollback_migration
            ;;
        *)
            echo "Usage: $0 [run|status|validate|rollback]"
            echo "  run      - Run all pending migrations (default)"
            echo "  status   - Show migration status"
            echo "  validate - Validate database schema"
            echo "  rollback - Rollback last migration (not implemented)"
            exit 1
            ;;
    esac
    
    echo "============================================================================"
    log_success "Migration process completed!"
    echo "============================================================================"
}

# Run main function with all arguments
main "$@"
