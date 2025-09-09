#!/bin/bash

# Re-seed database with SAVINGS_PLATFORM_INTEGRATION_GUIDE.md data

echo "🔄 Re-seeding database with Integration Guide data..."
echo "=================================================="

# Navigate to users service
cd services/users

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "❌ Virtual environment not found. Please run ./start-local.sh first."
    exit 1
fi

# Set environment variables
export FLASK_APP=project/__init__.py
export FLASK_ENV=development
export APP_SETTINGS=project.config.DevelopmentConfig
export DATABASE_URL=sqlite:///app.db
export SECRET_KEY=dev-secret-key

# Recreate database
echo "🗄️  Recreating database..."
python manage.py recreate_db
python manage.py seed_db

# Seed enhanced demo data
echo "🌱 Seeding enhanced demo data (SAVINGS_PLATFORM_INTEGRATION_GUIDE.md)..."
python seed_demo_data.py

# Create super admin
echo "👑 Creating super admin..."
echo -e "superadmin\nsuperadmin@testdriven.io\nsuperpassword123" | python manage.py create_super_admin

# Verify seeding
echo "🔍 Verifying integration guide compliance..."
cd ../../
python verify-integration-guide-seeding.py

echo ""
echo "✅ Re-seeding complete!"
echo "🎯 Ready to test with integration guide specifications"