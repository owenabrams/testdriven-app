#!/bin/bash

set -e  # Exit on any error

ENVIRONMENT=${1:-staging}
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

echo "🚀 Deploying to $ENVIRONMENT environment..."

# Validate environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file $ENV_FILE not found!"
    exit 1
fi

# Load environment variables
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Validate required environment variables
required_vars=("POSTGRES_PASSWORD" "SECRET_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set!"
        exit 1
    fi
done

# Pull latest images (if using registry)
echo "📥 Pulling latest images..."
docker-compose -f $COMPOSE_FILE pull || true

# Build and deploy
echo "🔨 Building and deploying..."
docker-compose -f $COMPOSE_FILE up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout 300 bash -c 'until docker-compose -f docker-compose.prod.yml ps | grep -q "healthy"; do sleep 5; done'

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose -f $COMPOSE_FILE exec -T users python manage.py recreate_db

# Run health checks
echo "🏥 Running health checks..."
sleep 10
curl -f http://localhost/health || {
    echo "❌ Health check failed!"
    docker-compose -f $COMPOSE_FILE logs
    exit 1
}

echo "✅ Deployment successful!"
echo "📊 Service status:"
docker-compose -f $COMPOSE_FILE ps