#!/bin/bash

# Deployment Monitoring Script
# Monitors the health of your TestDriven application

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-production}
CONFIG_FILE="config/environments/${ENVIRONMENT}.env"

# Load environment configuration
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo -e "${RED}❌ Environment config not found: $CONFIG_FILE${NC}"
    exit 1
fi

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

# Check ECS service status
check_ecs_services() {
    log_info "Checking ECS service status..."
    
    # Frontend service
    FRONTEND_STATUS=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$FRONTEND_SERVICE" \
        --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,TaskDefinition:taskDefinition}')
    
    echo "Frontend Service:"
    echo "$FRONTEND_STATUS" | jq .
    
    # Backend service
    BACKEND_STATUS=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$BACKEND_SERVICE" \
        --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,TaskDefinition:taskDefinition}')
    
    echo "Backend Service:"
    echo "$BACKEND_STATUS" | jq .
}

# Check target group health
check_target_groups() {
    log_info "Checking target group health..."
    
    # Frontend target group
    echo "Frontend Target Group Health:"
    aws elbv2 describe-target-health \
        --target-group-arn "$FRONTEND_TARGET_GROUP_ARN" \
        --query 'TargetHealthDescriptions[].{IP:Target.Id,Port:Target.Port,State:TargetHealth.State,Reason:TargetHealth.Reason}' \
        --output table
    
    # Backend target group
    echo "Backend Target Group Health:"
    aws elbv2 describe-target-health \
        --target-group-arn "$BACKEND_TARGET_GROUP_ARN" \
        --query 'TargetHealthDescriptions[].{IP:Target.Id,Port:Target.Port,State:TargetHealth.State,Reason:TargetHealth.Reason}' \
        --output table
}

# Check application endpoints
check_endpoints() {
    log_info "Checking application endpoints..."
    
    # Backend health
    if curl -f -s "$REACT_APP_API_URL/ping" > /dev/null; then
        log_success "Backend /ping endpoint is healthy"
        PING_RESPONSE=$(curl -s "$REACT_APP_API_URL/ping" | jq .)
        echo "Response: $PING_RESPONSE"
    else
        log_error "Backend /ping endpoint is unhealthy"
    fi
    
    # Frontend health
    if curl -f -s "$ALB_URL/" > /dev/null; then
        log_success "Frontend endpoint is healthy"
    else
        log_error "Frontend endpoint is unhealthy"
    fi
    
    # Users endpoint
    if curl -f -s "$REACT_APP_API_URL/users" > /dev/null; then
        USER_COUNT=$(curl -s "$REACT_APP_API_URL/users" | jq '.data.users | length')
        log_success "Users endpoint is healthy ($USER_COUNT users)"
    else
        log_error "Users endpoint is unhealthy"
    fi
}

# Check recent deployments
check_recent_deployments() {
    log_info "Checking recent deployments..."
    
    # Frontend deployments
    echo "Recent Frontend Deployments:"
    aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$FRONTEND_SERVICE" \
        --query 'services[0].deployments[].{Status:status,TaskDefinition:taskDefinition,CreatedAt:createdAt,UpdatedAt:updatedAt}' \
        --output table
    
    # Backend deployments
    echo "Recent Backend Deployments:"
    aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$BACKEND_SERVICE" \
        --query 'services[0].deployments[].{Status:status,TaskDefinition:taskDefinition,CreatedAt:createdAt,UpdatedAt:updatedAt}' \
        --output table
}

# Check logs for errors
check_recent_logs() {
    log_info "Checking recent logs for errors..."
    
    # Get recent log streams
    FRONTEND_LOG_STREAM=$(aws logs describe-log-streams \
        --log-group-name testdriven-client-prod \
        --order-by LastEventTime \
        --descending \
        --max-items 1 \
        --query 'logStreams[0].logStreamName' \
        --output text)
    
    if [[ "$FRONTEND_LOG_STREAM" != "None" ]]; then
        echo "Recent Frontend Logs (last 10 entries):"
        aws logs get-log-events \
            --log-group-name testdriven-client-prod \
            --log-stream-name "$FRONTEND_LOG_STREAM" \
            --limit 10 \
            --query 'events[].message' \
            --output text | tail -10
    fi
    
    BACKEND_LOG_STREAM=$(aws logs describe-log-streams \
        --log-group-name testdriven-users-prod \
        --order-by LastEventTime \
        --descending \
        --max-items 1 \
        --query 'logStreams[0].logStreamName' \
        --output text 2>/dev/null || echo "None")
    
    if [[ "$BACKEND_LOG_STREAM" != "None" ]]; then
        echo "Recent Backend Logs (last 10 entries):"
        aws logs get-log-events \
            --log-group-name testdriven-users-prod \
            --log-stream-name "$BACKEND_LOG_STREAM" \
            --limit 10 \
            --query 'events[].message' \
            --output text | tail -10
    fi
}

# Generate health report
generate_health_report() {
    log_info "Generating health report..."
    
    REPORT_FILE="health-report-$(date +%Y%m%d-%H%M%S).json"
    
    # Collect all health data
    HEALTH_DATA=$(cat <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "services": {
    "frontend": $(aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$FRONTEND_SERVICE" --query 'services[0]'),
    "backend": $(aws ecs describe-services --cluster "$ECS_CLUSTER" --services "$BACKEND_SERVICE" --query 'services[0]')
  },
  "target_groups": {
    "frontend": $(aws elbv2 describe-target-health --target-group-arn "$FRONTEND_TARGET_GROUP_ARN"),
    "backend": $(aws elbv2 describe-target-health --target-group-arn "$BACKEND_TARGET_GROUP_ARN")
  }
}
EOF
)
    
    echo "$HEALTH_DATA" | jq . > "$REPORT_FILE"
    log_success "Health report saved to: $REPORT_FILE"
}

# Main monitoring function
main() {
    echo "🔍 Monitoring TestDriven App - $ENVIRONMENT Environment"
    echo "=================================================="
    echo ""
    
    check_ecs_services
    echo ""
    
    check_target_groups
    echo ""
    
    check_endpoints
    echo ""
    
    check_recent_deployments
    echo ""
    
    check_recent_logs
    echo ""
    
    generate_health_report
    
    echo ""
    log_success "Monitoring complete!"
}

# Help function
show_help() {
    echo "Deployment Monitoring Script"
    echo ""
    echo "Usage: $0 [ENVIRONMENT]"
    echo ""
    echo "ENVIRONMENT:"
    echo "  development  - Monitor development environment"
    echo "  staging      - Monitor staging environment"
    echo "  production   - Monitor production environment (default)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Monitor production"
    echo "  $0 development        # Monitor development"
}

# Parse arguments
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

# Run main function
main
