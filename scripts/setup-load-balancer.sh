#!/bin/bash

# 🌐 Application Load Balancer Setup for TestDriven Production
# This script creates an ALB to provide easy access to your services

set -e

# Configuration
ENVIRONMENT="production"
CLUSTER_NAME="testdriven-${ENVIRONMENT}-cluster"
REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌐 Setting up Application Load Balancer${NC}"
echo "========================================"

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo -e "${RED}❌ AWS CLI not configured or no valid credentials${NC}"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ Using AWS Account: $ACCOUNT_ID${NC}"
}

# Function to get VPC and subnet information
get_vpc_info() {
    echo -e "${YELLOW}🔍 Getting VPC and subnet information...${NC}"
    
    # Get default VPC
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
        echo -e "${RED}❌ No default VPC found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Using VPC: $VPC_ID${NC}"
    
    # Get public subnets
    SUBNET_IDS=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
        --query 'Subnets[].SubnetId' --output text | tr '\t' ' ')
    
    if [ -z "$SUBNET_IDS" ]; then
        echo -e "${RED}❌ No suitable subnets found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Using subnets: $SUBNET_IDS${NC}"
}

# Function to create ALB security group
create_alb_security_group() {
    echo -e "${YELLOW}🔒 Creating ALB security group...${NC}"
    
    # Check if security group already exists
    ALB_SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=testdriven-${ENVIRONMENT}-alb-sg" \
        --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    
    if [ "$ALB_SG_ID" != "None" ] && [ -n "$ALB_SG_ID" ]; then
        echo -e "${GREEN}✅ Using existing ALB security group: $ALB_SG_ID${NC}"
        return 0
    fi
    
    # Create security group
    ALB_SG_ID=$(aws ec2 create-security-group \
        --group-name "testdriven-${ENVIRONMENT}-alb-sg" \
        --description "Security group for TestDriven ${ENVIRONMENT} ALB" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' --output text)
    
    # Add HTTP and HTTPS ingress rules
    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG_ID" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 >/dev/null
    
    aws ec2 authorize-security-group-ingress \
        --group-id "$ALB_SG_ID" \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 >/dev/null
    
    echo -e "${GREEN}✅ Created ALB security group: $ALB_SG_ID${NC}"
}

# Function to create Application Load Balancer
create_load_balancer() {
    echo -e "${YELLOW}🌐 Creating Application Load Balancer...${NC}"
    
    # Check if ALB already exists
    ALB_ARN=$(aws elbv2 describe-load-balancers \
        --names "testdriven-${ENVIRONMENT}-alb" \
        --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "None")
    
    if [ "$ALB_ARN" != "None" ] && [ -n "$ALB_ARN" ]; then
        echo -e "${GREEN}✅ Using existing load balancer${NC}"
        ALB_DNS=$(aws elbv2 describe-load-balancers \
            --load-balancer-arns "$ALB_ARN" \
            --query 'LoadBalancers[0].DNSName' --output text)
        return 0
    fi
    
    # Create the load balancer
    ALB_ARN=$(aws elbv2 create-load-balancer \
        --name "testdriven-${ENVIRONMENT}-alb" \
        --subnets $SUBNET_IDS \
        --security-groups "$ALB_SG_ID" \
        --scheme internet-facing \
        --type application \
        --ip-address-type ipv4 \
        --tags Key=Environment,Value="$ENVIRONMENT" Key=Application,Value=testdriven \
        --query 'LoadBalancers[0].LoadBalancerArn' --output text)
    
    # Get DNS name
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns "$ALB_ARN" \
        --query 'LoadBalancers[0].DNSName' --output text)
    
    echo -e "${GREEN}✅ Created load balancer: $ALB_DNS${NC}"
}

