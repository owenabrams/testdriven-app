#!/bin/bash

# 🆓 AWS RDS PostgreSQL Free Tier Setup
# Creates a FREE PostgreSQL database on AWS for testing/production

set -e

# Configuration
ENVIRONMENT="production"
DB_INSTANCE_ID="testdriven-${ENVIRONMENT}-postgres"
REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🆓 AWS RDS PostgreSQL Free Tier Setup${NC}"
echo "======================================"

# Function to check AWS CLI
check_aws_cli() {
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo -e "${RED}❌ AWS CLI not configured${NC}"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ Using AWS Account: $ACCOUNT_ID${NC}"
}

# Function to get VPC info
get_vpc_info() {
    echo -e "${YELLOW}🔍 Getting VPC information...${NC}"
    
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
        echo -e "${RED}❌ No default VPC found${NC}"
        exit 1
    fi
    
    # Get subnets in different AZs
    SUBNET_IDS=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
        --query 'Subnets[0:2].SubnetId' --output text | tr '\t' ',')
    
    echo -e "${GREEN}✅ VPC: $VPC_ID${NC}"
    echo -e "${GREEN}✅ Subnets: $SUBNET_IDS${NC}"
}

# Function to create security group
create_security_group() {
    echo -e "${YELLOW}🔒 Creating RDS security group...${NC}"
    
    # Check if security group exists
    SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=testdriven-${ENVIRONMENT}-rds-sg" \
        --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    
    if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
        echo -e "${GREEN}✅ Using existing security group: $SG_ID${NC}"
        return 0
    fi
    
    # Create security group
    SG_ID=$(aws ec2 create-security-group \
        --group-name "testdriven-${ENVIRONMENT}-rds-sg" \
        --description "Security group for TestDriven RDS PostgreSQL" \
        --vpc-id "$VPC_ID" \
        --query 'GroupId' --output text)
    
    # Allow PostgreSQL access from ECS security group
    ECS_SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=testdriven-${ENVIRONMENT}-ecs-sg" \
        --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    
    if [ "$ECS_SG_ID" != "None" ]; then
        aws ec2 authorize-security-group-ingress \
            --group-id "$SG_ID" \
            --protocol tcp \
            --port 5432 \
            --source-group "$ECS_SG_ID" >/dev/null
        echo -e "${GREEN}✅ Allowed access from ECS security group${NC}"
    else
        # Allow from VPC CIDR as fallback
        VPC_CIDR=$(aws ec2 describe-vpcs --vpc-ids "$VPC_ID" --query 'Vpcs[0].CidrBlock' --output text)
        aws ec2 authorize-security-group-ingress \
            --group-id "$SG_ID" \
            --protocol tcp \
            --port 5432 \
            --cidr "$VPC_CIDR" >/dev/null
        echo -e "${GREEN}✅ Allowed access from VPC CIDR${NC}"
    fi
    
    echo -e "${GREEN}✅ Created security group: $SG_ID${NC}"
}

# Function to create DB subnet group
create_subnet_group() {
    echo -e "${YELLOW}🌐 Creating DB subnet group...${NC}"
    
    SUBNET_GROUP_NAME="testdriven-${ENVIRONMENT}-db-subnet-group"
    
    # Check if subnet group exists
    if aws rds describe-db-subnet-groups --db-subnet-group-name "$SUBNET_GROUP_NAME" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Using existing subnet group${NC}"
        return 0
    fi
    
    # Create subnet group
    aws rds create-db-subnet-group \
        --db-subnet-group-name "$SUBNET_GROUP_NAME" \
        --db-subnet-group-description "Subnet group for TestDriven PostgreSQL" \
        --subnet-ids $(echo $SUBNET_IDS | tr ',' ' ') \
        --tags Key=Environment,Value="$ENVIRONMENT" Key=Application,Value=testdriven >/dev/null
    
    echo -e "${GREEN}✅ Created DB subnet group${NC}"
}

