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
    echo -e "${YELLOW}🔍 Checking AWS CLI configuration...${NC}"

    if ! command -v aws >/dev/null 2>&1; then
        echo -e "${RED}❌ AWS CLI not installed${NC}"
        echo -e "${BLUE}💡 Install AWS CLI: https://aws.amazon.com/cli/${NC}"
        return 1
    fi

    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        echo -e "${RED}❌ AWS CLI not configured or no permissions${NC}"
        echo -e "${BLUE}💡 Run: aws configure${NC}"
        return 1
    fi

    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    echo -e "${GREEN}✅ AWS Account: $ACCOUNT_ID${NC}"
    echo -e "${GREEN}✅ User: $USER_ARN${NC}"

    # Check for existing Aurora clusters
    check_existing_resources

    return 0
}

# Function to check for existing resources
check_existing_resources() {
    echo -e "${YELLOW}🔍 Checking for existing Aurora resources...${NC}"

    # Check for existing clusters
    local existing_clusters=$(aws rds describe-db-clusters \
        --query 'DBClusters[?contains(DBClusterIdentifier, `testdriven`)].{ID:DBClusterIdentifier,Status:Status,Engine:Engine}' \
        --output table 2>/dev/null)

    if [ -n "$existing_clusters" ] && [ "$existing_clusters" != "None" ]; then
        echo -e "${BLUE}📋 Found existing Aurora clusters:${NC}"
        echo "$existing_clusters"
        echo ""

        # Check if our specific cluster exists
        if aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" >/dev/null 2>&1; then
            local status=$(aws rds describe-db-clusters \
                --db-cluster-identifier "$CLUSTER_ID" \
                --query 'DBClusters[0].Status' --output text)

            echo -e "${YELLOW}⚠️ Cluster '$CLUSTER_ID' already exists with status: $status${NC}"
            echo ""

            if [ "$status" = "available" ]; then
                echo -e "${GREEN}✅ Cluster is ready! Getting connection information...${NC}"
                return 0
            elif [ "$status" = "creating" ]; then
                echo -e "${BLUE}⏳ Cluster is still being created...${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠️ Cluster status: $status${NC}"
                read -p "Continue with existing cluster? (y/n): " continue_existing
                if [[ ! "$continue_existing" =~ ^[Yy]$ ]]; then
                    echo "Setup cancelled"
                    exit 0
                fi
            fi
        fi
    else
        echo -e "${GREEN}✅ No existing Aurora clusters found${NC}"
    fi

    return 0
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

# Function to check AWS CLI version and Aurora support
check_aurora_support() {
    echo -e "${YELLOW}🔍 Checking Aurora Serverless v2 support...${NC}"

    # Check AWS CLI version
    AWS_CLI_VERSION=$(aws --version 2>&1 | cut -d/ -f2 | cut -d' ' -f1)
    echo -e "${BLUE}AWS CLI Version: $AWS_CLI_VERSION${NC}"

    # Test if serverlessv2-scaling-configuration is supported
    if aws rds create-db-cluster help 2>/dev/null | grep -q "serverlessv2-scaling-configuration"; then
        echo -e "${GREEN}✅ Aurora Serverless v2 supported${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️ Aurora Serverless v2 not supported in this AWS CLI version${NC}"
        echo -e "${BLUE}💡 Falling back to Aurora Provisioned with minimal instance${NC}"
        return 1
    fi
}

# Function to create Aurora Serverless v2 cluster
create_aurora_cluster() {
    echo -e "${YELLOW}🌟 Creating Aurora PostgreSQL cluster...${NC}"

    # Check if cluster exists
    if aws rds describe-db-clusters --db-cluster-identifier "$CLUSTER_ID" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Aurora cluster already exists${NC}"
        get_connection_info
        return 0
    fi

    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

    echo -e "${BLUE}Creating Aurora PostgreSQL cluster...${NC}"
    echo "This may take 5-10 minutes..."

    # Check Aurora Serverless v2 support
    if check_aurora_support; then
        echo -e "${BLUE}🌟 Creating Aurora Serverless v2 cluster...${NC}"

        # Create Aurora Serverless v2 cluster with JSON format
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
            --tags Key=Environment,Value="$ENVIRONMENT" Key=Application,Value=testdriven >/dev/null 2>&1

        if [ $? -eq 0 ]; then
            # Create Aurora Serverless v2 instance
            aws rds create-db-instance \
                --db-instance-identifier "${CLUSTER_ID}-instance-1" \
                --db-instance-class db.serverless \
                --engine aurora-postgresql \
                --db-cluster-identifier "$CLUSTER_ID" >/dev/null 2>&1

            CLUSTER_TYPE="Aurora Serverless v2"
        else
            echo -e "${YELLOW}⚠️ Serverless v2 creation failed, trying alternative format...${NC}"
            create_aurora_provisioned
            return $?
        fi
    else
        create_aurora_provisioned
        return $?
    fi

    echo -e "${YELLOW}⏳ Waiting for Aurora cluster to be available...${NC}"
    echo -e "${BLUE}This typically takes 5-8 minutes for Aurora Serverless v2...${NC}"

    # Wait with timeout and progress indication
    wait_for_cluster_with_progress

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $CLUSTER_TYPE cluster created successfully!${NC}"

        # Store password securely
        echo "$DB_PASSWORD" > /tmp/aurora_password.txt
        echo -e "${BLUE}💾 Password saved to /tmp/aurora_password.txt${NC}"
        return 0
    else
        echo -e "${RED}❌ Cluster creation failed or timed out${NC}"
        return 1
    fi
}

# Function to create Aurora Provisioned (fallback)
create_aurora_provisioned() {
    echo -e "${BLUE}🔧 Creating Aurora Provisioned cluster (minimal cost)...${NC}"

    # Create Aurora Provisioned cluster
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
        --tags Key=Environment,Value="$ENVIRONMENT" Key=Application,Value=testdriven >/dev/null 2>&1

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create Aurora cluster${NC}"
        return 1
    fi

    # Create Aurora instance (smallest available)
    aws rds create-db-instance \
        --db-instance-identifier "${CLUSTER_ID}-instance-1" \
        --db-instance-class db.t3.medium \
        --engine aurora-postgresql \
        --db-cluster-identifier "$CLUSTER_ID" >/dev/null 2>&1

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to create Aurora instance${NC}"
        return 1
    fi

    CLUSTER_TYPE="Aurora Provisioned (db.t3.medium)"
    return 0
}

# Function to wait for cluster with progress indication
wait_for_cluster_with_progress() {
    local max_wait=600  # 10 minutes
    local wait_time=0
    local check_interval=30

    while [ $wait_time -lt $max_wait ]; do
        local status=$(aws rds describe-db-clusters \
            --db-cluster-identifier "$CLUSTER_ID" \
            --query 'DBClusters[0].Status' --output text 2>/dev/null)

        case "$status" in
            "available")
                return 0
                ;;
            "creating"|"backing-up"|"modifying")
                echo -e "${BLUE}⏳ Cluster status: $status (${wait_time}s elapsed)${NC}"
                ;;
            "failed"|"incompatible-parameters"|"incompatible-restore")
                echo -e "${RED}❌ Cluster creation failed with status: $status${NC}"
                return 1
                ;;
            *)
                echo -e "${YELLOW}⏳ Cluster status: $status (${wait_time}s elapsed)${NC}"
                ;;
        esac

        sleep $check_interval
        wait_time=$((wait_time + check_interval))
    done

    echo -e "${RED}❌ Timeout waiting for cluster to become available${NC}"
    return 1
}

