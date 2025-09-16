#!/bin/bash

# 🗃️ Automated RDS PostgreSQL Setup for Production
# This script creates and configures RDS PostgreSQL database for TestDriven app

set -e

# Configuration
ENVIRONMENT="production"
STACK_NAME="testdriven-${ENVIRONMENT}-rds"
REGION="us-east-1"
DB_PASSWORD_SECRET_NAME="testdriven-${ENVIRONMENT}-db-password"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🗃️ Setting up RDS PostgreSQL for TestDriven Production${NC}"
echo "=================================================="

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
        echo -e "${RED}❌ No default VPC found. Creating VPC...${NC}"
        # You might want to create a VPC here or use an existing one
        exit 1
    fi
    
    echo -e "${GREEN}✅ Using VPC: $VPC_ID${NC}"
    
    # Get subnets in different AZs
    SUBNET_IDS=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
        --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')
    
    if [ -z "$SUBNET_IDS" ]; then
        echo -e "${RED}❌ No suitable subnets found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Using subnets: $SUBNET_IDS${NC}"
}

# Function to generate secure database password
generate_db_password() {
    echo -e "${YELLOW}🔐 Generating secure database password...${NC}"

    # Use a fixed secure password for now (you can change this later)
    # In production, you'd want to use AWS Secrets Manager, but we'll use a simple approach
    DB_PASSWORD="TestDriven2024!SecureDB"

    echo -e "${GREEN}✅ Database password set${NC}"
    echo -e "${YELLOW}⚠️ Note: Using fixed password. In production, consider using AWS Secrets Manager${NC}"
}

# Function to get ALB security group (or create a placeholder)
get_alb_security_group() {
    echo -e "${YELLOW}🔍 Getting ALB security group...${NC}"
    
    # Try to find existing ALB security group
    ALB_SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=testdriven-${ENVIRONMENT}-alb-sg" \
        --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    
    if [ "$ALB_SG_ID" = "None" ] || [ -z "$ALB_SG_ID" ]; then
        echo -e "${YELLOW}⚠️ ALB security group not found, creating placeholder...${NC}"
        
        # Create a placeholder security group for ALB
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
            --cidr 0.0.0.0/0
        
        aws ec2 authorize-security-group-ingress \
            --group-id "$ALB_SG_ID" \
            --protocol tcp \
            --port 443 \
            --cidr 0.0.0.0/0
        
        echo -e "${GREEN}✅ Created ALB security group: $ALB_SG_ID${NC}"
    else
        echo -e "${GREEN}✅ Using existing ALB security group: $ALB_SG_ID${NC}"
    fi
}

# Function to deploy RDS stack
deploy_rds_stack() {
    echo -e "${YELLOW}🚀 Deploying RDS CloudFormation stack...${NC}"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
        echo -e "${YELLOW}📝 Stack exists, updating...${NC}"
        OPERATION="update-stack"
    else
        echo -e "${YELLOW}📝 Creating new stack...${NC}"
        OPERATION="create-stack"
    fi
    
    # Deploy the stack
    aws cloudformation $OPERATION \
        --stack-name "$STACK_NAME" \
        --template-body file://infrastructure/rds-production.yml \
        --parameters \
            ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
            ParameterKey=VpcId,ParameterValue="$VPC_ID" \
            ParameterKey=SubnetIds,ParameterValue="\"$SUBNET_IDS\"" \
            ParameterKey=ALBSecurityGroupId,ParameterValue="$ALB_SG_ID" \
            ParameterKey=DBMasterUsername,ParameterValue="webapp" \
            ParameterKey=DBMasterPassword,ParameterValue="$DB_PASSWORD" \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --tags \
            Key=Environment,Value="$ENVIRONMENT" \
            Key=Application,Value="testdriven" \
            Key=ManagedBy,Value="CloudFormation"
    
    echo -e "${YELLOW}⏳ Waiting for stack deployment to complete...${NC}"
    aws cloudformation wait stack-${OPERATION%-stack}-complete --stack-name "$STACK_NAME"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ RDS stack deployed successfully!${NC}"
    else
        echo -e "${RED}❌ RDS stack deployment failed${NC}"
        exit 1
    fi
}

# Function to get database connection information
get_database_info() {
    echo -e "${YELLOW}📋 Getting database connection information...${NC}"
    
    # Get stack outputs
    DB_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' \
        --output text)
    
    DB_PORT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`DBPort`].OutputValue' \
        --output text)
    
    DB_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query 'Stacks[0].Outputs[?OutputKey==`DBName`].OutputValue' \
        --output text)
    
    # Construct the full connection string
    DB_CONNECTION_STRING="postgresql://webapp:${DB_PASSWORD}@${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}"
    
    echo -e "${GREEN}✅ Database Information:${NC}"
    echo "   📍 Endpoint: $DB_ENDPOINT"
    echo "   🔌 Port: $DB_PORT"
    echo "   🗃️ Database: $DB_NAME"
    echo "   👤 Username: webapp"
    echo "   🔗 Connection String: postgresql://webapp:***@${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}"
    
    # Store connection string in a file for the deployment script
    echo "$DB_CONNECTION_STRING" > /tmp/rds_connection_string.txt
    echo -e "${GREEN}✅ Connection string saved to /tmp/rds_connection_string.txt${NC}"
}

# Function to update GitHub Actions secrets
update_github_secrets() {
    echo -e "${YELLOW}🔐 Instructions for updating GitHub Actions secrets:${NC}"
    echo ""
    echo "Add the following secret to your GitHub repository:"
    echo "Secret Name: AWS_RDS_URI"
    echo "Secret Value: $DB_CONNECTION_STRING"
    echo ""
    echo "To add this secret:"
    echo "1. Go to your GitHub repository"
    echo "2. Click Settings → Secrets and variables → Actions"
    echo "3. Click 'New repository secret'"
    echo "4. Name: AWS_RDS_URI"
    echo "5. Value: $DB_CONNECTION_STRING"
    echo "6. Click 'Add secret'"
    echo ""
    echo -e "${BLUE}🔗 GitHub Repository: https://github.com/owenabrams/testdriven-app/settings/secrets/actions${NC}"
}

# Main execution
main() {
    check_aws_cli
    get_vpc_info
    generate_db_password
    get_alb_security_group
    deploy_rds_stack
    get_database_info
    update_github_secrets
    
    echo ""
    echo -e "${GREEN}🎉 RDS PostgreSQL setup complete!${NC}"
    echo "=================================================="
    echo -e "${BLUE}📝 Next steps:${NC}"
    echo "1. Add the AWS_RDS_URI secret to GitHub Actions (instructions above)"
    echo "2. Run a new deployment to connect your app to the database"
    echo "3. Your app will now use PostgreSQL for real-time data!"
}

# Run the main function
main "$@"
