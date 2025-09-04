#!/bin/bash

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
ENV_FILE=".env.prod"

echo "🚀 Building for $ENVIRONMENT environment..."

# Validate environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file $ENV_FILE not found!"
    echo "Please create $ENV_FILE with the required environment variables."
    exit 1
fi

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("DATABASE_URL" "SECRET_KEY" "REACT_APP_USERS_SERVICE_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set!"
        exit 1
    fi
done

# Build frontend for production
echo "🔨 Building frontend for production..."
cd services/client
npm run build
cd ../..

# Setup backend for production
echo "🔨 Setting up backend for production..."
cd services/users
source venv/bin/activate
pip install -r requirements.prod.txt
cd ../..

echo "✅ Production build complete!"
echo "📋 To deploy:"
echo "  1. Copy services/client/build/ to your web server"
echo "  2. Deploy services/users/ to your Python server"
echo "  3. Set up your database and run migrations"