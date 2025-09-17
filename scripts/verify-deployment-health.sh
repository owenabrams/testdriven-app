#!/bin/bash

# Professional Deployment Health Verification Script
# Comprehensive health checks for Aurora PostgreSQL and ECS deployment

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

ENVIRONMENT="${1:-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# AWS Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AURORA_CLUSTER_ID="testdriven-production-aurora"

# Environment-specific configuration
if [[ "$ENVIRONMENT" == "production" ]]; then
    CLUSTER_NAME="testdriven-production"
    SERVICE_NAME="testdriven-users-production"
    API_BASE_URL="https://api.yourdomain.com"
    DB_NAME="users_production"
elif [[ "$ENVIRONMENT" == "staging" ]]; then
    CLUSTER_NAME="testdriven-staging"
    SERVICE_NAME="testdriven-users-staging"
    API_BASE_URL="https://staging-api.yourdomain.com"
    DB_NAME="users_staging"
else
    echo "❌ Invalid environment: $ENVIRONMENT (must be 'staging' or 'production')"
    exit 1
fi

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

print_header() {
    echo ""
    echo "=============================================="
    echo "🔍 $1"
    echo "=============================================="
}

# ============================================================================
# HEALTH CHECK FUNCTIONS
# ============================================================================

check_aurora_cluster_health() {
    print_header "Aurora Cluster Health Check"
    
    print_status "Checking Aurora cluster status..."
    
    local cluster_info=$(aws rds describe-db-clusters \
        --db-cluster-identifier "$AURORA_CLUSTER_ID" \
        --region "$AWS_REGION" \
        --query 'DBClusters[0].{Status:Status,Engine:Engine,EngineVersion:EngineVersion,DatabaseName:DatabaseName,Endpoint:Endpoint}' \
        --output json 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to retrieve Aurora cluster information"
        return 1
    fi
    
    local status=$(echo "$cluster_info" | jq -r '.Status')
    local engine=$(echo "$cluster_info" | jq -r '.Engine')
    local version=$(echo "$cluster_info" | jq -r '.EngineVersion')
    local endpoint=$(echo "$cluster_info" | jq -r '.Endpoint')
    
    if [[ "$status" == "available" ]]; then
        print_success "Aurora cluster is available"
        print_status "Engine: $engine $version"
        print_status "Endpoint: $endpoint"
    else
        print_error "Aurora cluster is not available (status: $status)"
        return 1
    fi
    
    # Check cluster instances
    print_status "Checking Aurora cluster instances..."
    
    local instances=$(aws rds describe-db-cluster-members \
        --db-cluster-identifier "$AURORA_CLUSTER_ID" \
        --region "$AWS_REGION" \
        --query 'DBClusterMembers[*].{DBInstanceIdentifier:DBInstanceIdentifier,IsClusterWriter:IsClusterWriter}' \
        --output json 2>/dev/null)
    
    local instance_count=$(echo "$instances" | jq length)
    print_status "Found $instance_count Aurora instances"
    
    return 0
}

check_ecs_service_health() {
    print_header "ECS Service Health Check"
    
    print_status "Checking ECS service status..."
    
    local service_info=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount,PendingCount:pendingCount}' \
        --output json 2>/dev/null)
    
    if [[ $? -ne 0 ]]; then
        print_error "Failed to retrieve ECS service information"
        return 1
    fi
    
    local status=$(echo "$service_info" | jq -r '.Status')
    local running=$(echo "$service_info" | jq -r '.RunningCount')
    local desired=$(echo "$service_info" | jq -r '.DesiredCount')
    local pending=$(echo "$service_info" | jq -r '.PendingCount')
    
    print_status "Service status: $status"
    print_status "Running tasks: $running/$desired"
    print_status "Pending tasks: $pending"
    
    if [[ "$status" == "ACTIVE" ]] && [[ "$running" == "$desired" ]] && [[ "$pending" == "0" ]]; then
        print_success "ECS service is healthy"
    else
        print_error "ECS service is not healthy"
        return 1
    fi
    
    # Check task health
    print_status "Checking individual task health..."
    
    local tasks=$(aws ecs list-tasks \
        --cluster "$CLUSTER_NAME" \
        --service-name "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'taskArns' \
        --output json 2>/dev/null)
    
    local task_count=$(echo "$tasks" | jq length)
    
    if [[ $task_count -gt 0 ]]; then
        local task_details=$(aws ecs describe-tasks \
            --cluster "$CLUSTER_NAME" \
            --tasks $(echo "$tasks" | jq -r '.[]' | tr '\n' ' ') \
            --region "$AWS_REGION" \
            --query 'tasks[*].{TaskArn:taskArn,LastStatus:lastStatus,HealthStatus:healthStatus}' \
            --output json 2>/dev/null)
        
        local healthy_tasks=0
        local total_tasks=$(echo "$task_details" | jq length)
        
        for i in $(seq 0 $((total_tasks - 1))); do
            local task_status=$(echo "$task_details" | jq -r ".[$i].LastStatus")
            local health_status=$(echo "$task_details" | jq -r ".[$i].HealthStatus")
            
            if [[ "$task_status" == "RUNNING" ]] && [[ "$health_status" == "HEALTHY" ]]; then
                ((healthy_tasks++))
            fi
        done
        
        print_status "Healthy tasks: $healthy_tasks/$total_tasks"
        
        if [[ $healthy_tasks -eq $total_tasks ]]; then
            print_success "All ECS tasks are healthy"
        else
            print_warning "Some ECS tasks are not healthy"
        fi
    fi
    
    return 0
}

check_application_endpoints() {
    print_header "Application Endpoint Health Check"
    
    local endpoints=(
        "/ping"
        "/users/ping"
    )
    
    for endpoint in "${endpoints[@]}"; do
        print_status "Testing endpoint: $endpoint"
        
        local url="${API_BASE_URL}${endpoint}"
        local response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 || echo "000")
        
        if [[ "$response_code" == "200" ]]; then
            print_success "Endpoint $endpoint is healthy (HTTP $response_code)"
        else
            print_error "Endpoint $endpoint is unhealthy (HTTP $response_code)"
            return 1
        fi
    done
    
    return 0
}