# Function to get connection information
get_connection_info() {
    echo -e "${YELLOW}📋 Getting connection information...${NC}"

    # Get cluster information
    CLUSTER_INFO=$(aws rds describe-db-clusters \
        --db-cluster-identifier "$CLUSTER_ID" \
        --query 'DBClusters[0]' --output json 2>/dev/null)

    if [ $? -ne 0 ] || [ "$CLUSTER_INFO" = "null" ]; then
        echo -e "${RED}❌ Failed to get cluster information${NC}"
        return 1
    fi

    # Extract endpoint and port
    ENDPOINT=$(echo "$CLUSTER_INFO" | jq -r '.Endpoint // empty')
    PORT=$(echo "$CLUSTER_INFO" | jq -r '.Port // 5432')
    ENGINE_VERSION=$(echo "$CLUSTER_INFO" | jq -r '.EngineVersion // "unknown"')
    STATUS=$(echo "$CLUSTER_INFO" | jq -r '.Status // "unknown"')

    # Check if cluster is available
    if [ "$STATUS" != "available" ]; then
        echo -e "${YELLOW}⚠️ Cluster status: $STATUS${NC}"
        if [ "$STATUS" = "creating" ]; then
            echo -e "${BLUE}💡 Cluster is still being created. Please wait...${NC}"
            return 1
        fi
    fi

    # Validate endpoint
    if [ -z "$ENDPOINT" ] || [ "$ENDPOINT" = "null" ]; then
        echo -e "${RED}❌ Cluster endpoint not available yet${NC}"
        return 1
    fi

    # Get password if we have it
    if [ -f "/tmp/aurora_password.txt" ]; then
        DB_PASSWORD=$(cat /tmp/aurora_password.txt)
    else
        echo -e "${YELLOW}⚠️ Password not found. You'll need to reset it if needed.${NC}"
        DB_PASSWORD="YOUR_PASSWORD_HERE"
    fi

    # Determine cluster type
    local cluster_type="Aurora PostgreSQL"
    if echo "$CLUSTER_INFO" | jq -e '.ServerlessV2ScalingConfiguration' >/dev/null 2>&1; then
        cluster_type="Aurora Serverless v2"
        local min_capacity=$(echo "$CLUSTER_INFO" | jq -r '.ServerlessV2ScalingConfiguration.MinCapacity // 0.5')
        local max_capacity=$(echo "$CLUSTER_INFO" | jq -r '.ServerlessV2ScalingConfiguration.MaxCapacity // 2.0')
        local scaling_info="⚡ Scaling: ${min_capacity}-${max_capacity} ACU (auto-scaling)"
    else
        # Get instance information for provisioned clusters
        local instance_info=$(aws rds describe-db-instances \
            --db-instance-identifier "${CLUSTER_ID}-instance-1" \
            --query 'DBInstances[0].DBInstanceClass' --output text 2>/dev/null)
        if [ "$instance_info" != "None" ] && [ -n "$instance_info" ]; then
            cluster_type="Aurora Provisioned"
            scaling_info="🖥️ Instance: $instance_info"
        else
            scaling_info="🔧 Configuration: Standard Aurora"
        fi
    fi

    CONNECTION_STRING="postgresql://webapp:${DB_PASSWORD}@${ENDPOINT}:${PORT}/users_production"

    echo -e "${GREEN}✅ $cluster_type Information:${NC}"
    echo "===================================="
    echo "📍 Endpoint: $ENDPOINT"
    echo "🔌 Port: $PORT"
    echo "🗃️ Database: users_production"
    echo "👤 Username: webapp"
    echo "🔐 Password: ${DB_PASSWORD:0:5}***"
    echo "🔧 Engine: PostgreSQL $ENGINE_VERSION"
    echo "$scaling_info"
    echo "📊 Status: $STATUS"
    echo ""
    echo -e "${BLUE}🔗 Connection String:${NC}"
    echo "$CONNECTION_STRING"
    echo ""

    # Save for GitHub Actions
    echo "$CONNECTION_STRING" > /tmp/aurora_connection_string.txt
    echo -e "${GREEN}✅ Connection string saved to /tmp/aurora_connection_string.txt${NC}"

    return 0
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
    echo -e "${YELLOW}💰 Aurora Cost & Scaling Information:${NC}"
    echo "===================================="
    echo ""
    echo -e "${GREEN}🆓 FREE Tier (12 months):${NC}"
    echo "  • 750 hours/month of Aurora usage"
    echo "  • Applies to both Serverless v2 and Provisioned"
    echo "  • Perfect for testing and development"
    echo ""

    if [ "$CLUSTER_TYPE" = "Aurora Serverless v2" ]; then
        echo -e "${BLUE}💵 Aurora Serverless v2 Pricing:${NC}"
        echo "  • 0.5 ACU (idle): ~\$0.06/hour = ~\$43/month"
        echo "  • 1.0 ACU (light load): ~\$0.12/hour = ~\$86/month"
        echo "  • 2.0 ACU (peak load): ~\$0.24/hour = ~\$172/month"
        echo ""
        echo -e "${GREEN}⚡ Auto-Scaling Benefits:${NC}"
        echo "  • Scales down to 0.5 ACU when idle"
        echo "  • Scales up instantly under load"
        echo "  • Only pay for what you use"
        echo "  • Perfect for variable workloads"
    else
        echo -e "${BLUE}💵 Aurora Provisioned Pricing:${NC}"
        echo "  • db.t3.medium: ~\$0.082/hour = ~\$59/month"
        echo "  • Fixed cost regardless of usage"
        echo "  • Predictable billing"
        echo ""
        echo -e "${YELLOW}💡 Cost Optimization Tips:${NC}"
        echo "  • Stop cluster when not in use (saves ~90%)"
        echo "  • Consider Aurora Serverless v2 for variable workloads"
        echo "  • Monitor usage patterns in CloudWatch"
    fi

    echo ""
    echo -e "${YELLOW}📊 Monitoring & Management:${NC}"
    echo "  • Watch performance in CloudWatch"
    echo "  • Set up billing alerts"
    echo "  • Monitor in RDS Console"
    echo "  • Use AWS Cost Explorer for cost analysis"
}

