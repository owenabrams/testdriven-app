#!/bin/bash

# Environment-Separated Container Build Script
# Enforces clear separation between local, staging, and production containers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-development}
SERVICE=${2:-all}
VERSION=${3:-$(git describe --tags --always 2>/dev/null || echo "v0.0.0")}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validate environment
validate_environment() {
    log_info "Validating environment: $ENVIRONMENT"
    
    case "$ENVIRONMENT" in
        "development"|"staging"|"production")
            log_success "Environment '$ENVIRONMENT' is valid"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            echo "Valid options: development, staging, production"
            exit 1
            ;;
    esac
}

# Load environment configuration
load_config() {
    CONFIG_FILE="config/environments/${ENVIRONMENT}.env"
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Environment config not found: $CONFIG_FILE"
        exit 1
    fi
    
    source "$CONFIG_FILE"
    log_success "Loaded configuration for $ENVIRONMENT"
}

# Build frontend with environment separation
build_frontend() {
    log_info "Building frontend for $ENVIRONMENT environment..."
    
    # Environment-specific image tag
    if [[ "$ENVIRONMENT" == "development" ]]; then
        # Local development - no ECR push
        FRONTEND_TAG="testdriven-frontend-local:latest"
        FRONTEND_VERSIONED_TAG="testdriven-frontend-local:${VERSION}-${TIMESTAMP}"
    else
        # Cloud environments - ECR tags
        FRONTEND_TAG="${ECR_REGISTRY}/testdriven-frontend-${ENVIRONMENT}:latest"
        FRONTEND_VERSIONED_TAG="${ECR_REGISTRY}/testdriven-frontend-${ENVIRONMENT}:${VERSION}-${TIMESTAMP}"
    fi
    
    log_info "Frontend tags:"
    log_info "  Latest: $FRONTEND_TAG"
    log_info "  Versioned: $FRONTEND_VERSIONED_TAG"
    
    cd client
    
    # Build with environment validation
    docker build \
        --platform linux/amd64 \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        --build-arg REACT_APP_API_URL="$REACT_APP_API_URL" \
        --build-arg BUILD_VERSION="$VERSION" \
        --build-arg BUILD_TIMESTAMP="$TIMESTAMP" \
        -t "$FRONTEND_TAG" \
        -t "$FRONTEND_VERSIONED_TAG" \
        .
    
    cd ..
    
    log_success "Frontend built successfully"
    
    # Store tags for later use
    echo "$FRONTEND_VERSIONED_TAG" > /tmp/frontend-image-tag
}

# Build backend with environment separation
build_backend() {
    log_info "Building backend for $ENVIRONMENT environment..."
    
    # Environment-specific image tag
    if [[ "$ENVIRONMENT" == "development" ]]; then
        # Local development - no ECR push
        BACKEND_TAG="testdriven-backend-local:latest"
        BACKEND_VERSIONED_TAG="testdriven-backend-local:${VERSION}-${TIMESTAMP}"
    else
        # Cloud environments - ECR tags
        BACKEND_TAG="${ECR_REGISTRY}/testdriven-backend-${ENVIRONMENT}:latest"
        BACKEND_VERSIONED_TAG="${ECR_REGISTRY}/testdriven-backend-${ENVIRONMENT}:${VERSION}-${TIMESTAMP}"
    fi
    
    log_info "Backend tags:"
    log_info "  Latest: $BACKEND_TAG"
    log_info "  Versioned: $BACKEND_VERSIONED_TAG"
    
    cd services/users
    
    # Build with environment validation
    docker build \
        --platform linux/amd64 \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        --build-arg BUILD_VERSION="$VERSION" \
        --build-arg BUILD_TIMESTAMP="$TIMESTAMP" \
        -t "$BACKEND_TAG" \
        -t "$BACKEND_VERSIONED_TAG" \
        .
    
    cd ../..
    
    log_success "Backend built successfully"
    
    # Store tags for later use
    echo "$BACKEND_VERSIONED_TAG" > /tmp/backend-image-tag
}

# Push to ECR (only for non-development environments)
push_to_ecr() {
    if [[ "$ENVIRONMENT" == "development" ]]; then
        log_info "Skipping ECR push for development environment"
        return
    fi
    
    log_info "Pushing images to ECR..."
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_REGISTRY"
    
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        FRONTEND_TAG=$(cat /tmp/frontend-image-tag)
        docker push "$FRONTEND_TAG"
        docker push "${ECR_REGISTRY}/testdriven-frontend-${ENVIRONMENT}:latest"
        log_success "Frontend pushed to ECR"
    fi
    
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        BACKEND_TAG=$(cat /tmp/backend-image-tag)
        docker push "$BACKEND_TAG"
        docker push "${ECR_REGISTRY}/testdriven-backend-${ENVIRONMENT}:latest"
        log_success "Backend pushed to ECR"
    fi
}

