#!/bin/bash

# Manual Deployment Script - Fallback for CI/CD Failures
# This script provides a reliable way to deploy when GitHub Actions fails

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="068561046929"
CLUSTER_NAME="testdriven-production-cluster"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Services configuration function
get_service_config() {
    case $1 in
        "frontend")
            echo "testdriven-client-production-service:testdriven-frontend:client"
            ;;
        "backend")
            echo "testdriven-users-production-service:testdriven-backend:services/users"
            ;;
        "minimal")
            echo "testdriven-users-production-service:testdriven-backend:."
            ;;
        *)
            echo ""
            ;;
    esac
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Manual Deployment Script${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_step() {
    echo -e "${YELLOW}🔄 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if AWS CLI is installed and configured
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

login_to_ecr() {
    print_step "Logging into ECR..."
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
    print_success "ECR login successful"
}

build_and_push_service() {
    local service_name=$1
    local service_config=$(get_service_config $service_name)

    if [ -z "$service_config" ]; then
        print_error "Unknown service: $service_name"
        return 1
    fi
    
    IFS=':' read -r ecs_service ecr_repo build_path <<< "$service_config"
    
    print_step "Building $service_name service..."
    
    # Generate timestamp tag
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local image_tag="manual-${timestamp}"
    local full_image_name="${ECR_REGISTRY}/${ecr_repo}:${image_tag}"
    
    # Build the Docker image
    cd $build_path
    if [ "$service_name" = "minimal" ]; then
        docker build -f Dockerfile.minimal -t $ecr_repo:$image_tag .
    else
        docker build -t $ecr_repo:$image_tag .
    fi
    docker tag $ecr_repo:$image_tag $full_image_name
    cd - > /dev/null
    
    print_success "Built $service_name image: $image_tag"
    
    # Push to ECR
    print_step "Pushing $service_name to ECR..."
    docker push $full_image_name
    print_success "Pushed $service_name to ECR"
    
    # Update ECS service
    update_ecs_service $ecs_service $ecr_repo $image_tag $full_image_name
}

update_ecs_service() {
    local ecs_service=$1
    local ecr_repo=$2
    local image_tag=$3
    local full_image_name=$4
    
    print_step "Updating ECS service: $ecs_service"
    
    # Get current task definition
    local task_def_family=$(echo $ecs_service | sed 's/-service/-td/')
    local current_task_def=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $ecs_service --query 'services[0].taskDefinition' --output text)
    
    # Download current task definition
    aws ecs describe-task-definition --task-definition $current_task_def --query 'taskDefinition' > /tmp/current-task-def.json
    
    # Create new task definition with updated image
    cat /tmp/current-task-def.json | \
        jq --arg image "$full_image_name" '.containerDefinitions[0].image = $image' | \
        jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)' \
        > /tmp/new-task-def.json
    
    # Register new task definition
    local new_task_def_arn=$(aws ecs register-task-definition --cli-input-json file:///tmp/new-task-def.json --query 'taskDefinition.taskDefinitionArn' --output text)
    print_success "Registered new task definition: $new_task_def_arn"
    
    # Update service
    aws ecs update-service --cluster $CLUSTER_NAME --service $ecs_service --task-definition $new_task_def_arn > /dev/null
    print_success "Updated ECS service: $ecs_service"
    
    # Wait for deployment to complete
    wait_for_deployment $ecs_service
}

wait_for_deployment() {
    local service_name=$1
    print_step "Waiting for deployment to complete..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        local status=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $service_name --query 'services[0].deployments[0].rolloutState' --output text)
        
        if [ "$status" = "COMPLETED" ]; then
            print_success "Deployment completed successfully"
            return 0
        elif [ "$status" = "FAILED" ]; then
            print_error "Deployment failed"
            return 1
        fi
        
        echo -n "."
        sleep 10
        ((attempt++))
    done
    
    print_error "Deployment timeout"
    return 1
}

verify_deployment() {
    local service_name=$1
    print_step "Verifying deployment..."
    
    # Get service status
    local running_count=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $service_name --query 'services[0].runningCount' --output text)
    local desired_count=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $service_name --query 'services[0].desiredCount' --output text)
    
    if [ "$running_count" = "$desired_count" ] && [ "$running_count" != "0" ]; then
        print_success "Service is healthy: $running_count/$desired_count tasks running"
        return 0
    else
        print_error "Service is unhealthy: $running_count/$desired_count tasks running"
        return 1
    fi
}

show_usage() {
    echo "Usage: $0 [OPTIONS] SERVICE"
    echo ""
    echo "Services:"
    echo "  frontend    Deploy React frontend"
    echo "  backend     Deploy Flask backend (microservices)"
    echo "  minimal     Deploy minimal enhanced backend (admin@savingsgroup.com)"
    echo "  all         Deploy both frontend and backend services"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  -v, --verify   Only verify current deployment status"
    echo ""
    echo "Examples:"
    echo "  $0 frontend              # Deploy only frontend"
    echo "  $0 backend               # Deploy only backend"
    echo "  $0 all                   # Deploy both services"
    echo "  $0 --verify frontend     # Check frontend status"
}

main() {
    local verify_only=false
    local service=""
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -v|--verify)
                verify_only=true
                shift
                ;;
            frontend|backend|minimal|all)
                service=$1
                shift
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    if [ -z "$service" ]; then
        print_error "Service not specified"
        show_usage
        exit 1
    fi
    
    print_header
    
    if [ "$verify_only" = true ]; then
        if [ "$service" = "all" ]; then
            verify_deployment "testdriven-client-production-service"
            verify_deployment "testdriven-users-production-service"
        else
            local service_config=$(get_service_config $service)
            local ecs_service=$(echo $service_config | cut -d':' -f1)
            verify_deployment $ecs_service
        fi
        exit 0
    fi
    
    check_prerequisites
    login_to_ecr
    
    if [ "$service" = "all" ]; then
        build_and_push_service "frontend"
        build_and_push_service "backend"
    else
        build_and_push_service $service
    fi
    
    print_success "Manual deployment completed successfully!"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Verify your application is working: http://34.235.113.253:5000"
    echo "2. Check service status: $0 --verify $service"
    echo "3. Monitor logs in AWS CloudWatch"
}

# Run main function with all arguments
main "$@"
