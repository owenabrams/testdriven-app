#!/bin/bash

# 🐌 SLOW INTERNET LOCAL DEVELOPMENT STARTUP SCRIPT
# This script starts the application without Docker builds

echo "🚀 Starting Local Development Environment (Slow Internet Optimized)"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Step 1: Start only the database (lightweight)
echo "📊 Starting PostgreSQL database..."
docker-compose -f docker-compose.local.yml up -d db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Check database health
until docker-compose -f docker-compose.local.yml exec db pg_isready -U postgres > /dev/null 2>&1; do
    echo "⏳ Database not ready yet, waiting..."
    sleep 5
done

echo "✅ Database is ready!"

# Step 2: Setup backend environment
echo "🔧 Setting up backend environment..."
cd services/users

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "📦 Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1

# Run database migrations
echo "🗄️ Running database migrations..."
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/testdriven_dev"
export FLASK_APP=manage.py
python manage.py db upgrade

# Seed demo data (includes Enhanced Meeting Activities)
echo "🌱 Seeding demo data..."
python manage.py seed-demo-data

echo ""
echo "🎉 SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "📋 NEXT STEPS:"
echo "1. Backend: cd services/users && source venv/bin/activate && python manage.py run"
echo "2. Frontend: cd client && npm install && npm start"
echo ""
echo "🌐 URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000"
echo "- Database: localhost:5432"
echo ""
echo "✨ Enhanced Meeting Activities is fully integrated!"
echo "   - API endpoints available at /api/meeting-activities/*"
echo "   - Frontend navigation includes Activity Reports"
echo "   - Document upload functionality ready"
echo ""
