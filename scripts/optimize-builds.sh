#!/bin/bash

# 🚀 DOCKER BUILD OPTIMIZATION SCRIPT
# Professional build optimization for TestDriven application
# Prevents slow builds and implements caching strategies

set -e

echo "🚀 DOCKER BUILD OPTIMIZATION"
echo "============================"
echo "Implementing professional build optimization strategies..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Docker is running ✓"

# Enable BuildKit for faster builds
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

print_status "Enabled Docker BuildKit for optimized builds"

# Create build cache directory if it doesn't exist
mkdir -p .docker-cache

print_status "Build cache directory ready"

# Function to build with cache
build_with_cache() {
    local service=$1
    local dockerfile_path=$2
    local context_path=$3
    
    print_status "Building $service with cache optimization..."
    
    docker build \
        --cache-from "$service:latest" \
        --tag "$service:latest" \
        --file "$dockerfile_path" \
        "$context_path" \
        --progress=plain \
        --build-arg BUILDKIT_INLINE_CACHE=1
    
    print_success "$service build completed with cache optimization"
}

# Function to prune build cache if it gets too large
manage_build_cache() {
    print_status "Checking build cache size..."
    
    # Get cache size in MB
    cache_size=$(docker system df --format "table {{.Type}}\t{{.Size}}" | grep "Build Cache" | awk '{print $3}' | sed 's/MB//' | sed 's/GB/*1024/' | bc 2>/dev/null || echo "0")
    
    if (( $(echo "$cache_size > 1000" | bc -l) )); then
        print_warning "Build cache is large (${cache_size}MB). Pruning old cache..."
        docker builder prune --filter until=24h -f
        print_success "Build cache pruned"
    else
        print_status "Build cache size is optimal (${cache_size}MB)"
    fi
}

# Function to optimize Docker daemon settings
optimize_docker_daemon() {
    print_status "Checking Docker daemon optimization..."
    
    # Check if we can optimize Docker settings
    if [[ "$OSTYPE" == "darwin"* ]]; then
        print_status "macOS detected - Docker Desktop settings optimization recommended:"
        echo "  • Increase memory allocation to 4GB+ in Docker Desktop"
        echo "  • Enable 'Use gRPC FUSE for file sharing' for better performance"
        echo "  • Consider using Docker Desktop with VirtioFS"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        print_status "Linux detected - Docker optimization tips:"
        echo "  • Ensure Docker daemon has sufficient resources"
        echo "  • Consider using overlay2 storage driver"
    fi
}

# Main optimization process
main() {
    print_status "Starting Docker build optimization process..."
    echo ""
    
    # Step 1: Manage build cache
    manage_build_cache
    echo ""
    
    # Step 2: Optimize Docker daemon
    optimize_docker_daemon
    echo ""
    
    # Step 3: Build images with optimization
    print_status "Building optimized Docker images..."
    echo ""
    
    # Build backend with cache
    print_status "Building backend service..."
    build_with_cache "testdriven-appcopy-backend" "services/users/Dockerfile" "services/users"
    echo ""
    
    # Build frontend with cache
    print_status "Building frontend service..."
    build_with_cache "testdriven-appcopy-frontend" "client/Dockerfile" "client"
    echo ""
    
    # Step 4: Verify optimizations
    print_status "Verifying build optimizations..."
    
    # Check image sizes
    echo ""
    print_status "Docker image sizes:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep testdriven-appcopy || true
    echo ""
    
    # Check build cache usage
    print_status "Build cache status:"
    docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}"
    echo ""
    
    print_success "Docker build optimization completed!"
    echo ""
    print_status "🎯 Optimization Benefits:"
    echo "  ✅ Multi-stage builds reduce image size"
    echo "  ✅ Layer caching speeds up rebuilds"
    echo "  ✅ BuildKit enables parallel builds"
    echo "  ✅ Optimized .dockerignore reduces build context"
    echo "  ✅ Health checks ensure container reliability"
    echo ""
    print_status "💡 For fastest builds, use: docker-compose build --parallel"
}

# Run main function
main "$@"
