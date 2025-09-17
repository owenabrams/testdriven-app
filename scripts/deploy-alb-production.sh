#!/bin/bash

# Deploy Application Load Balancer for Production
# This script sets up the ALB with proper target groups for Fargate services

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Configuration
ENVIRONMENT="production"
STACK_NAME="testdriven-${ENVIRONMENT}-alb"
TEMPLATE_FILE="infrastructure/alb-production.yml"
REGION="us-east-1"

echo "🚀 Deploying Application Load Balancer for Production"
echo "===================================================="

# Get VPC and subnet information
print_status "Getting VPC and subnet information..."

VPC_ID=$(aws ec2 describe-vpcs \
    --query 'Vpcs[?IsDefault==`true`].VpcId' \
    --output text \
    --region $REGION)

if [[ -z "$VPC_ID" ]]; then
    print_error "Could not find default VPC"
    exit 1
fi

print_success "Found VPC: $VPC_ID"

# Get public subnets (at least 2 for ALB)
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[0:3].SubnetId' \
    --output text \
    --region $REGION | tr '\t' ',')

if [[ -z "$SUBNET_IDS" ]]; then
    print_error "Could not find subnets in VPC $VPC_ID"
    exit 1
fi

print_success "Found subnets: $SUBNET_IDS"

# Deploy the CloudFormation stack
print_status "Deploying ALB CloudFormation stack..."

aws cloudformation deploy \
    --template-file "$TEMPLATE_FILE" \
    --stack-name "$STACK_NAME" \
    --parameter-overrides \
        Environment="$ENVIRONMENT" \
        VpcId="$VPC_ID" \
        SubnetIds="$SUBNET_IDS" \
    --capabilities CAPABILITY_IAM \
    --region "$REGION" \
    --no-fail-on-empty-changeset

if [[ $? -eq 0 ]]; then
    print_success "ALB stack deployed successfully"
else
    print_error "Failed to deploy ALB stack"
    exit 1
fi

# Get ALB DNS name
print_status "Getting ALB DNS name..."

ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region "$REGION")

if [[ -n "$ALB_DNS" ]]; then
    print_success "ALB deployed successfully!"
    echo ""
    echo "🌐 Application Load Balancer URLs:"
    echo "   Frontend: http://$ALB_DNS"
    echo "   Backend API: http://$ALB_DNS/users"
    echo "   Health Check: http://$ALB_DNS/ping"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Update ECS services to use ALB target groups"
    echo "   2. Configure DNS records (optional)"
    echo "   3. Set up SSL certificates (optional)"
else
    print_warning "ALB deployed but could not retrieve DNS name"
fi

echo ""
echo "🎉 ALB deployment completed!"