check_database_connectivity() {
    print_header "Database Connectivity Check"
    
    print_status "Testing database connectivity from application..."
    
    # Test database connectivity through application endpoint
    local db_health_url="${API_BASE_URL}/users/ping"
    local response=$(curl -s "$db_health_url" --max-time 15 || echo "ERROR")
    
    if [[ "$response" == *"pong"* ]]; then
        print_success "Database connectivity through application is working"
    else
        print_error "Database connectivity through application failed"
        print_status "Response: $response"
        return 1
    fi
    
    return 0
}

check_performance_metrics() {
    print_header "Performance Metrics Check"
    
    print_status "Checking Aurora performance metrics..."
    
    # Get Aurora CPU utilization (last 5 minutes)
    local cpu_utilization=$(aws cloudwatch get-metric-statistics \
        --namespace "AWS/RDS" \
        --metric-name "CPUUtilization" \
        --dimensions Name=DBClusterIdentifier,Value="$AURORA_CLUSTER_ID" \
        --start-time "$(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S)" \
        --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
        --period 300 \
        --statistics Average \
        --region "$AWS_REGION" \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "N/A")
    
    if [[ "$cpu_utilization" != "N/A" ]] && [[ "$cpu_utilization" != "None" ]]; then
        local cpu_int=$(printf "%.0f" "$cpu_utilization")
        print_status "Aurora CPU utilization: ${cpu_int}%"
        
        if [[ $cpu_int -lt 80 ]]; then
            print_success "Aurora CPU utilization is healthy"
        else
            print_warning "Aurora CPU utilization is high: ${cpu_int}%"
        fi
    else
        print_status "Aurora CPU metrics not available yet"
    fi
    
    # Check ECS service metrics
    print_status "Checking ECS service metrics..."
    
    local service_events=$(aws ecs describe-services \
        --cluster "$CLUSTER_NAME" \
        --services "$SERVICE_NAME" \
        --region "$AWS_REGION" \
        --query 'services[0].events[0:3]' \
        --output json 2>/dev/null)
    
    if [[ "$service_events" != "null" ]]; then
        print_status "Recent ECS service events:"
        echo "$service_events" | jq -r '.[] | "  - \(.createdAt): \(.message)"' | head -3
    fi
    
    return 0
}

run_comprehensive_health_check() {
    print_header "Comprehensive Health Check for $ENVIRONMENT Environment"
    
    local checks=(
        "check_aurora_cluster_health"
        "check_ecs_service_health"
        "check_application_endpoints"
        "check_database_connectivity"
        "check_performance_metrics"
    )
    
    local passed=0
    local total=${#checks[@]}
    
    for check in "${checks[@]}"; do
        if $check; then
            ((passed++))
        fi
        echo ""
    done
    
    print_header "Health Check Summary"
    
    if [[ $passed -eq $total ]]; then
        print_success "All health checks passed ($passed/$total)"
        print_success "$ENVIRONMENT environment is healthy and ready!"
        return 0
    else
        print_error "Some health checks failed ($passed/$total passed)"
        print_error "$ENVIRONMENT environment has issues that need attention"
        return 1
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    echo "🔍 Starting deployment health verification for $ENVIRONMENT environment..."
    
    # Check required tools
    for tool in aws jq curl; do
        if ! command -v "$tool" &> /dev/null; then
            print_error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Run comprehensive health check
    if run_comprehensive_health_check; then
        echo ""
        echo "🎉 Deployment health verification completed successfully!"
        exit 0
    else
        echo ""
        echo "❌ Deployment health verification failed!"
        exit 1
    fi
}

# Run main function
main "$@"
