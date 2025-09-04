#!/bin/bash

echo "🔨 Building local development environment..."

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd services/users
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
cd ../..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd services/client
npm install
cd ../..

# Install root dependencies (Cypress, etc.)
echo "📦 Installing root dependencies..."
npm install

echo "✅ Build complete!"
echo "📋 To start the application:"
echo "  Backend: cd services/users && source venv/bin/activate && python run_flask.py"
echo "  Frontend: cd services/client && npm start"