# Function to create target groups
create_target_groups() {
    echo -e "${YELLOW}🎯 Creating target groups...${NC}"
    
    # Backend target group
    BACKEND_TG_ARN=$(aws elbv2 create-target-group \
        --name "testdriven-${ENVIRONMENT}-backend-tg" \
        --protocol HTTP \
        --port 5000 \
        --vpc-id "$VPC_ID" \
        --target-type ip \
        --health-check-path "/ping" \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --tags Key=Environment,Value="$ENVIRONMENT" Key=Service,Value=backend \
        --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || \
        aws elbv2 describe-target-groups \
            --names "testdriven-${ENVIRONMENT}-backend-tg" \
            --query 'TargetGroups[0].TargetGroupArn' --output text)
    
    # Frontend target group
    FRONTEND_TG_ARN=$(aws elbv2 create-target-group \
        --name "testdriven-${ENVIRONMENT}-frontend-tg" \
        --protocol HTTP \
        --port 80 \
        --vpc-id "$VPC_ID" \
        --target-type ip \
        --health-check-path "/" \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --tags Key=Environment,Value="$ENVIRONMENT" Key=Service,Value=frontend \
        --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || \
        aws elbv2 describe-target-groups \
            --names "testdriven-${ENVIRONMENT}-frontend-tg" \
            --query 'TargetGroups[0].TargetGroupArn' --output text)
    
    echo -e "${GREEN}✅ Created target groups${NC}"
}

# Function to create listeners
create_listeners() {
    echo -e "${YELLOW}👂 Creating ALB listeners...${NC}"
    
    # Create HTTP listener with rules
    aws elbv2 create-listener \
        --load-balancer-arn "$ALB_ARN" \
        --protocol HTTP \
        --port 80 \
        --default-actions Type=forward,TargetGroupArn="$FRONTEND_TG_ARN" >/dev/null 2>&1 || true
    
    # Get listener ARN
    LISTENER_ARN=$(aws elbv2 describe-listeners \
        --load-balancer-arn "$ALB_ARN" \
        --query 'Listeners[0].ListenerArn' --output text)
    
    # Create rule for API traffic
    aws elbv2 create-rule \
        --listener-arn "$LISTENER_ARN" \
        --priority 100 \
        --conditions Field=path-pattern,Values="/api/*" \
        --actions Type=forward,TargetGroupArn="$BACKEND_TG_ARN" >/dev/null 2>&1 || true
    
    echo -e "${GREEN}✅ Created listeners and rules${NC}"
}

# Function to register ECS services with target groups
register_ecs_services() {
    echo -e "${YELLOW}🔗 Registering ECS services with target groups...${NC}"
    
    # This would typically be done by updating the ECS service definitions
    # For now, we'll show the commands needed
    echo -e "${BLUE}📝 To complete the setup, update your ECS services:${NC}"
    echo ""
    echo "Backend service update:"
    echo "aws ecs update-service \\"
    echo "  --cluster $CLUSTER_NAME \\"
    echo "  --service testdriven-users-${ENVIRONMENT}-service \\"
    echo "  --load-balancers targetGroupArn=$BACKEND_TG_ARN,containerName=users,containerPort=5000"
    echo ""
    echo "Frontend service update:"
    echo "aws ecs update-service \\"
    echo "  --cluster $CLUSTER_NAME \\"
    echo "  --service testdriven-client-${ENVIRONMENT}-service \\"
    echo "  --load-balancers targetGroupArn=$FRONTEND_TG_ARN,containerName=client,containerPort=80"
}

# Function to show access information
show_access_info() {
    echo ""
    echo -e "${GREEN}🎉 Load Balancer Setup Complete!${NC}"
    echo "=================================="
    echo ""
    echo -e "${BLUE}🌐 Your Application URLs:${NC}"
    echo "   Frontend: http://$ALB_DNS"
    echo "   Backend API: http://$ALB_DNS/api/"
    echo ""
    echo -e "${BLUE}🔍 Health Check URLs:${NC}"
    echo "   Backend Health: http://$ALB_DNS/api/ping"
    echo "   Frontend Health: http://$ALB_DNS/"
    echo ""
    echo -e "${YELLOW}⚠️ Note: Services need to be registered with target groups${NC}"
    echo "Run the ECS service update commands shown above to complete the setup."
}

# Main execution
main() {
    check_aws_cli
    get_vpc_info
    create_alb_security_group
    create_load_balancer
    create_target_groups
    create_listeners
    register_ecs_services
    show_access_info
}

# Run the main function
main "$@"
