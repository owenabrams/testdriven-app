#!/bin/bash

# 🌟 AWS Aurora Serverless v2 PostgreSQL Setup
# Creates a FREE Aurora Serverless v2 PostgreSQL cluster for testing/production

set -e

# Configuration
ENVIRONMENT="production"
CLUSTER_ID="testdriven-${ENVIRONMENT}-aurora"
REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🌟 AWS Aurora Serverless v2 PostgreSQL Setup${NC}"
echo "=============================================="

# Function to check AWS CLI
check_aws_cli() {
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo -e "${RED}❌ AWS CLI not configured${NC}"
        exit 1
    fi
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✅ Using AWS Account: $ACCOUNT_ID${NC}"
}

# Function to show Aurora Serverless v2 benefits
show_aurora_benefits() {
    echo -e "${BLUE}🌟 Aurora Serverless v2 Benefits:${NC}"
    echo "=================================="
    echo ""
    echo -e "${GREEN}✅ Cost Optimization:${NC}"
    echo "  • Scales to 0.5 ACU when idle (~\$0.06/hour)"
    echo "  • Only pay for actual usage"
    echo "  • FREE tier: 750 hours/month for 12 months"
    echo ""
    echo -e "${GREEN}✅ Performance:${NC}"
    echo "  • Faster scaling than traditional RDS"
    echo "  • Built-in high availability"
    echo "  • Automatic storage scaling"
    echo ""
    echo -e "${GREEN}✅ Perfect for Testing:${NC}"
    echo "  • Scales down when not in use"
    echo "  • Scales up instantly for load testing"
    echo "  • Same PostgreSQL compatibility"
    echo ""
}

# Function to get VPC info
get_vpc_info() {
    echo -e "${YELLOW}🔍 Getting VPC information...${NC}"
    
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
        echo -e "${RED}❌ No default VPC found${NC}"
        exit 1
    fi
    
    # Get subnets in different AZs (Aurora requires at least 2 AZs)
    SUBNET_IDS=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=$VPC_ID" "Name=default-for-az,Values=true" \
        --query 'Subnets[0:3].SubnetId' --output text | tr '\t' ' ')
    
    SUBNET_COUNT=$(echo $SUBNET_IDS | wc -w)
    if [ $SUBNET_COUNT -lt 2 ]; then
        echo -e "${RED}❌ Aurora requires subnets in at least 2 AZs${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ VPC: $VPC_ID${NC}"
    echo -e "${GREEN}✅ Subnets: $SUBNET_IDS (${SUBNET_COUNT} AZs)${NC}"
}

