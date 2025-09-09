#!/bin/bash

# TestDriven App - Local Development Startup Script

echo "🚀 Starting TestDriven App (Local Development)"
echo "=============================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

echo "✅ Python and Node.js are available"

# Setup backend
echo ""
echo "🔧 Setting up Flask backend..."
cd services/users

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements-local.txt

# Set environment variables
export FLASK_APP=project/__init__.py
export FLASK_ENV=development
export APP_SETTINGS=project.config.DevelopmentConfig
export DATABASE_URL=sqlite:///app.db
export SECRET_KEY=dev-secret-key

# Initialize database
echo "🗄️  Initializing database..."
python manage.py recreate_db
python manage.py seed_db

# Seed enhanced demo data as specified in SAVINGS_PLATFORM_INTEGRATION_GUIDE.md
echo "🌱 Seeding enhanced demo data (Sarah, Mary, Grace, Alice, Jane, etc.)..."
echo "   Following SAVINGS_PLATFORM_INTEGRATION_GUIDE.md specifications..."
python seed_demo_data.py

# Verify seeding matches SAVINGS_PLATFORM_INTEGRATION_GUIDE.md
echo "🔍 Verifying integration guide compliance..."
cd ../../
python verify-integration-guide-seeding.py
cd services/users

# Create super admin for testing
echo "👑 Creating super admin..."
echo -e "superadmin\nsuperadmin@testdriven.io\nsuperpassword123" | python manage.py create_super_admin

# Service admin creation is now handled in seed_demo_data.py

echo ""
echo "🎯 Backend setup complete!"
echo "   Flask API will run on: http://localhost:5000"

# Start backend in background
echo "🚀 Starting Flask backend..."
python manage.py run &
BACKEND_PID=$!

# Setup frontend
echo ""
echo "🔧 Setting up React frontend..."
cd ../../client

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo ""
echo "🎯 Frontend setup complete!"
echo "   React app will run on: http://localhost:3000"

# Start frontend
echo "🚀 Starting React frontend..."
npm start &
FRONTEND_PID=$!

echo ""
echo "✅ TestDriven App is starting up!"
echo "================================="
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:5000"
echo ""
echo "📋 Demo Users (as per SAVINGS_PLATFORM_INTEGRATION_GUIDE.md):"
echo "   Super Admin: superadmin@testdriven.io / superpassword123"
echo "   Service Admin: admin@savingsgroups.ug / admin123"
echo "   Group Officer: sarah@kampala.ug / password123"
echo "   Group Member: alice@kampala.ug / password123"
echo ""
echo "🎯 Access Savings Platform: http://localhost:3000/savings-groups"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for user to stop
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Keep script running
wait