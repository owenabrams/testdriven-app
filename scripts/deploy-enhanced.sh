#!/bin/bash

# Enhanced Professional Deployment Script
# Addresses all issues encountered in manual deployments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
SERVICE=${2:-all}
CONFIG_FILE="config/environments/${ENVIRONMENT}.env"

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
    log_info "Validating environment configuration..."
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Environment config not found: $CONFIG_FILE"
        exit 1
    fi
    
    source "$CONFIG_FILE"
    
    # Validate required variables
    required_vars=(
        "REACT_APP_API_URL"
        "ECS_CLUSTER"
        "FRONTEND_SERVICE"
        "BACKEND_SERVICE"
        "ECR_REGISTRY"
        "FRONTEND_TARGET_GROUP_ARN"
        "BACKEND_TARGET_GROUP_ARN"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required variable $var is not set in $CONFIG_FILE"
            exit 1
        fi
    done
    
    log_success "Environment configuration validated"
}

# AWS Authentication
check_aws_auth() {
    log_info "Checking AWS authentication..."
    
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
        log_error "AWS authentication failed. Please run 'aws configure' or set credentials."
        exit 1
    fi
    
    log_success "AWS authentication verified"
}

# Build frontend with environment-specific configuration
build_frontend() {
    log_info "Building frontend for $ENVIRONMENT environment..."
    
    cd client
    
    # Generate unique tag with timestamp
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    FRONTEND_IMAGE_TAG="${ECR_REGISTRY}/testdriven-frontend:${ENVIRONMENT}-${TIMESTAMP}"
    
    # Build with correct API URL
    docker build --platform linux/amd64 \
        --build-arg REACT_APP_API_URL="$REACT_APP_API_URL" \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        -t "$FRONTEND_IMAGE_TAG" .
    
    cd ..
    
    log_success "Frontend built successfully: $FRONTEND_IMAGE_TAG"
}

# Build backend
build_backend() {
    log_info "Building backend for $ENVIRONMENT environment..."
    
    cd services/users
    
    # Generate unique tag with timestamp
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKEND_IMAGE_TAG="${ECR_REGISTRY}/testdriven-users:${ENVIRONMENT}-${TIMESTAMP}"
    
    docker build --platform linux/amd64 \
        -t "$BACKEND_IMAGE_TAG" .
    
    cd ../..
    
    log_success "Backend built successfully: $BACKEND_IMAGE_TAG"
}

# Push images to ECR
push_to_ecr() {
    log_info "Pushing images to ECR..."
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_REGISTRY"
    
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        docker push "$FRONTEND_IMAGE_TAG"
        log_success "Frontend image pushed to ECR"
    fi
    
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        docker push "$BACKEND_IMAGE_TAG"
        log_success "Backend image pushed to ECR"
    fi
}

# Update ECS task definitions
update_task_definitions() {
    log_info "Updating ECS task definitions..."
    
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        # Get current task definition
        aws ecs describe-task-definition \
            --task-definition "$FRONTEND_TASK_DEFINITION" \
            --query 'taskDefinition' > /tmp/frontend-task-def.json
        
        # Update image reference and clean metadata
        cat /tmp/frontend-task-def.json | \
            jq --arg image "$FRONTEND_IMAGE_TAG" \
            '.containerDefinitions[0].image = $image' | \
            jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)' \
            > /tmp/new-frontend-task-def.json
        
        # Register new task definition
        FRONTEND_TASK_ARN=$(aws ecs register-task-definition \
            --cli-input-json file:///tmp/new-frontend-task-def.json \
            --query 'taskDefinition.taskDefinitionArn' --output text)
        
        log_success "Frontend task definition updated: $FRONTEND_TASK_ARN"
    fi
    
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        # Similar process for backend
        aws ecs describe-task-definition \
            --task-definition "$BACKEND_TASK_DEFINITION" \
            --query 'taskDefinition' > /tmp/backend-task-def.json
        
        cat /tmp/backend-task-def.json | \
            jq --arg image "$BACKEND_IMAGE_TAG" \
            '.containerDefinitions[0].image = $image' | \
            jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)' \
            > /tmp/new-backend-task-def.json
        
        BACKEND_TASK_ARN=$(aws ecs register-task-definition \
            --cli-input-json file:///tmp/new-backend-task-def.json \
            --query 'taskDefinition.taskDefinitionArn' --output text)
        
        log_success "Backend task definition updated: $BACKEND_TASK_ARN"
    fi
}

# Update ECS services
update_services() {
    log_info "Updating ECS services..."
    
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        aws ecs update-service \
            --cluster "$ECS_CLUSTER" \
            --service "$FRONTEND_SERVICE" \
            --task-definition "$FRONTEND_TASK_ARN" \
            --force-new-deployment > /dev/null
        
        log_success "Frontend service update initiated"
    fi
    
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        aws ecs update-service \
            --cluster "$ECS_CLUSTER" \
            --service "$BACKEND_SERVICE" \
            --task-definition "$BACKEND_TASK_ARN" \
            --force-new-deployment > /dev/null
        
        log_success "Backend service update initiated"
    fi
}