# Function to create security group
create_security_group() {
    echo -e "${YELLOW}🔒 Creating Aurora security group...${NC}"
    
    # Check if security group exists
    SG_ID=$(aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=testdriven-${ENVIRONMENT}-aurora-sg" \
        --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "None")
    
    if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ]; then
        echo -e "${GREEN}✅ Using existing security group: $SG_ID${NC}"
        return 0
    fi
    
    # Create security group
    SG_ID=$(aws ec2 create-security-group \
        --group-name "testdriven-${ENVIRONMENT}-aurora-sg" \
        --description "Security group for TestDriven Aurora Serverless PostgreSQL" \
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
    
    SUBNET_GROUP_NAME="testdriven-${ENVIRONMENT}-aurora-subnet-group"
    
    # Check if subnet group exists
    if aws rds describe-db-subnet-groups --db-subnet-group-name "$SUBNET_GROUP_NAME" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Using existing subnet group${NC}"
        return 0
    fi
    
    # Create subnet group
    aws rds create-db-subnet-group \
        --db-subnet-group-name "$SUBNET_GROUP_NAME" \
        --db-subnet-group-description "Subnet group for TestDriven Aurora Serverless PostgreSQL" \
        --subnet-ids $SUBNET_IDS \
        --tags Key=Environment,Value="$ENVIRONMENT" Key=Application,Value=testdriven >/dev/null
    
    echo -e "${GREEN}✅ Created DB subnet group${NC}"
}

# Function to create Aurora Serverless v2 cluster
create_aurora_cluster() {
    echo -e "${YELLOW}🌟 Creating Aurora Serverless v2 cluster...${NC}"
    
    # Check if cluster exists
    if aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Aurora cluster already exists${NC}"
        get_connection_info
        return 0
    fi
    
    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    echo -e "${BLUE}Creating Aurora Serverless v2 PostgreSQL cluster...${NC}"
    echo "This may take 5-10 minutes..."
    
    # Create Aurora Serverless v2 cluster
    aws rds create-db-cluster \
        --db-cluster-identifier "$CLUSTER_ID" \
        --engine aurora-postgresql \
        --engine-version 15.4 \
        --master-username webapp \
        --master-user-password "$DB_PASSWORD" \
        --database-name users_production \
        --vpc-security-group-ids "$SG_ID" \
        --db-subnet-group-name "testdriven-${ENVIRONMENT}-aurora-subnet-group" \
        --backup-retention-period 7 \
        --storage-encrypted \
        --serverlessv2-scaling-configuration MinCapacity=0.5,MaxCapacity=2.0 \
        --tags Key=Environment,Value="$ENVIRONMENT" Key=Application,Value=testdriven >/dev/null
    
    # Create Aurora Serverless v2 instance
    aws rds create-db-instance \
        --db-instance-identifier "${CLUSTER_ID}-instance-1" \
        --db-instance-class db.serverless \
        --engine aurora-postgresql \
        --db-cluster-identifier "$CLUSTER_ID" >/dev/null
    
    echo -e "${YELLOW}⏳ Waiting for Aurora cluster to be available...${NC}"
    aws rds wait db-cluster-available --db-cluster-identifier "$CLUSTER_ID"
    
    echo -e "${GREEN}✅ Aurora Serverless v2 cluster created successfully!${NC}"
    
    # Store password securely
    echo "$DB_PASSWORD" > /tmp/aurora_password.txt
    echo -e "${BLUE}💾 Password saved to /tmp/aurora_password.txt${NC}"
}

# Function to get connection information
get_connection_info() {
    echo -e "${YELLOW}📋 Getting connection information...${NC}"
    
    # Get endpoint
    ENDPOINT=$(aws rds describe-db-clusters \
        --db-cluster-identifier "$CLUSTER_ID" \
        --query 'DBClusters[0].Endpoint' --output text)
    
    PORT=$(aws rds describe-db-clusters \
        --db-cluster-identifier "$CLUSTER_ID" \
        --query 'DBClusters[0].Port' --output text)
    
    # Get password if we have it
    if [ -f "/tmp/aurora_password.txt" ]; then
        DB_PASSWORD=$(cat /tmp/aurora_password.txt)
    else
        echo -e "${YELLOW}⚠️ Password not found. You'll need to reset it if needed.${NC}"
        DB_PASSWORD="YOUR_PASSWORD_HERE"
    fi
    
    CONNECTION_STRING="postgresql://webapp:${DB_PASSWORD}@${ENDPOINT}:${PORT}/users_production"
    
    echo -e "${GREEN}✅ Aurora Serverless v2 Information:${NC}"
    echo "===================================="
    echo "📍 Endpoint: $ENDPOINT"
    echo "🔌 Port: $PORT"
    echo "🗃️ Database: users_production"
    echo "👤 Username: webapp"
    echo "🔐 Password: ${DB_PASSWORD:0:5}***"
    echo "⚡ Scaling: 0.5-2.0 ACU (auto-scaling)"
    echo ""
    echo -e "${BLUE}🔗 Connection String:${NC}"
    echo "$CONNECTION_STRING"
    echo ""
    
    # Save for GitHub Actions
    echo "$CONNECTION_STRING" > /tmp/aurora_connection_string.txt
    echo -e "${GREEN}✅ Connection string saved to /tmp/aurora_connection_string.txt${NC}"
}

# Function to show GitHub setup
show_github_setup() {
    echo ""
    echo -e "${BLUE}🔐 Add to GitHub Actions Secrets:${NC}"
    echo "=================================="
    echo ""
    echo "Secret Name: AWS_RDS_URI"
    echo "Secret Value: $(cat /tmp/aurora_connection_string.txt)"
    echo ""
    echo -e "${BLUE}🔗 GitHub Secrets: https://github.com/owenabrams/testdriven-app/settings/secrets/actions${NC}"
    echo ""
    echo -e "${GREEN}📝 Next Steps:${NC}"
    echo "1. Add the AWS_RDS_URI secret to GitHub Actions"
    echo "2. Push any change to trigger deployment"
    echo "3. Your app will connect to Aurora Serverless v2!"
    echo "4. Monitor scaling in AWS Console"
}

# Function to show cost and scaling information
show_cost_info() {
    echo ""
    echo -e "${YELLOW}💰 Aurora Serverless v2 Cost & Scaling:${NC}"
    echo "======================================="
    echo ""
    echo -e "${GREEN}🆓 FREE Tier (12 months):${NC}"
    echo "  • 750 hours/month of Aurora usage"
    echo "  • Covers 0.5 ACU 24/7 for entire month"
    echo "  • Perfect for testing and development"
    echo ""
    echo -e "${BLUE}💵 After Free Tier:${NC}"
    echo "  • 0.5 ACU (idle): ~\$0.06/hour = ~\$43/month"
    echo "  • 1.0 ACU (light load): ~\$0.12/hour = ~\$86/month"
    echo "  • 2.0 ACU (peak load): ~\$0.24/hour = ~\$172/month"
    echo ""
    echo -e "${GREEN}⚡ Auto-Scaling Benefits:${NC}"
    echo "  • Scales down to 0.5 ACU when idle"
    echo "  • Scales up instantly under load"
    echo "  • Only pay for what you use"
    echo "  • Perfect for variable workloads"
    echo ""
    echo -e "${YELLOW}📊 Monitoring:${NC}"
    echo "  • Watch ACU usage in CloudWatch"
    echo "  • Set up billing alerts"
    echo "  • Monitor in RDS Console"
}

# Function to show migration compatibility
show_migration_info() {
    echo ""
    echo -e "${BLUE}🔄 Migration Compatibility:${NC}"
    echo "=========================="
    echo ""
    echo -e "${GREEN}✅ Full PostgreSQL Compatibility:${NC}"
    echo "  • Same SQL syntax as regular PostgreSQL"
    echo "  • Same migration scripts work"
    echo "  • Same database functions and triggers"
    echo "  • Same real-time features (NOTIFY/LISTEN)"
    echo ""
    echo -e "${GREEN}✅ Your Migration System Works:${NC}"
    echo "  • ./scripts/run-migrations.sh works identically"
    echo "  • Same database/migrations/*.sql files"
    echo "  • Automatic migrations during deployment"
    echo "  • No changes needed to your CI/CD pipeline"
}

# Main execution
main() {
    show_aurora_benefits
    echo ""
    
    read -p "Create Aurora Serverless v2 cluster? (y/n): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 0
    fi
    
    check_aws_cli
    get_vpc_info
    create_security_group
    create_subnet_group
    create_aurora_cluster
    get_connection_info
    show_github_setup
    show_cost_info
    show_migration_info
    
    echo ""
    echo -e "${GREEN}🎉 Aurora Serverless v2 PostgreSQL setup complete!${NC}"
    echo "Your auto-scaling PostgreSQL database is ready!"
}

# Run the main function
main "$@"
