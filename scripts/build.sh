#!/bin/bash

# Configuration
CLEANUP_THRESHOLD_GB=10  # Cleanup if Docker uses more than 10GB
AUTO_CLEANUP=${AUTO_CLEANUP:-true}  # Set to false to disable auto-cleanup

# Function to get Docker space usage in GB
get_docker_usage() {
    docker system df --format "{{.Size}}" | head -1 | sed 's/GB.*//' | sed 's/MB.*/0/' | sed 's/[^0-9.]//g'
}

# Function to cleanup Docker resources
cleanup_docker() {
    echo "🧹 Cleaning up Docker resources..."
    docker-compose down 2>/dev/null || true
    docker system prune -f
    docker volume prune -f
    docker image prune -a -f
    echo "✅ Cleanup complete!"
}

# Check if cleanup is needed
if [ "$AUTO_CLEANUP" = "true" ]; then
    CURRENT_USAGE=$(get_docker_usage)
    if (( $(echo "$CURRENT_USAGE > $CLEANUP_THRESHOLD_GB" | bc -l) )); then
        echo "⚠️  Docker usage ($CURRENT_USAGE GB) exceeds threshold ($CLEANUP_THRESHOLD_GB GB)"
        cleanup_docker
    else
        echo "✅ Docker usage ($CURRENT_USAGE GB) is within threshold"
        docker-compose down 2>/dev/null || true
    fi
else
    echo "🔄 Auto-cleanup disabled, stopping containers only..."
    docker-compose down 2>/dev/null || true
fi

echo "📊 Docker space usage:"
docker system df

echo "🔨 Building and starting containers..."
docker-compose up -d --build

echo "✅ Build complete!"
echo "📋 Container status:"
docker-compose ps

# Initialize database if needed
echo "🗄️  Initializing database..."
docker-compose exec -T users python manage.py recreate_db