#!/bin/bash

# Start TestDriven App Services Locally

echo "🚀 Starting TestDriven App Services..."

# Set environment variables
export FLASK_APP=project/__init__.py
export FLASK_ENV=development
export DATABASE_URL=sqlite:///app.db
export DATABASE_TEST_URL=sqlite:///test.db
export SECRET_KEY=dev-secret-key-change-in-production
export REACT_APP_USERS_SERVICE_URL=http://localhost:5000

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start Flask API
echo "🐍 Starting Flask API on port 5000..."
cd services/users

# Check if virtual environment exists, if not create it
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements if needed
if [ ! -f "venv/installed" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -r requirements.txt
    touch venv/installed
fi

# Set up database and start Flask
python3 manage.py recreate-db
python3 manage.py seed-db
python3 manage.py run -h 0.0.0.0 &
FLASK_PID=$!
cd ../..

# Wait a moment for Flask to start
sleep 3

# Start React App
echo "⚛️  Starting React App on port 3000..."
cd services/client
npm start &
REACT_PID=$!
cd ..

# Wait for services to start
sleep 5

echo ""
echo "✅ Services Started!"
echo "🌐 Flask API: http://localhost:5000"
echo "🌐 React App: http://localhost:3000"
echo ""
echo "📊 Testing services..."

# Test the services
node test-app.js

echo ""
echo "🎯 To stop services:"
echo "   kill $FLASK_PID $REACT_PID"
echo ""
echo "📱 Open http://localhost:3000 in your browser!"