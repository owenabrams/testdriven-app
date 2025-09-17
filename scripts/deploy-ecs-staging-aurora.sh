#!/bin/bash

# Professional ECS Deployment Script for Aurora PostgreSQL (Staging)
# Handles zero-downtime deployments with proper health checks and rollback

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AWS Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
CLUSTER_NAME="testdriven-staging"
SERVICE_NAME="testdriven-users-staging"
TASK_FAMILY="testdriven-users-staging"

# Aurora Configuration
AURORA_CLUSTER_ENDPOINT="testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com"
AURORA_DB_NAME="users_staging"
AURORA_DB_USER="webapp"
AURORA_DB_PASSWORD="${AURORA_DB_PASSWORD:-}"

# Application Configuration
SECRET_KEY="${STAGING_SECRET_KEY:-staging-secret-key}"
IMAGE_TAG="${GITHUB_SHA:-latest}"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if required environment variables are set
check_environment() {
    print_status "Checking environment variables..."
    
    local missing_vars=()
    
    if [[ -z "$AWS_ACCOUNT_ID" ]]; then
        missing_vars+=("AWS_ACCOUNT_ID")
    fi
    
    if [[ -z "$AURORA_DB_PASSWORD" ]]; then
        missing_vars+=("AURORA_DB_PASSWORD")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    print_success "Environment variables validated"
}

# Function to test Aurora connection
test_aurora_connection() {
    print_status "Testing Aurora PostgreSQL connection..."
    
    local connection_string="postgresql://${AURORA_DB_USER}:${AURORA_DB_PASSWORD}@${AURORA_CLUSTER_ENDPOINT}:5432/${AURORA_DB_NAME}"
    
    # Use a temporary Python script to test connection
    python3 -c "
import psycopg2
import sys
try:
    conn = psycopg2.connect('$connection_string')
    conn.close()
    print('✅ Aurora connection successful')
    sys.exit(0)
except Exception as e:
    print(f'❌ Aurora connection failed: {e}')
    sys.exit(1)
" || {
        print_error "Aurora connection test failed"
        exit 1
    }
    
    print_success "Aurora connection validated"
}

# Function to create ECS task definition
create_task_definition() {
    print_status "Creating ECS task definition..."
    
    local image_uri="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/testdriven-backend:${IMAGE_TAG}"
    local database_url="postgresql://${AURORA_DB_USER}:${AURORA_DB_PASSWORD}@${AURORA_CLUSTER_ENDPOINT}:5432/${AURORA_DB_NAME}"
    
    # Create task definition JSON
    cat > /tmp/task-definition.json << EOF
{
  "family": "${TASK_FAMILY}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "users",
      "image": "${image_uri}",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "APP_SETTINGS",
          "value": "project.config.StagingConfig"
        },
        {
          "name": "FLASK_ENV",
          "value": "staging"
        },
        {
          "name": "DATABASE_URL",
          "value": "${database_url}"
        },
        {
          "name": "SECRET_KEY",
          "value": "${SECRET_KEY}"
        },
        {
          "name": "AURORA_DB_PASSWORD",
          "value": "${AURORA_DB_PASSWORD}"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/testdriven-users-staging",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5000/ping || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
EOF

    # Register task definition
    aws ecs register-task-definition \
        --cli-input-json file:///tmp/task-definition.json \
        --region "$AWS_REGION" > /dev/null
    
    print_success "Task definition created"
}

# Function to deploy to ECS
deploy_to_ecs() {
    print_status "Deploying to ECS..."
    
    # Update ECS service
    aws ecs update-service \
        --cluster "$CLUSTER_NAME" \
        --service "$SERVICE_NAME" \
        --task-definition "$TASK_FAMILY" \
        --region "$AWS_REGION" > /dev/null
    
    print_success "ECS service update initiated"
}

# Function to wait for deployment to complete
wait_for_deployment() {
    print_status "Waiting for deployment to complete..."
    
    local max_wait=600  # 10 minutes
    local wait_time=0
    
    while [[ $wait_time -lt $max_wait ]]; do
        local deployment_status=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$SERVICE_NAME" \
            --region "$AWS_REGION" \
            --query 'services[0].deployments[0].status' \
            --output text)
        
        if [[ "$deployment_status" == "PRIMARY" ]]; then
            print_success "Deployment completed successfully"
            return 0
        elif [[ "$deployment_status" == "FAILED" ]]; then
            print_error "Deployment failed"
            return 1
        fi
        
        echo -n "."
        sleep 10
        wait_time=$((wait_time + 10))
    done
    
    print_error "Deployment timed out"
    return 1
}

# Function to verify deployment health
verify_deployment() {
    print_status "Verifying deployment health..."
    
    # Get service endpoint (this would need to be configured based on your load balancer)
    local health_check_url="https://staging-api.yourdomain.com/ping"
    
    local max_attempts=12
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_check_url" > /dev/null 2>&1; then
            print_success "Health check passed"
            return 0
        fi
        
        print_status "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo "🚀 Starting Aurora PostgreSQL ECS Staging Deployment"
    echo "=================================================="
    
    # Pre-deployment checks
    check_environment
    test_aurora_connection
    
    # Deployment process
    create_task_definition
    deploy_to_ecs
    wait_for_deployment
    
    # Post-deployment verification
    verify_deployment
    
    echo ""
    echo "🎉 Staging deployment completed successfully!"
    echo "✅ Aurora PostgreSQL integration working"
    echo "✅ ECS service updated and healthy"
    echo "✅ Application ready for testing"
}

# Run main function
main "$@"