# Verify build
verify_build() {
    log_info "Verifying build..."
    
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        if [[ "$ENVIRONMENT" == "development" ]]; then
            FRONTEND_TAG="testdriven-frontend-local:latest"
        else
            FRONTEND_TAG="${ECR_REGISTRY}/testdriven-frontend-${ENVIRONMENT}:latest"
        fi
        
        # Check if image exists
        if docker image inspect "$FRONTEND_TAG" > /dev/null 2>&1; then
            log_success "Frontend image verified: $FRONTEND_TAG"
        else
            log_error "Frontend image not found: $FRONTEND_TAG"
            exit 1
        fi
    fi
    
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        if [[ "$ENVIRONMENT" == "development" ]]; then
            BACKEND_TAG="testdriven-backend-local:latest"
        else
            BACKEND_TAG="${ECR_REGISTRY}/testdriven-backend-${ENVIRONMENT}:latest"
        fi
        
        # Check if image exists
        if docker image inspect "$BACKEND_TAG" > /dev/null 2>&1; then
            log_success "Backend image verified: $BACKEND_TAG"
        else
            log_error "Backend image not found: $BACKEND_TAG"
            exit 1
        fi
    fi
}

# Generate build report
generate_build_report() {
    REPORT_FILE="build-report-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$REPORT_FILE" <<EOF
{
  "build_info": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "version": "$VERSION",
    "service": "$SERVICE",
    "git_commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')"
  },
  "images": {
EOF

    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        if [[ -f /tmp/frontend-image-tag ]]; then
            FRONTEND_TAG=$(cat /tmp/frontend-image-tag)
            cat >> "$REPORT_FILE" <<EOF
    "frontend": {
      "tag": "$FRONTEND_TAG",
      "environment": "$ENVIRONMENT",
      "api_url": "$REACT_APP_API_URL"
    }$(if [[ "$SERVICE" == "all" ]]; then echo ","; fi)
EOF
        fi
    fi

    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        if [[ -f /tmp/backend-image-tag ]]; then
            BACKEND_TAG=$(cat /tmp/backend-image-tag)
            cat >> "$REPORT_FILE" <<EOF
    "backend": {
      "tag": "$BACKEND_TAG",
      "environment": "$ENVIRONMENT"
    }
EOF
        fi
    fi

    cat >> "$REPORT_FILE" <<EOF
  }
}
EOF

    log_success "Build report generated: $REPORT_FILE"
}

# Main execution
main() {
    echo "🏗️  Environment-Separated Container Build"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Service: $SERVICE"
    echo "Version: $VERSION"
    echo "Timestamp: $TIMESTAMP"
    echo ""
    
    validate_environment
    load_config
    
    # Build phase
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        build_frontend
    fi
    
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        build_backend
    fi
    
    # Push phase (only for cloud environments)
    push_to_ecr
    
    # Verification phase
    verify_build
    
    # Reporting phase
    generate_build_report
    
    log_success "🎉 Build completed successfully!"
    echo ""
    echo "📋 Summary:"
    echo "  Environment: $ENVIRONMENT"
    echo "  Service: $SERVICE"
    echo "  Version: $VERSION"
    
    if [[ "$ENVIRONMENT" != "development" ]]; then
        echo "  Registry: $ECR_REGISTRY"
        echo "  Images pushed to ECR: ✅"
    else
        echo "  Local images built: ✅"
        echo "  ECR push: Skipped (development)"
    fi
}

# Help function
show_help() {
    echo "Environment-Separated Container Build Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [SERVICE] [VERSION]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  development  - Build local containers (no ECR push)"
    echo "  staging      - Build and push staging containers"
    echo "  production   - Build and push production containers"
    echo ""
    echo "SERVICE:"
    echo "  frontend     - Build only frontend"
    echo "  backend      - Build only backend"
    echo "  all          - Build both frontend and backend (default)"
    echo ""
    echo "VERSION:"
    echo "  Auto-detected from git tags (default)"
    echo "  Or specify manually: v1.2.3"
    echo ""
    echo "Examples:"
    echo "  $0 development                    # Build local containers"
    echo "  $0 production frontend v1.2.3    # Build production frontend"
    echo "  $0 staging all                    # Build all staging containers"
}

# Parse arguments
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

# Run main function
main
