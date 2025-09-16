#!/bin/bash

# 🔄 Database Migration Runner
# Runs migrations consistently across all environments (local, testing, production)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATIONS_DIR="database/migrations"
MIGRATION_TABLE="schema_migrations"

echo -e "${BLUE}🔄 Database Migration Runner${NC}"
echo "============================"

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment (local, testing, production)"
    echo "  -u, --db-uri URI        Database connection URI"
    echo "  -d, --dry-run           Show what would be migrated without applying"
    echo "  -r, --rollback VERSION  Rollback to specific version"
    echo "  -s, --status            Show migration status"
    echo "  -h, --help              Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 --environment local"
    echo "  $0 --db-uri postgresql://user:pass@host:5432/db"
    echo "  $0 --dry-run --environment testing"
    echo "  $0 --status"
}

# Function to get database URI based on environment
get_database_uri() {
    case $ENVIRONMENT in
        "local")
            DB_URI="postgresql://postgres:password@localhost:5432/testdriven_dev"
            ;;
        "testing")
            DB_URI="${AWS_RDS_URI:-$DB_URI_OVERRIDE}"
            ;;
        "production")
            DB_URI="${AWS_RDS_URI:-$DB_URI_OVERRIDE}"
            ;;
        *)
            if [ -n "$DB_URI_OVERRIDE" ]; then
                DB_URI="$DB_URI_OVERRIDE"
            else
                echo -e "${RED}❌ Unknown environment: $ENVIRONMENT${NC}"
                echo "Use --db-uri to specify connection string directly"
                exit 1
            fi
            ;;
    esac
    
    if [ -z "$DB_URI" ]; then
        echo -e "${RED}❌ Database URI not found${NC}"
        echo "Set AWS_RDS_URI environment variable or use --db-uri option"
        exit 1
    fi
}

# Function to test database connection
test_connection() {
    echo -e "${YELLOW}🔍 Testing database connection...${NC}"
    
    if psql "$DB_URI" -c "SELECT version();" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${RED}❌ Cannot connect to database${NC}"
        echo "URI: ${DB_URI:0:50}..."
        exit 1
    fi
}

# Function to create migration table
create_migration_table() {
    echo -e "${YELLOW}📋 Creating migration table...${NC}"
    
    psql "$DB_URI" -c "
        CREATE TABLE IF NOT EXISTS $MIGRATION_TABLE (
            version VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    " >/dev/null
    
    echo -e "${GREEN}✅ Migration table ready${NC}"
}

# Function to get applied migrations
get_applied_migrations() {
    psql "$DB_URI" -t -c "SELECT version FROM $MIGRATION_TABLE ORDER BY version;" 2>/dev/null | sed 's/^ *//' | grep -v '^$' || true
}

# Function to get available migrations
get_available_migrations() {
    if [ ! -d "$MIGRATIONS_DIR" ]; then
        echo -e "${RED}❌ Migrations directory not found: $MIGRATIONS_DIR${NC}"
        exit 1
    fi
    
    find "$MIGRATIONS_DIR" -name "*.sql" -type f | sort | sed "s|$MIGRATIONS_DIR/||" | sed 's|\.sql$||'
}

# Function to show migration status
show_status() {
    echo -e "${BLUE}📊 Migration Status${NC}"
    echo "=================="
    echo ""
    
    APPLIED=$(get_applied_migrations)
    AVAILABLE=$(get_available_migrations)
    
    echo -e "${GREEN}✅ Applied Migrations:${NC}"
    if [ -n "$APPLIED" ]; then
        echo "$APPLIED" | while read -r migration; do
            echo "  • $migration"
        done
    else
        echo "  (none)"
    fi
    
    echo ""
    echo -e "${YELLOW}📋 Available Migrations:${NC}"
    echo "$AVAILABLE" | while read -r migration; do
        if echo "$APPLIED" | grep -q "^$migration$"; then
            echo -e "  ✅ $migration"
        else
            echo -e "  ⏳ $migration (pending)"
        fi
    done
}

# Function to run migrations
run_migrations() {
    echo -e "${YELLOW}🔄 Running migrations...${NC}"
    
    APPLIED=$(get_applied_migrations)
    AVAILABLE=$(get_available_migrations)
    PENDING=""
    
    # Find pending migrations
    echo "$AVAILABLE" | while read -r migration; do
        if ! echo "$APPLIED" | grep -q "^$migration$"; then
            PENDING="$PENDING $migration"
        fi
    done
    
    if [ -z "$PENDING" ]; then
        echo -e "${GREEN}✅ No pending migrations${NC}"
        return 0
    fi
    
    echo "Pending migrations: $PENDING"
    
    if [ "$DRY_RUN" = "true" ]; then
        echo -e "${BLUE}🔍 DRY RUN - Would apply:${NC}"
        echo "$PENDING" | tr ' ' '\n' | grep -v '^$' | while read -r migration; do
            echo "  • $migration"
        done
        return 0
    fi
    
    # Apply pending migrations
    echo "$PENDING" | tr ' ' '\n' | grep -v '^$' | while read -r migration; do
        echo -e "${YELLOW}📝 Applying: $migration${NC}"
        
        MIGRATION_FILE="$MIGRATIONS_DIR/$migration.sql"
        if [ ! -f "$MIGRATION_FILE" ]; then
            echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
            exit 1
        fi
        
        # Apply migration
        if psql "$DB_URI" -f "$MIGRATION_FILE" >/dev/null 2>&1; then
            # Record migration
            psql "$DB_URI" -c "INSERT INTO $MIGRATION_TABLE (version) VALUES ('$migration') ON CONFLICT DO NOTHING;" >/dev/null
            echo -e "${GREEN}✅ Applied: $migration${NC}"
        else
            echo -e "${RED}❌ Failed to apply: $migration${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}🎉 All migrations applied successfully!${NC}"
}

# Function to rollback migration
rollback_migration() {
    echo -e "${YELLOW}🔄 Rolling back to version: $ROLLBACK_VERSION${NC}"
    echo -e "${RED}⚠️ Rollback functionality not implemented yet${NC}"
    echo "This would require down migrations to be implemented"
    exit 1
}

# Parse command line arguments
ENVIRONMENT=""
DB_URI_OVERRIDE=""
DRY_RUN="false"
ROLLBACK_VERSION=""
SHOW_STATUS="false"

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -u|--db-uri)
            DB_URI_OVERRIDE="$2"
            shift 2
            ;;
        -d|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -r|--rollback)
            ROLLBACK_VERSION="$2"
            shift 2
            ;;
        -s|--status)
            SHOW_STATUS="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            show_usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    # Default to production if no environment specified
    if [ -z "$ENVIRONMENT" ] && [ -z "$DB_URI_OVERRIDE" ]; then
        ENVIRONMENT="production"
    fi
    
    get_database_uri
    test_connection
    create_migration_table
    
    if [ "$SHOW_STATUS" = "true" ]; then
        show_status
    elif [ -n "$ROLLBACK_VERSION" ]; then
        rollback_migration
    else
        if [ "$SHOW_STATUS" != "true" ]; then
            show_status
            echo ""
        fi
        run_migrations
    fi
}

# Check if psql is available
if ! command -v psql >/dev/null 2>&1; then
    echo -e "${RED}❌ psql not found${NC}"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Run main function
main "$@"
