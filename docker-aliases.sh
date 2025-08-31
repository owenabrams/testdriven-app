#!/bin/bash

# Docker Space Management Aliases
# Source this file to add helpful Docker aliases: source docker-aliases.sh

echo "🐳 Loading Docker Space Management Aliases..."

# Basic Docker aliases
alias dc='docker-compose'
alias dps='docker ps'
alias di='docker images'
alias dv='docker volume ls'
alias dn='docker network ls'

# Space management aliases
alias docker-space='docker system df'
alias docker-clean='docker system prune -f'
alias docker-clean-all='docker system prune -af'
alias docker-clean-volumes='docker volume prune -f'
alias docker-clean-images='docker image prune -af'
alias docker-clean-containers='docker container prune -f'

# Advanced cleanup aliases
alias docker-nuke='docker stop $(docker ps -q) 2>/dev/null; docker system prune -af --volumes'
alias docker-reset='docker-nuke && docker system df'

# Build aliases with space optimization
alias dc-build='docker-compose build --no-cache'
alias dc-rebuild='docker-compose down && docker-compose build --no-cache && docker-compose up -d'

# Monitoring aliases
alias docker-monitor='watch -n 2 "docker system df && echo && docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\""'
alias docker-logs-all='docker-compose logs -f'

# Space-efficient development workflow
alias dev-start='docker-compose up -d'
alias dev-stop='docker-compose down'
alias dev-restart='docker-compose restart'
alias dev-rebuild='docker-compose down && docker system prune -f && docker-compose up -d --build'

# Database management
alias db-reset='docker-compose exec users python manage.py recreate_db'
alias db-seed='docker-compose exec users python manage.py seed_db'

# Testing aliases
alias test-users='docker-compose exec users python manage.py test'
alias test-client='docker-compose exec client npm test'

# Utility functions
docker-size() {
    echo "📊 Docker Space Usage:"
    docker system df
    echo ""
    echo "💾 Container Sizes:"
    docker ps --size --format "table {{.Names}}\t{{.Size}}"
    echo ""
    echo "🖼️  Image Sizes:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
}

docker-cleanup-safe() {
    echo "🧹 Safe Docker Cleanup..."
    echo "Removing stopped containers..."
    docker container prune -f
    echo "Removing unused networks..."
    docker network prune -f
    echo "Removing dangling images..."
    docker image prune -f
    echo "✅ Safe cleanup completed!"
    docker system df
}

docker-cleanup-aggressive() {
    echo "⚠️  AGGRESSIVE Docker Cleanup - This will remove unused images and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🧨 Performing aggressive cleanup..."
        docker system prune -af --volumes
        echo "✅ Aggressive cleanup completed!"
        docker system df
    else
        echo "❌ Aggressive cleanup cancelled"
    fi
}

# Show available aliases
docker-help() {
    echo "🐳 Available Docker Aliases:"
    echo "=========================="
    echo ""
    echo "📊 Monitoring:"
    echo "  docker-space     - Show Docker space usage"
    echo "  docker-size      - Detailed size breakdown"
    echo "  docker-monitor   - Live monitoring dashboard"
    echo ""
    echo "🧹 Cleanup:"
    echo "  docker-clean     - Safe cleanup (stopped containers, unused networks)"
    echo "  docker-clean-all - Remove all unused resources"
    echo "  docker-nuke      - Nuclear option (stops all, removes everything)"
    echo "  docker-cleanup-safe       - Interactive safe cleanup"
    echo "  docker-cleanup-aggressive - Interactive aggressive cleanup"
    echo ""
    echo "🔧 Development:"
    echo "  dev-start        - Start all services"
    echo "  dev-stop         - Stop all services"
    echo "  dev-restart      - Restart all services"
    echo "  dev-rebuild      - Full rebuild and restart"
    echo ""
    echo "🗄️  Database:"
    echo "  db-reset         - Recreate database"
    echo "  db-seed          - Seed database with test data"
    echo ""
    echo "🧪 Testing:"
    echo "  test-users       - Run backend tests"
    echo "  test-client      - Run frontend tests"
    echo ""
    echo "📋 Basic:"
    echo "  dc               - docker-compose shortcut"
    echo "  dps              - docker ps shortcut"
    echo "  di               - docker images shortcut"
}

echo "✅ Docker aliases loaded! Type 'docker-help' to see all available commands."
echo "💡 Current Docker space usage:"
docker system df
