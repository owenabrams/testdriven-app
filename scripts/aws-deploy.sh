#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_NAME="savings-groups-demo"
STACK_NAME="$PROJECT_NAME"
REGION="us-east-1"

echo -e "${BLUE}🚀 AWS Deployment Script for Savings Groups Platform${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not found. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if [ -z "$AWS_ACCESS_KEY_ID" ] && [ -z "$AWS_PROFILE" ] && [ ! -f ~/.aws/credentials ]; then
        print_error "AWS credentials not configured. Set environment variables or run 'aws configure' first."
        exit 1
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js not found. Please install it first."
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 not found. Please install it first."
        exit 1
    fi
    
    print_status "All prerequisites met!"
}

# Get user inputs
get_user_inputs() {
    print_info "Getting deployment configuration..."
    
    # Get database password
    echo -n "Enter a secure database password (min 8 characters): "
    read -s DB_PASSWORD
    echo
    
    if [ ${#DB_PASSWORD} -lt 8 ]; then
        print_error "Password must be at least 8 characters long."
        exit 1
    fi
    
    # Get AWS region (optional)
    echo -n "Enter AWS region (default: us-east-1): "
    read USER_REGION
    if [ ! -z "$USER_REGION" ]; then
        REGION="$USER_REGION"
    fi
    
    print_status "Configuration collected!"
}

# Build the application
build_application() {
    print_info "Building application..."
    
    # Build frontend
    print_info "Building React frontend..."
    cd services/client
    npm install
    npm run build
    cd ../..
    print_status "Frontend built successfully!"
    
    # Prepare backend for Lambda
    print_info "Preparing backend for Lambda..."
    mkdir -p lambda-deployment
    cd lambda-deployment
    
    # Copy backend code
    cp -r ../services/users/* .
    
    # Install dependencies using Docker to match Lambda environment
    if command -v docker &> /dev/null; then
        docker run --rm -v "$PWD":/var/task public.ecr.aws/lambda/python:3.9 /bin/bash -c "pip install -r requirements.txt -t ."
    else
        # Fallback: try without psycopg2 for now
        grep -v psycopg2 requirements.txt > requirements_temp.txt
        pip3 install -r requirements_temp.txt -t . --quiet
        rm requirements_temp.txt
        echo "⚠️  Skipped psycopg2 - using SQLite for this deployment"
    fi
    
    # Create Lambda handler
    cat > lambda_handler.py << 'EOF'
import os
from project import create_app

# Set environment variables for Lambda
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('APP_SETTINGS', 'project.config.ProductionConfig')

app, _ = create_app()

def lambda_handler(event, context):
    """AWS Lambda handler for Flask app"""
    try:
        from awsgi import response
        return response(app, event, context)
    except ImportError:
        return {
            'statusCode': 500,
            'body': '{"error": "awsgi not installed"}'
        }
EOF
    
    # Install awsgi for Lambda-Flask integration
    pip3 install awsgi -t . --quiet
    
    # Create deployment package
    zip -r ../savings-groups-backend.zip . -x "*.pyc" "__pycache__/*" "venv/*" > /dev/null
    cd ..
    print_status "Backend prepared for Lambda!"
}

# Deploy infrastructure
deploy_infrastructure() {
    print_info "Deploying AWS infrastructure..."
    
    # Deploy CloudFormation stack
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://aws-cloudformation-template.yml \
        --parameters ParameterKey=DatabasePassword,ParameterValue="$DB_PASSWORD" \
                     ParameterKey=ProjectName,ParameterValue="$PROJECT_NAME" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION"
    
    print_info "Waiting for infrastructure deployment (this may take 10-15 minutes)..."
    aws cloudformation wait stack-create-complete \
        --stack-name "$STACK_NAME" \
        --region "$REGION"
    
    print_status "Infrastructure deployed successfully!"
}

# Update Lambda function with actual code
update_lambda_function() {
    print_info "Updating Lambda function with application code..."
    
    # Get Lambda function name from CloudFormation
    LAMBDA_FUNCTION_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
        --output text)
    
    # Update Lambda function code
    aws lambda update-function-code \
        --function-name "$LAMBDA_FUNCTION_NAME" \
        --zip-file fileb://savings-groups-backend.zip \
        --region "$REGION" > /dev/null
    
    print_status "Lambda function updated with application code!"
}

# Deploy frontend to S3
deploy_frontend() {
    print_info "Deploying frontend to S3..."
    
    # Get S3 bucket name from CloudFormation
    S3_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`StaticAssetsBucketUrl`].OutputValue' \
        --output text | sed 's|http://||' | sed 's|\.s3-website.*||')
    
    # Get API Gateway URL for frontend configuration
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text)
    
    # Update frontend configuration
    cd services/client
    
    # Create production build with correct API URL
    echo "REACT_APP_USERS_SERVICE_URL=$API_URL" > .env.production
    npm run build
    
    # Upload to S3
    aws s3 sync build/ s3://"$S3_BUCKET"/ --region "$REGION" --quiet
    
    cd ../..
    print_status "Frontend deployed to S3!"
}

# Initialize database
initialize_database() {
    print_info "Initializing database..."
    
    # Get database endpoint
    DB_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
        --output text)
    
    # Set database URL
    export DATABASE_URL="postgresql://admin:$DB_PASSWORD@$DB_ENDPOINT:5432/savings_groups_db"
    
    # Run database migrations and seeding
    cd services/users
    source venv/bin/activate 2>/dev/null || true
    
    print_info "Running database migrations..."
    python manage.py db upgrade
    
    print_info "Seeding database with demo data..."
    python manage.py seed_db
    python seed_demo_data.py
    
    cd ../..
    print_status "Database initialized with demo data!"
}

# Display deployment information
show_deployment_info() {
    print_status "Deployment completed successfully! 🎉"
    echo
    echo -e "${BLUE}📋 Deployment Information:${NC}"
    echo -e "${BLUE}=========================${NC}"
    
    # Get outputs from CloudFormation
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
        --output text)
    
    FRONTEND_URL=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`StaticAssetsBucketUrl`].OutputValue' \
        --output text)
    
    DB_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
        --output text)
    
    echo -e "${GREEN}🌐 Frontend URL:${NC} $FRONTEND_URL"
    echo -e "${GREEN}🔗 API URL:${NC} $API_URL"
    echo -e "${GREEN}🗄️  Database:${NC} $DB_ENDPOINT"
    echo
    echo -e "${BLUE}🧪 Demo Credentials:${NC}"
    echo -e "   Email: admin@savingsgroups.ug"
    echo -e "   Password: admin123"
    echo
    echo -e "${BLUE}💰 Estimated Monthly Cost:${NC} ~$15-25 USD"
    echo
    echo -e "${YELLOW}🧹 To cleanup after demo:${NC}"
    echo -e "   ./scripts/aws-cleanup.sh"
}

# Cleanup function
cleanup_on_error() {
    print_error "Deployment failed. Cleaning up..."
    rm -rf lambda-deployment
    rm -f savings-groups-backend.zip
}

# Main deployment flow
main() {
    trap cleanup_on_error ERR
    
    check_prerequisites
    get_user_inputs
    build_application
    deploy_infrastructure
    update_lambda_function
    deploy_frontend
    initialize_database
    show_deployment_info
    
    # Cleanup temporary files
    rm -rf lambda-deployment
    rm -f savings-groups-backend.zip
    
    print_status "Deployment script completed! 🚀"
}

# Run main function
main "$@"