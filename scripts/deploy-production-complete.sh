#!/bin/bash

# Complete production deployment script
# Usage: ./scripts/deploy-production-complete.sh [db-password] [secret-key]

set -e

ENVIRONMENT="production"
REGION=${AWS_DEFAULT_REGION:-us-east-1}
DB_PASSWORD=${1}
SECRET_KEY=${2}

echo "🚀 Complete Production Deployment for TestDriven App"
echo "=================================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check required parameters
if [ -z "$DB_PASSWORD" ] || [ -z "$SECRET_KEY" ]; then
    echo "❌ Database password and secret key are required."
    echo "Usage: $0 [db-password] [secret-key]"
    echo "Example: $0 MySecurePassword123! MySecretKey456!"
    exit 1
fi

echo "✅ Using environment: $ENVIRONMENT"
echo "✅ Using region: $REGION"

# Step 1: Deploy ALB
echo ""
echo "🔧 Step 1: Deploying Application Load Balancer..."
if ./scripts/deploy-alb.sh production; then
    echo "✅ ALB deployment completed"
else
    echo "❌ ALB deployment failed"
    exit 1
fi

# Step 2: Deploy RDS
echo ""
echo "🔧 Step 2: Deploying RDS Database..."
if ./scripts/deploy-rds.sh production "$DB_PASSWORD"; then
    echo "✅ RDS deployment completed"
else
    echo "❌ RDS deployment failed"
    exit 1
fi

# Step 3: Deploy ECS Infrastructure
echo ""
echo "🔧 Step 3: Deploying ECS Infrastructure..."
if ./scripts/deploy-ecs.sh production; then
    echo "✅ ECS infrastructure deployment completed"
else
    echo "❌ ECS infrastructure deployment failed"
    exit 1
fi

# Step 4: Deploy ECS Services with RDS
echo ""
echo "🔧 Step 4: Deploying ECS Services with RDS Integration..."
if ./scripts/deploy-ecs-production.sh "$DB_PASSWORD" "$SECRET_KEY"; then
    echo "✅ ECS services deployment completed"
else
    echo "❌ ECS services deployment failed"
    exit 1
fi

# Step 5: Get ALB DNS and provide next steps
echo ""
echo "🔧 Step 5: Getting deployment information..."
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name "testdriven-${ENVIRONMENT}-alb" \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region "$REGION")

RDS_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "testdriven-${ENVIRONMENT}-rds" \
    --query 'Stacks[0].Outputs[?OutputKey==`DBEndpoint`].OutputValue' \
    --output text \
    --region "$REGION")

echo ""
echo "🎉 Production Deployment Complete!"
echo "=================================="
echo "🌐 Application URL: http://$ALB_DNS"
echo "🗃️  Database Endpoint: $RDS_ENDPOINT"
echo ""
echo "📝 Next Steps:"
echo "1. Run database migrations:"
echo "   ./scripts/connect-rds.sh production"
echo "   # Then SSH into EC2 and run migrations in the users container"
echo ""
echo "2. Test the application:"
echo "   curl http://$ALB_DNS/ping"
echo "   curl http://$ALB_DNS/users"
echo ""
echo "3. Update GitHub Secrets:"
echo "   LOAD_BALANCER_PROD_DNS_NAME = http://$ALB_DNS"
echo ""
echo "4. Run end-to-end tests:"
echo "   ./node_modules/.bin/cypress run --config baseUrl=http://$ALB_DNS"
echo ""
echo "🔒 Security Notes:"
echo "   - Database is private (VPC only access)"
echo "   - Use SSH tunneling for direct database access"
echo "   - Consider adding HTTPS/SSL certificates"
echo ""
echo "📊 Monitoring:"
echo "   - Check ECS Console for service health"
echo "   - Monitor CloudWatch logs"
echo "   - Check ALB target group health"
