#!/bin/bash

# 🚀 NO-DOCKER LOCAL DEVELOPMENT SETUP
# Perfect for slow internet connections
# Runs everything locally without Docker

echo "🚀 Setting up Local Development (No Docker Required)"
echo "=================================================="

# Check if PostgreSQL is installed locally
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL not found. Please install PostgreSQL locally:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    echo "   Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 16+"
    exit 1
fi

echo "✅ All prerequisites found!"

# Step 1: Setup PostgreSQL database
echo "📊 Setting up PostgreSQL database..."

# Start PostgreSQL service (varies by OS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    brew services start postgresql 2>/dev/null || echo "PostgreSQL may already be running"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    sudo systemctl start postgresql 2>/dev/null || echo "PostgreSQL may already be running"
fi

# Create database and user
echo "🗄️ Creating database..."
createdb testdriven_dev 2>/dev/null || echo "Database may already exist"

# Step 2: Setup Backend
echo "🔧 Setting up Flask backend..."
cd services/users

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://$(whoami)@localhost:5432/testdriven_dev"
export FLASK_APP=manage.py
export FLASK_ENV=development
export SECRET_KEY=dev-secret-key

# Run database migrations
echo "🗄️ Running database migrations..."
python manage.py db upgrade

# Seed demo data (includes Enhanced Meeting Activities)
echo "🌱 Seeding demo data with Enhanced Meeting Activities..."
python manage.py seed-demo-data

echo "✅ Backend setup complete!"

# Step 3: Setup Frontend
echo "🎨 Setting up React frontend..."
cd ../../client

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

echo "✅ Frontend setup complete!"

# Back to root directory
cd ..

echo ""
echo "🎉 SETUP COMPLETE!"
echo "=================================================="
echo ""
echo "📋 TO START THE APPLICATION:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd services/users"
echo "  source venv/bin/activate"
echo "  export DATABASE_URL=\"postgresql://$(whoami)@localhost:5432/testdriven_dev\""
echo "  python manage.py run"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd client"
echo "  npm start"
echo ""
echo "🌐 URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000"
echo "- Database: localhost:5432"
echo ""
echo "✨ ENHANCED MEETING ACTIVITIES FEATURES:"
echo "- ✅ All API endpoints available"
echo "- ✅ Database tables created"
echo "- ✅ Demo data seeded"
echo "- ✅ Frontend navigation integrated"
echo "- ✅ Document upload functionality ready"
echo ""
echo "🔗 Test Enhanced Meeting Activities API:"
echo "  curl http://localhost:5000/api/meeting-activities/health"
echo ""
