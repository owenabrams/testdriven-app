#!/bin/bash

# Docker Space Management Script
# Helps maintain Docker space usage and prevent disk space issues

set -e

echo "🧹 Docker Space Management Tool"
echo "================================"

# Function to show current Docker space usage
show_docker_usage() {
    echo "📊 Current Docker Space Usage:"
    echo "------------------------------"
    docker system df
    echo ""
}

# Function to clean up Docker resources
cleanup_docker() {
    echo "🗑️  Cleaning up Docker resources..."
    
    # Stop all containers
    echo "⏹️  Stopping all containers..."
    docker stop $(docker ps -q) 2>/dev/null || echo "No running containers to stop"
    
    # Remove stopped containers
    echo "🗑️  Removing stopped containers..."
    docker container prune -f
    
    # Remove unused images
    echo "🖼️  Removing unused images..."
    docker image prune -f
    
    # Remove unused networks
    echo "🌐 Removing unused networks..."
    docker network prune -f
    
    # Remove unused volumes (be careful with this)
    echo "💾 Removing unused volumes..."
    docker volume prune -f
    
    # Remove build cache
    echo "🏗️  Removing build cache..."
    docker builder prune -f
    
    echo "✅ Cleanup completed!"
}

# Function for aggressive cleanup (removes everything)
aggressive_cleanup() {
    echo "⚠️  AGGRESSIVE CLEANUP - This will remove ALL Docker data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🧨 Performing aggressive cleanup..."
        docker system prune -af --volumes
        echo "✅ Aggressive cleanup completed!"
    else
        echo "❌ Aggressive cleanup cancelled"
    fi
}

# Function to optimize Docker settings
optimize_docker() {
    echo "⚙️  Docker Optimization Tips:"
    echo "-----------------------------"
    echo "1. Use multi-stage builds to reduce image size"
    echo "2. Use .dockerignore to exclude unnecessary files"
    echo "3. Clean up package caches in Dockerfiles"
    echo "4. Use specific base image tags instead of 'latest'"
    echo "5. Regularly run 'docker system prune'"
    echo ""
    echo "💡 Current Docker daemon settings:"
    docker info | grep -E "(Storage Driver|Logging Driver|Cgroup Driver)" || true
}

# Function to monitor space usage
monitor_space() {
    echo "📈 Docker Space Monitoring:"
    echo "---------------------------"
    
    # Get total space used by Docker
    DOCKER_ROOT=$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || echo "/var/lib/docker")
    if [ -d "$DOCKER_ROOT" ]; then
        DOCKER_SIZE=$(du -sh "$DOCKER_ROOT" 2>/dev/null | cut -f1 || echo "Unknown")
        echo "Docker root directory: $DOCKER_ROOT"
        echo "Total Docker space used: $DOCKER_SIZE"
    fi
    
    # Show disk space
    echo ""
    echo "💽 System disk usage:"
    df -h / | tail -1
    
    # Show Docker system usage
    echo ""
    show_docker_usage
}

# Main menu
case "${1:-menu}" in
    "usage"|"u")
        show_docker_usage
        ;;
    "clean"|"c")
        cleanup_docker
        show_docker_usage
        ;;
    "aggressive"|"a")
        aggressive_cleanup
        show_docker_usage
        ;;
    "optimize"|"o")
        optimize_docker
        ;;
    "monitor"|"m")
        monitor_space
        ;;
    "menu"|*)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  usage, u      - Show Docker space usage"
        echo "  clean, c      - Clean up unused Docker resources"
        echo "  aggressive, a - Aggressive cleanup (removes everything)"
        echo "  optimize, o   - Show optimization tips"
        echo "  monitor, m    - Monitor space usage"
        echo ""
        echo "Examples:"
        echo "  $0 usage      # Show current usage"
        echo "  $0 clean      # Clean up unused resources"
        echo "  $0 monitor    # Full monitoring report"
        ;;
esac
