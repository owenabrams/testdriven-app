#!/bin/bash

# 🚀 DAILY STARTUP SCRIPT (No Docker)
# Quick start for local development

echo "🚀 Starting Enhanced Meeting Activities Application"
echo "=================================================="

# Check if setup has been run
if [ ! -d "services/users/venv" ]; then
    echo "❌ Setup not complete. Please run: ./setup-local-no-docker.sh"
    exit 1
fi

# Start PostgreSQL if not running
if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql 2>/dev/null
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo systemctl start postgresql 2>/dev/null
fi

echo "✅ PostgreSQL started"

# Function to start backend
start_backend() {
    echo "🔧 Starting Flask backend..."
    cd services/users
    source venv/bin/activate
    export DATABASE_URL="postgresql://$(whoami)@localhost:5432/testdriven_dev"
    export FLASK_APP=manage.py
    export FLASK_ENV=development
    export SECRET_KEY=dev-secret-key
    python manage.py run
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting React frontend..."
    cd client
    npm start
}

echo ""
echo "📋 CHOOSE STARTUP MODE:"
echo "1. Start Backend only"
echo "2. Start Frontend only" 
echo "3. Start Backend (this terminal) + instructions for Frontend"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        start_backend
        ;;
    2)
        start_frontend
        ;;
    3)
        echo ""
        echo "🔧 Starting Backend in this terminal..."
        echo "📋 To start Frontend, open another terminal and run:"
        echo "   cd client && npm start"
        echo ""
        start_backend
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac
