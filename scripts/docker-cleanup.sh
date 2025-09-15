#!/bin/bash

# =============================================================================
# TESTDRIVEN DOCKER CLEANUP SCRIPT
# =============================================================================
# Comprehensive Docker space management following TestDriven best practices
# Safely removes unused containers, images, cache, and volumes
# =============================================================================

set -e

echo "🧹 TESTDRIVEN DOCKER CLEANUP"
echo "============================="
echo "Following TestDriven.io best practices for Docker space management"
echo "============================="

# Function to display disk usage
show_docker_usage() {
    echo ""
    echo "📊 DOCKER DISK USAGE:"
    echo "====================="
    docker system df
    echo ""
}

# Function to safely stop and remove containers
cleanup_containers() {
    echo "🛑 STOPPING AND REMOVING CONTAINERS"
    echo "===================================="
    
    # Stop all running containers
    if [ "$(docker ps -q)" ]; then
        echo "Stopping running containers..."
        docker stop $(docker ps -q)
    else
        echo "No running containers to stop"
    fi
    
    # Remove all containers (stopped and running)
    if [ "$(docker ps -aq)" ]; then
        echo "Removing all containers..."
        docker rm $(docker ps -aq)
    else
        echo "No containers to remove"
    fi
    
    echo "✅ Container cleanup complete"
}

# Function to remove unused images
cleanup_images() {
    echo ""
    echo "🖼️  REMOVING UNUSED IMAGES"
    echo "=========================="
    
    # Remove dangling images
    if [ "$(docker images -f 'dangling=true' -q)" ]; then
        echo "Removing dangling images..."
        docker rmi $(docker images -f 'dangling=true' -q)
    else
        echo "No dangling images to remove"
    fi
    
    # Remove unused images (not referenced by any container)
    echo "Removing unused images..."
    docker image prune -f
    
    echo "✅ Image cleanup complete"
}

# Function to remove unused volumes
cleanup_volumes() {
    echo ""
    echo "💾 REMOVING UNUSED VOLUMES"
    echo "=========================="
    
    # Remove unused volumes
    echo "Removing unused volumes..."
    docker volume prune -f
    
    echo "✅ Volume cleanup complete"
}

# Function to remove unused networks
cleanup_networks() {
    echo ""
    echo "🌐 REMOVING UNUSED NETWORKS"
    echo "==========================="
    
    # Remove unused networks
    echo "Removing unused networks..."
    docker network prune -f
    
    echo "✅ Network cleanup complete"
}

# Function to clean build cache
cleanup_build_cache() {
    echo ""
    echo "🏗️  REMOVING BUILD CACHE"
    echo "========================"
    
    # Remove build cache
    echo "Removing build cache..."
    docker builder prune -f
    
    echo "✅ Build cache cleanup complete"
}

# Function to perform comprehensive cleanup
comprehensive_cleanup() {
    echo ""
    echo "🚀 COMPREHENSIVE DOCKER CLEANUP"
    echo "==============================="
    
    # Use docker system prune for comprehensive cleanup
    echo "Performing comprehensive cleanup..."
    docker system prune -af --volumes
    
    echo "✅ Comprehensive cleanup complete"
}

# Main execution
main() {
    echo "Starting Docker cleanup process..."
    echo ""
    
    # Show initial usage
    show_docker_usage
    
    # Ask user for cleanup level
    echo "Choose cleanup level:"
    echo "1) Safe cleanup (containers, unused images, cache)"
    echo "2) Comprehensive cleanup (everything including volumes)"
    echo "3) Custom cleanup (choose what to clean)"
    echo ""
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            echo ""
            echo "🔒 PERFORMING SAFE CLEANUP"
            echo "=========================="
            cleanup_containers
            cleanup_images
            cleanup_networks
            cleanup_build_cache
            ;;
        2)
            echo ""
            echo "⚠️  PERFORMING COMPREHENSIVE CLEANUP"
            echo "===================================="
            echo "WARNING: This will remove ALL unused Docker resources including volumes!"
            read -p "Are you sure? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                comprehensive_cleanup
            else
                echo "Cleanup cancelled"
                exit 0
            fi
            ;;
        3)
            echo ""
            echo "🎛️  CUSTOM CLEANUP"
            echo "=================="
            read -p "Clean containers? (y/N): " clean_containers
            read -p "Clean images? (y/N): " clean_images
            read -p "Clean volumes? (y/N): " clean_volumes
            read -p "Clean networks? (y/N): " clean_networks
            read -p "Clean build cache? (y/N): " clean_cache
            
            [[ $clean_containers =~ ^[Yy]$ ]] && cleanup_containers
            [[ $clean_images =~ ^[Yy]$ ]] && cleanup_images
            [[ $clean_volumes =~ ^[Yy]$ ]] && cleanup_volumes
            [[ $clean_networks =~ ^[Yy]$ ]] && cleanup_networks
            [[ $clean_cache =~ ^[Yy]$ ]] && cleanup_build_cache
            ;;
        *)
            echo "Invalid choice. Exiting."
            exit 1
            ;;
    esac
    
    # Show final usage
    echo ""
    echo "🎉 CLEANUP COMPLETE!"
    echo "==================="
    show_docker_usage
    
    echo ""
    echo "💡 TIP: Run this script regularly to maintain optimal Docker performance"
    echo "💡 TIP: Use 'docker-compose up --build' to rebuild your TestDriven app"
}

# Execute main function
main "$@"