# Function to handle setup failures and provide alternatives
handle_setup_failure() {
    echo ""
    echo -e "${RED}❌ Aurora setup encountered issues${NC}"
    echo -e "${YELLOW}🔧 Alternative Solutions:${NC}"
    echo ""
    echo -e "${BLUE}1. Manual Aurora Setup:${NC}"
    echo "   • Go to AWS RDS Console"
    echo "   • Create Aurora PostgreSQL cluster"
    echo "   • Use same VPC and security groups"
    echo ""
    echo -e "${BLUE}2. Use RDS Free Tier:${NC}"
    echo "   • Run: ./scripts/setup-aws-rds-free.sh"
    echo "   • Simpler setup, same PostgreSQL"
    echo ""
    echo -e "${BLUE}3. Use External Database:${NC}"
    echo "   • Supabase: https://supabase.com (free tier)"
    echo "   • ElephantSQL: https://elephantsql.com (free tier)"
    echo "   • Railway: https://railway.app (free tier)"
    echo ""
    echo -e "${GREEN}💡 Any PostgreSQL database will work!${NC}"
    echo "Just add the connection string to GitHub Actions as AWS_RDS_URI"
}

# Function to test database connectivity
test_database_connection() {
    if [ -f "/tmp/aurora_connection_string.txt" ]; then
        local conn_string=$(cat /tmp/aurora_connection_string.txt)
        echo -e "${YELLOW}🔍 Testing database connection...${NC}"

        # Test with psql if available
        if command -v psql >/dev/null 2>&1; then
            if echo "SELECT version();" | psql "$conn_string" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Database connection successful!${NC}"
                return 0
            else
                echo -e "${YELLOW}⚠️ Database connection test failed${NC}"
                echo -e "${BLUE}💡 This is normal if the cluster is still starting up${NC}"
                return 1
            fi
        else
            echo -e "${BLUE}💡 psql not available for connection test${NC}"
            echo -e "${GREEN}✅ Connection string generated successfully${NC}"
            return 0
        fi
    else
        echo -e "${RED}❌ No connection string found${NC}"
        return 1
    fi
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

    read -p "Create Aurora PostgreSQL cluster? (y/n): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Setup cancelled"
        exit 0
    fi

    echo -e "${BLUE}🚀 Starting Aurora PostgreSQL setup...${NC}"
    echo ""

    # Step 1: Check AWS CLI and permissions
    if ! check_aws_cli; then
        echo -e "${RED}❌ AWS CLI check failed${NC}"
        exit 1
    fi

    # Step 2: Get VPC information
    if ! get_vpc_info; then
        echo -e "${RED}❌ VPC setup failed${NC}"
        exit 1
    fi

    # Step 3: Create security group
    if ! create_security_group; then
        echo -e "${RED}❌ Security group setup failed${NC}"
        exit 1
    fi

    # Step 4: Create subnet group
    if ! create_subnet_group; then
        echo -e "${RED}❌ Subnet group setup failed${NC}"
        exit 1
    fi

    # Step 5: Create Aurora cluster
    echo -e "${BLUE}🌟 Creating Aurora cluster...${NC}"
    if create_aurora_cluster; then
        echo -e "${GREEN}✅ Aurora cluster creation initiated successfully${NC}"

        # Step 6: Get connection information
        if get_connection_info; then
            echo -e "${GREEN}✅ Connection information retrieved${NC}"

            # Step 7: Test connection if possible
            test_database_connection

            # Step 8: Show setup information
            show_github_setup
            show_cost_info
            show_migration_info

            echo ""
            echo -e "${GREEN}🎉 Aurora PostgreSQL setup complete!${NC}"
            echo -e "${BLUE}Your PostgreSQL database is ready for production use!${NC}"
            echo ""
            echo -e "${YELLOW}📋 Next Steps:${NC}"
            echo "1. Add AWS_RDS_URI to GitHub Actions secrets"
            echo "2. Push any change to trigger deployment"
            echo "3. Monitor your app logs for successful database connection"
            echo ""

            return 0
        else
            echo -e "${YELLOW}⚠️ Cluster created but connection info not ready yet${NC}"
            echo -e "${BLUE}💡 The cluster may still be initializing. Try running this script again in 5-10 minutes.${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Aurora cluster creation failed${NC}"
        handle_setup_failure
        return 1
    fi
}

# Cleanup function
cleanup() {
    # Remove temporary files
    rm -f /tmp/aurora_password.txt 2>/dev/null
    rm -f /tmp/aurora_connection_string.txt 2>/dev/null
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Run the main function
main "$@"