# Function to create RDS instance
create_rds_instance() {
    echo -e "${YELLOW}🗃️ Creating RDS PostgreSQL instance...${NC}"
    
    # Check if instance exists
    if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ RDS instance already exists${NC}"
        get_connection_info
        return 0
    fi
    
    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    echo -e "${BLUE}Creating FREE tier RDS PostgreSQL instance...${NC}"
    echo "This may take 5-10 minutes..."
    
    # Create RDS instance (FREE TIER)
    aws rds create-db-instance \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --db-instance-class db.t3.micro \
        --engine postgres \
        --engine-version 15.4 \
        --master-username webapp \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --storage-type gp2 \
        --db-name users_production \
        --vpc-security-group-ids "$SG_ID" \
        --db-subnet-group-name "testdriven-${ENVIRONMENT}-db-subnet-group" \
        --backup-retention-period 7 \
        --storage-encrypted \
        --no-multi-az \
        --no-publicly-accessible \
        --tags Key=Environment,Value="$ENVIRONMENT" Key=Application,Value=testdriven >/dev/null
    
    echo -e "${YELLOW}⏳ Waiting for RDS instance to be available...${NC}"
    aws rds wait db-instance-available --db-instance-identifier "$DB_INSTANCE_ID"
    
    echo -e "${GREEN}✅ RDS instance created successfully!${NC}"
    
    # Store password securely
    echo "$DB_PASSWORD" > /tmp/rds_password.txt
    echo -e "${BLUE}💾 Password saved to /tmp/rds_password.txt${NC}"
}

# Function to get connection information
get_connection_info() {
    echo -e "${YELLOW}📋 Getting connection information...${NC}"
    
    # Get endpoint
    ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].Endpoint.Address' --output text)
    
    PORT=$(aws rds describe-db-instances \
        --db-instance-identifier "$DB_INSTANCE_ID" \
        --query 'DBInstances[0].Endpoint.Port' --output text)
    
    # Get password if we have it
    if [ -f "/tmp/rds_password.txt" ]; then
        DB_PASSWORD=$(cat /tmp/rds_password.txt)
    else
        echo -e "${YELLOW}⚠️ Password not found. You'll need to reset it if needed.${NC}"
        DB_PASSWORD="YOUR_PASSWORD_HERE"
    fi
    
    CONNECTION_STRING="postgresql://webapp:${DB_PASSWORD}@${ENDPOINT}:${PORT}/users_production"
    
    echo -e "${GREEN}✅ RDS PostgreSQL Information:${NC}"
    echo "=================================="
    echo "📍 Endpoint: $ENDPOINT"
    echo "🔌 Port: $PORT"
    echo "🗃️ Database: users_production"
    echo "👤 Username: webapp"
    echo "🔐 Password: ${DB_PASSWORD:0:5}***"
    echo ""
    echo -e "${BLUE}🔗 Connection String:${NC}"
    echo "$CONNECTION_STRING"
    echo ""
    
    # Save for GitHub Actions
    echo "$CONNECTION_STRING" > /tmp/aws_rds_connection_string.txt
    echo -e "${GREEN}✅ Connection string saved to /tmp/aws_rds_connection_string.txt${NC}"
}

# Function to show GitHub setup
show_github_setup() {
    echo ""
    echo -e "${BLUE}🔐 Add to GitHub Actions Secrets:${NC}"
    echo "=================================="
    echo ""
    echo "Secret Name: AWS_RDS_URI"
    echo "Secret Value: $(cat /tmp/aws_rds_connection_string.txt)"
    echo ""
    echo -e "${BLUE}🔗 GitHub Secrets: https://github.com/owenabrams/testdriven-app/settings/secrets/actions${NC}"
    echo ""
    echo -e "${GREEN}📝 Next Steps:${NC}"
    echo "1. Add the AWS_RDS_URI secret to GitHub Actions"
    echo "2. Push any change to trigger deployment"
    echo "3. Your app will connect to AWS RDS PostgreSQL!"
    echo "4. Set up database migrations (see migration guide)"
}

# Function to show cost information
show_cost_info() {
    echo ""
    echo -e "${YELLOW}💰 Cost Information:${NC}"
    echo "==================="
    echo ""
    echo -e "${GREEN}🆓 FREE for 12 months:${NC}"
    echo "  • 750 hours/month of db.t3.micro"
    echo "  • 20GB of storage"
    echo "  • Automated backups"
    echo ""
    echo -e "${BLUE}💵 After free tier:${NC}"
    echo "  • ~$15-20/month for db.t3.micro"
    echo "  • Perfect for small to medium apps"
    echo ""
    echo -e "${YELLOW}⚠️ Monitor usage in AWS Console${NC}"
}

# Main execution
main() {
    check_aws_cli
    get_vpc_info
    create_security_group
    create_subnet_group
    create_rds_instance
    get_connection_info
    show_github_setup
    show_cost_info
    
    echo ""
    echo -e "${GREEN}🎉 AWS RDS PostgreSQL setup complete!${NC}"
    echo "Your FREE PostgreSQL database is ready for production use!"
}

# Run the main function
main "$@"
