#!/bin/bash

# Smart Migration and Deployment Script
# This script handles database migrations and seeding for all environments

set -e

echo "🏗️  SMART MIGRATION AND DEPLOYMENT"
echo "=================================="

# Get environment (default to development)
ENVIRONMENT=${1:-development}
echo "📍 Environment: $ENVIRONMENT"

# Function to run production-ready migrations
run_migrations() {
    echo "🔄 Running production-ready database migrations..."

    # Check if we're in a container or local environment
    if [ -f /.dockerenv ]; then
        echo "🐳 Running in Docker container"
        python manage.py db-status
        python manage.py migrate-and-seed
    else
        echo "💻 Running locally"
        if command -v docker-compose &> /dev/null; then
            echo "🐳 Using docker-compose"
            docker-compose exec backend python manage.py db-status
            docker-compose exec backend python manage.py migrate-and-seed
        else
            echo "🐍 Running directly with Python"
            python manage.py db-status
            python manage.py migrate-and-seed
        fi
    fi
}

# Function to check database connectivity
check_database() {
    echo "🔍 Checking database connectivity..."
    
    # Try to connect to database
    if [ -f /.dockerenv ]; then
        python -c "
from project import create_app, db
app, _ = create_app()
with app.app_context():
    try:
        db.engine.execute('SELECT 1')
        print('✅ Database connection successful')
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
        exit(1)
"
    else
        if command -v docker-compose &> /dev/null; then
            docker-compose exec backend python -c "
from project import create_app, db
app, _ = create_app()
with app.app_context():
    try:
        db.engine.execute('SELECT 1')
        print('✅ Database connection successful')
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
        exit(1)
"
        fi
    fi
}

# Function to backup database (for production)
backup_database() {
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "💾 Creating database backup..."
        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
        
        # Create backup based on environment
        if [ -f /.dockerenv ]; then
            pg_dump $DATABASE_URL > "/tmp/$BACKUP_FILE"
        else
            docker-compose exec db pg_dump -U postgres testdriven_dev > "$BACKUP_FILE"
        fi
        
        echo "✅ Backup created: $BACKUP_FILE"
    fi
}

# Main execution
main() {
    echo "🚀 Starting migration and deployment process..."
    
    # Step 1: Check database connectivity
    check_database
    
    # Step 2: Backup database (production only)
    backup_database
    
    # Step 3: Run migrations
    run_migrations
    
    echo "🎉 Migration and deployment complete!"
    echo ""
    echo "📋 Summary:"
    echo "  - Environment: $ENVIRONMENT"
    echo "  - Database: ✅ Connected"
    echo "  - Migrations: ✅ Applied"
    echo "  - Seeding: ✅ Completed"
    
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "  - Backup: ✅ Created"
    fi
    
    echo ""
    echo "🔗 Your application is ready!"
}

# Handle different environments
case $ENVIRONMENT in
    "development")
        echo "🛠️  Development environment detected"
        main
        ;;
    "staging")
        echo "🧪 Staging environment detected"
        main
        ;;
    "production")
        echo "🏭 Production environment detected"
        echo "⚠️  This will affect production data!"
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            main
        else
            echo "❌ Deployment cancelled"
            exit 1
        fi
        ;;
    *)
        echo "❌ Unknown environment: $ENVIRONMENT"
        echo "Valid environments: development, staging, production"
        exit 1
        ;;
esac
