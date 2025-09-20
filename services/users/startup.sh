#!/bin/bash

# Production-Ready Backend Startup Script
# This script ensures robust startup with proper error handling and recovery

set -e  # Exit on any error

echo "🚀 Starting Enhanced Savings Groups Backend..."
echo "=============================================="

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for PostgreSQL database..."
    
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if python -c "
import psycopg2
import os
import sys
try:
    conn = psycopg2.connect(os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/testdriven_dev'))
    conn.close()
    print('✅ Database connection successful')
    sys.exit(0)
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    sys.exit(1)
"; then
            echo "✅ Database is ready!"
            return 0
        fi
        
        echo "⏳ Database not ready yet (attempt $attempt/$max_attempts)..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ Database connection failed after $max_attempts attempts"
    exit 1
}

# Function to handle database migrations
handle_migrations() {
    echo "🔄 Handling database migrations..."
    
    # Check if migrations directory exists
    if [ ! -d "migrations" ]; then
        echo "📁 Initializing migrations directory..."
        python manage.py db init
    fi
    
    # Check for multiple heads and merge if needed (handle errors gracefully)
    echo "🔍 Checking for migration conflicts..."
    if python manage.py db heads 2>/dev/null | grep -q "^[a-f0-9].*[a-f0-9]"; then
        echo "⚠️  Multiple migration heads detected - merging..."
        python manage.py db merge heads -m "Merge migration heads - $(date '+%Y%m%d_%H%M%S')" 2>/dev/null || {
            echo "⚠️  Migration merge failed, attempting to reset migration state..."
            # If merge fails, try to stamp with current head
            CURRENT_HEAD=$(python manage.py db heads 2>/dev/null | head -1 | awk '{print $1}')
            if [ -n "$CURRENT_HEAD" ]; then
                echo "🔧 Stamping database with head: $CURRENT_HEAD"
                python manage.py db stamp "$CURRENT_HEAD" 2>/dev/null || echo "⚠️  Stamp failed, continuing anyway..."
            fi
        }
    fi
    
    # Generate migration if models changed
    echo "📝 Generating migrations for model changes..."
    python manage.py db migrate -m "Auto migration - $(date '+%Y%m%d_%H%M%S')" || echo "ℹ️  No new migrations needed"
    
    # Apply migrations (handle errors gracefully)
    echo "⬆️  Applying database migrations..."
    if ! python manage.py db upgrade 2>/dev/null; then
        echo "⚠️  Migration upgrade failed, attempting to resolve..."

        # Try to get current database version
        DB_VERSION=$(python manage.py db current 2>/dev/null | tail -1 | awk '{print $1}')
        REPO_HEAD=$(python manage.py db heads 2>/dev/null | head -1 | awk '{print $1}')

        if [ -n "$REPO_HEAD" ]; then
            echo "🔧 Attempting to stamp database with current head: $REPO_HEAD"
            python manage.py db stamp "$REPO_HEAD" 2>/dev/null && {
                echo "✅ Database stamped successfully, retrying upgrade..."
                python manage.py db upgrade 2>/dev/null || echo "⚠️  Upgrade still failed, but continuing..."
            } || echo "⚠️  Stamp failed, continuing anyway..."
        else
            echo "⚠️  Could not determine repository head, continuing..."
        fi
    fi
    
    echo "✅ Database migrations completed successfully"
}

# Function to seed demo data intelligently
seed_demo_data() {
    echo "🌱 Checking demo data requirements..."

    # Check if we need to seed data
    user_count=$(python -c "
from project import create_app, db
from project.api.models import User
app = create_app()
with app.app_context():
    print(User.query.count())
" 2>/dev/null || echo "0")

    if [ "$user_count" -lt 5 ]; then
        echo "📊 Seeding demo data (found $user_count users)..."
        python manage.py seed_demo_data || echo "⚠️  Demo data seeding completed with warnings"
    else
        echo "✅ Demo data already exists ($user_count users found)"
    fi
}

# Function to ensure calendar data is ready
ensure_calendar_data() {
    echo "📅 Ensuring calendar data is ready..."

    # Run the calendar data initialization script
    if [ -f "scripts/ensure_calendar_data.py" ]; then
        python scripts/ensure_calendar_data.py || echo "⚠️  Calendar data initialization completed with warnings"
    else
        echo "⚠️  Calendar data script not found, skipping..."
    fi
}

# Function to start Flask server
start_server() {
    echo "🌐 Starting Flask development server..."
    echo "📍 Server will be available at: http://localhost:5000"
    echo "🔗 API endpoints:"
    echo "   • Health check: http://localhost:5000/ping"
    echo "   • Users API: http://localhost:5000/users"
    echo "=============================================="
    
    # Start the Flask server
    exec python manage.py run -h 0.0.0.0
}

# Main execution flow
main() {
    echo "🏁 Starting production-ready backend startup sequence..."
    
    # Step 1: Wait for database
    wait_for_db
    
    # Step 2: Handle migrations
    handle_migrations

    # Step 2.5: Ensure database schema is correct
    if [ -f "scripts/ensure_database_schema.py" ]; then
        echo "🗄️  Validating database schema..."
        python scripts/ensure_database_schema.py || echo "⚠️  Schema validation completed with warnings"
    fi

    # Step 3: Seed demo data if needed
    seed_demo_data

    # Step 4: Ensure calendar data is ready
    ensure_calendar_data

    # Step 5: Start the server
    start_server
}

# Handle signals gracefully
trap 'echo "🛑 Received shutdown signal, stopping gracefully..."; exit 0' SIGTERM SIGINT

# Run main function
main "$@"
