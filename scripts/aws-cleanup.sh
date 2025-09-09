#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_NAME="savings-groups-demo"
STACK_NAME="$PROJECT_NAME"
REGION="us-east-1"

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo -e "${BLUE}🧹 AWS Cleanup Script for Savings Groups Platform${NC}"
echo -e "${BLUE}===============================================${NC}"

print_warning "This will delete ALL AWS resources created for the demo."
echo -n "Are you sure you want to continue? (y/N): "
read -r CONFIRM

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

print_info "Starting cleanup process..."

# Get S3 bucket name before deleting stack
S3_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`StaticAssetsBucketUrl`].OutputValue' \
    --output text 2>/dev/null | sed 's|http://||' | sed 's|\.s3-website.*||' || echo "")

# Empty S3 bucket if it exists
if [ ! -z "$S3_BUCKET" ]; then
    print_info "Emptying S3 bucket: $S3_BUCKET"
    aws s3 rm s3://"$S3_BUCKET"/ --recursive --region "$REGION" 2>/dev/null || true
    print_status "S3 bucket emptied"
fi

# Delete CloudFormation stack
print_info "Deleting CloudFormation stack: $STACK_NAME"
aws cloudformation delete-stack \
    --stack-name "$STACK_NAME" \
    --region "$REGION"

print_info "Waiting for stack deletion to complete..."
aws cloudformation wait stack-delete-complete \
    --stack-name "$STACK_NAME" \
    --region "$REGION"

print_status "All AWS resources have been deleted!"
print_info "Your AWS account is now clean of demo resources."

echo
echo -e "${BLUE}💰 Cost Impact:${NC}"
echo -e "   - All billable resources have been removed"
echo -e "   - No ongoing charges for this demo"
echo
echo -e "${GREEN}🎉 Cleanup completed successfully!${NC}"