# AWS Deployment Guide - Savings Groups Platform

## 🎯 **Quick Demo Deployment to AWS**

This guide will help you deploy the Savings Groups Platform to AWS for demonstration purposes using cost-effective services.

## 📋 **Prerequisites**

1. **AWS Account** with IAM access ✅ (You have this)
2. **AWS CLI** installed and configured
3. **Node.js** and **Python** installed locally
4. **Git** repository access

## 🏗️ **Architecture Overview**

We'll use these AWS services for a cost-effective demo:
- **AWS Amplify** - Frontend hosting (React app)
- **AWS Lambda + API Gateway** - Backend API
- **Amazon RDS (PostgreSQL)** - Database
- **AWS S3** - Static assets and backups

## 🚀 **Step-by-Step Deployment**

### **Step 1: Install AWS CLI and Configure**

```bash
# Install AWS CLI (if not already installed)
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Configure AWS CLI with your credentials
aws configure
# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key  
# - Default region (e.g., us-east-1)
# - Default output format (json)
```

### **Step 2: Prepare the Application**

```bash
# 1. Create production environment file
cat > .env.prod << EOF
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/savings_groups_db
SECRET_KEY=$(openssl rand -base64 32)
REACT_APP_USERS_SERVICE_URL=https://your-api-gateway-url
FLASK_ENV=production
EOF

# 2. Build the frontend
cd services/client
npm install
npm run build
cd ../..

# 3. Prepare backend for Lambda
cd services/users
pip install -r requirements.txt
cd ../..
```

### **Step 3: Deploy Database (RDS)**

```bash
# Create RDS PostgreSQL instance (Free tier eligible)
aws rds create-db-instance \
    --db-instance-identifier savings-groups-demo \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username admin \
    --master-user-password YourSecurePassword123! \
    --allocated-storage 20 \
    --vpc-security-group-ids sg-xxxxxxxxx \
    --db-name savings_groups_db \
    --backup-retention-period 0 \
    --no-multi-az \
    --publicly-accessible

# Wait for RDS to be available (takes 5-10 minutes)
aws rds wait db-instance-available --db-instance-identifier savings-groups-demo

# Get the RDS endpoint
aws rds describe-db-instances \
    --db-instance-identifier savings-groups-demo \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text
```

### **Step 4: Deploy Backend to Lambda**

Create Lambda deployment package:

```bash
# Create Lambda deployment directory
mkdir lambda-deployment
cd lambda-deployment

# Copy backend code
cp -r ../services/users/* .

# Install dependencies for Lambda
pip install -r requirements.txt -t .

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
    from awsgi import response
    return response(app, event, context)
EOF

# Install awsgi for Lambda-Flask integration
pip install awsgi -t .

# Create deployment package
zip -r ../savings-groups-backend.zip . -x "*.pyc" "__pycache__/*" "venv/*"
cd ..
```

Deploy to Lambda:

```bash
# Create Lambda function
aws lambda create-function \
    --function-name savings-groups-backend \
    --runtime python3.11 \
    --role arn:aws:iam::YOUR-ACCOUNT-ID:role/lambda-execution-role \
    --handler lambda_handler.lambda_handler \
    --zip-file fileb://savings-groups-backend.zip \
    --timeout 30 \
    --memory-size 512 \
    --environment Variables='{
        "DATABASE_URL":"postgresql://admin:YourSecurePassword123!@your-rds-endpoint:5432/savings_groups_db",
        "SECRET_KEY":"your-secret-key-here",
        "FLASK_ENV":"production"
    }'

# Create API Gateway
aws apigatewayv2 create-api \
    --name savings-groups-api \
    --protocol-type HTTP \
    --target arn:aws:lambda:us-east-1:YOUR-ACCOUNT-ID:function:savings-groups-backend
```

### **Step 5: Deploy Frontend to Amplify**

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify project
cd services/client
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

### **Step 6: Initialize Database**

```bash
# Connect to RDS and run migrations
# First, get RDS endpoint from Step 3
export DATABASE_URL="postgresql://admin:YourSecurePassword123!@your-rds-endpoint:5432/savings_groups_db"

# Run database setup
cd services/users
python manage.py db upgrade
python manage.py seed_db
python seed_demo_data.py
```

## 🎛️ **Alternative: One-Click AWS Deployment**

For even easier deployment, use this CloudFormation template:

```bash
# Deploy entire stack with CloudFormation
aws cloudformation create-stack \
    --stack-name savings-groups-demo \
    --template-body file://aws-cloudformation-template.yml \
    --parameters ParameterKey=DatabasePassword,ParameterValue=YourSecurePassword123! \
    --capabilities CAPABILITY_IAM
```

## 💰 **Cost Estimation (Demo Usage)**

| Service | Cost (Monthly) | Notes |
|---------|----------------|-------|
| RDS t3.micro | ~$15 | Free tier: 750 hours/month |
| Lambda | ~$0-5 | Free tier: 1M requests |
| API Gateway | ~$0-3 | Free tier: 1M requests |
| Amplify Hosting | ~$0-1 | Free tier: 15GB |
| **Total** | **~$15-25** | **Great for demos!** |

## 🔧 **Environment Variables Setup**

Create these in AWS Systems Manager Parameter Store:

```bash
# Store sensitive configuration
aws ssm put-parameter \
    --name "/savings-groups/database-url" \
    --value "postgresql://admin:password@endpoint:5432/db" \
    --type "SecureString"

aws ssm put-parameter \
    --name "/savings-groups/secret-key" \
    --value "your-secret-key" \
    --type "SecureString"
```

## 🌐 **Access Your Demo**

After deployment, you'll have:

1. **Frontend URL**: `https://your-app-id.amplifyapp.com`
2. **API URL**: `https://your-api-id.execute-api.region.amazonaws.com`
3. **Database**: RDS PostgreSQL instance

## 🧪 **Test Your Deployment**

```bash
# Test API health
curl https://your-api-gateway-url/users/ping

# Test frontend
open https://your-amplify-url

# Login with demo credentials:
# Email: admin@savingsgroups.ug
# Password: admin123
```

## 🛡️ **Security Notes for Demo**

- Use strong passwords for RDS
- Enable HTTPS only
- Set up proper IAM roles
- Consider VPC for production use
- Enable CloudTrail for auditing

## 🧹 **Cleanup After Demo**

```bash
# Delete CloudFormation stack (removes everything)
aws cloudformation delete-stack --stack-name savings-groups-demo

# Or delete services individually:
aws rds delete-db-instance --db-instance-identifier savings-groups-demo --skip-final-snapshot
aws lambda delete-function --function-name savings-groups-backend
amplify delete
```

## 📞 **Need Help?**

If you encounter issues:
1. Check AWS CloudWatch logs
2. Verify IAM permissions
3. Ensure security groups allow traffic
4. Check environment variables

## 🎯 **Quick Start Commands**

```bash
# Clone and prepare
git clone your-repo
cd your-repo

# Set up environment
cp .env.example .env.prod
# Edit .env.prod with your values

# Deploy everything
./scripts/aws-deploy.sh

# Access your demo at the provided URLs
```

This setup gives you a professional, scalable demo environment on AWS that costs under $25/month and can handle demo traffic easily!