# Wait for deployment to complete
wait_for_deployment() {
    log_info "Waiting for deployment to complete..."
    
    services_to_wait=()
    
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        services_to_wait+=("$FRONTEND_SERVICE")
    fi
    
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        services_to_wait+=("$BACKEND_SERVICE")
    fi
    
    for service in "${services_to_wait[@]}"; do
        log_info "Waiting for $service to stabilize..."
        aws ecs wait services-stable \
            --cluster "$ECS_CLUSTER" \
            --services "$service"
        log_success "$service deployment completed"
    done
}

# Fix target group registrations
fix_target_groups() {
    log_info "Updating target group registrations..."
    
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        # Get current frontend task IP
        FRONTEND_TASK_ARN=$(aws ecs list-tasks \
            --cluster "$ECS_CLUSTER" \
            --service-name "$FRONTEND_SERVICE" \
            --query 'taskArns[0]' --output text)
        
        FRONTEND_IP=$(aws ecs describe-tasks \
            --cluster "$ECS_CLUSTER" \
            --tasks "$FRONTEND_TASK_ARN" \
            --query 'tasks[0].attachments[0].details[?name==`privateIPv4Address`].value' \
            --output text)
        
        # Get current targets and deregister old ones
        OLD_TARGETS=$(aws elbv2 describe-target-health \
            --target-group-arn "$FRONTEND_TARGET_GROUP_ARN" \
            --query 'TargetHealthDescriptions[?TargetHealth.State==`unhealthy`].Target.Id' \
            --output text)
        
        for old_ip in $OLD_TARGETS; do
            if [[ "$old_ip" != "$FRONTEND_IP" ]]; then
                aws elbv2 deregister-targets \
                    --target-group-arn "$FRONTEND_TARGET_GROUP_ARN" \
                    --targets Id="$old_ip",Port=80 || true
                log_info "Deregistered old frontend target: $old_ip"
            fi
        done
        
        # Register new target
        aws elbv2 register-targets \
            --target-group-arn "$FRONTEND_TARGET_GROUP_ARN" \
            --targets Id="$FRONTEND_IP",Port=80
        
        log_success "Frontend target group updated: $FRONTEND_IP"
    fi
    
    # Similar process for backend if needed
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        log_info "Backend target group registration handled by ECS service"
    fi
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment health..."
    
    # Wait a bit for target groups to update
    sleep 30
    
    # Check backend health
    if ! curl -f -s "$REACT_APP_API_URL/ping" > /dev/null; then
        log_error "Backend health check failed"
        return 1
    fi
    log_success "Backend health check passed"
    
    # Check frontend health
    if ! curl -f -s "$ALB_URL/" > /dev/null; then
        log_error "Frontend health check failed"
        return 1
    fi
    log_success "Frontend health check passed"
    
    # Check target group health
    UNHEALTHY_TARGETS=$(aws elbv2 describe-target-health \
        --target-group-arn "$FRONTEND_TARGET_GROUP_ARN" \
        --query 'TargetHealthDescriptions[?TargetHealth.State!=`healthy`]' \
        --output text)
    
    if [[ -n "$UNHEALTHY_TARGETS" ]]; then
        log_warning "Some targets are still unhealthy, but deployment completed"
    else
        log_success "All targets are healthy"
    fi
}

# Main execution
main() {
    echo "🚀 Starting enhanced deployment to $ENVIRONMENT environment..."
    echo "📦 Service: $SERVICE"
    echo ""
    
    validate_environment
    check_aws_auth
    
    # Build phase
    if [[ "$SERVICE" == "frontend" || "$SERVICE" == "all" ]]; then
        build_frontend
    fi
    
    if [[ "$SERVICE" == "backend" || "$SERVICE" == "all" ]]; then
        build_backend
    fi
    
    # Deploy phase
    push_to_ecr
    update_task_definitions
    update_services
    wait_for_deployment
    fix_target_groups
    
    # Verify phase
    if verify_deployment; then
        log_success "🎉 Deployment completed successfully!"
        echo ""
        echo "🌍 Application URL: $ALB_URL"
        echo "🔗 API URL: $REACT_APP_API_URL"
    else
        log_error "❌ Deployment verification failed"
        exit 1
    fi
}

# Help function
show_help() {
    echo "Enhanced Deployment Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT] [SERVICE]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  development  - Deploy to development environment"
    echo "  staging      - Deploy to staging environment"
    echo "  production   - Deploy to production environment (default)"
    echo ""
    echo "SERVICE:"
    echo "  frontend     - Deploy only frontend"
    echo "  backend      - Deploy only backend"
    echo "  all          - Deploy both frontend and backend (default)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy all to production"
    echo "  $0 production frontend      # Deploy only frontend to production"
    echo "  $0 development              # Deploy all to development"
}

# Parse arguments
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

# Run main function
main
