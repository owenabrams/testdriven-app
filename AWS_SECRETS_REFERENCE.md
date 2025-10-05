# 🔐 AWS Secrets & Credentials Reference

## 📋 Overview
This document outlines all the secrets, credentials, and configuration values needed to replicate your successful AWS deployment.

## 🔑 Required GitHub Secrets

### **Core AWS Credentials**
These are the essential secrets that must be configured in your GitHub repository:

```yaml
# GitHub Repository Settings → Secrets and variables → Actions

AWS_ACCESS_KEY_ID: 
  Description: Your AWS IAM user access key
  Format: AKIA[A-Z0-9]{16}
  Example: AKIAIOSFODNN7EXAMPLE
  Location: AWS IAM Console → Users → Security credentials

AWS_SECRET_ACCESS_KEY:
  Description: Your AWS IAM user secret access key  
  Format: [A-Za-z0-9/+=]{40}
  Example: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  Location: AWS IAM Console → Users → Security credentials

AWS_ACCOUNT_ID:
  Description: Your AWS account identifier
  Value: "068561046929"
  Location: AWS Console → Account settings
```

### **Database Credentials**
```yaml
AURORA_DB_PASSWORD:
  Description: Password for Aurora PostgreSQL database
  Username: webapp
  Database: users_production / users_staging
  Security: Store securely, never commit to code

PRODUCTION_SECRET_KEY:
  Description: Flask secret key for production environment
  Format: Random string, 32+ characters
  Generation: python -c "import secrets; print(secrets.token_hex(32))"

STAGING_SECRET_KEY:
  Description: Flask secret key for staging environment
  Format: Random string, 32+ characters
  Generation: python -c "import secrets; print(secrets.token_hex(32))"
```

## 🏗️ AWS Resource Identifiers

### **Fixed Infrastructure IDs**
These are the specific AWS resource identifiers from your working deployment:

```yaml
# ECS Configuration
ECS_CLUSTER_PRODUCTION: "testdriven-production-cluster"
ECS_SERVICE_FRONTEND: "testdriven-client-production-service"
ECS_SERVICE_BACKEND: "testdriven-users-production-service"

# Task Definitions
TASK_DEF_FRONTEND: "testdriven-client-production-td"
TASK_DEF_BACKEND: "testdriven-users-production-td"

# ECR Registry
ECR_REGISTRY: "068561046929.dkr.ecr.us-east-1.amazonaws.com"
ECR_REPO_FRONTEND: "testdriven-frontend-production"
ECR_REPO_BACKEND: "testdriven-backend-production"

# Load Balancer
ALB_DNS: "testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com"
ALB_ZONE_ID: "Z35SXDOTRQ7X7K"  # us-east-1 ALB zone

# Target Groups
TG_FRONTEND_ARN: "arn:aws:elasticloadbalancing:us-east-1:068561046929:targetgroup/testdriven-frontend-tg/038054e2e84012ab"
TG_BACKEND_ARN: "arn:aws:elasticloadbalancing:us-east-1:068561046929:targetgroup/testdriven-backend-tg/648725bcd7bfe334"
```

### **Aurora PostgreSQL Configuration**
```yaml
# Database Cluster
AURORA_CLUSTER_ID: "testdriven-production-aurora"
AURORA_WRITER_ENDPOINT: "testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com"
AURORA_READER_ENDPOINT: "testdriven-production-aurora.cluster-ro-copao2ykcikc.us-east-1.rds.amazonaws.com"

# Database Details
DB_PORT: 5432
DB_USERNAME: "webapp"
DB_NAME_PRODUCTION: "users_production"
DB_NAME_STAGING: "users_staging"
DB_ENGINE: "aurora-postgresql"
DB_VERSION: "13.7"
```

## 🔧 Configuration Files with Secrets

### **Environment Variables (Production)**
File: `config/environments/production.env`

```bash
# Application URLs
REACT_APP_API_URL=http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com
ALB_URL=http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com

# AWS Configuration  
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=068561046929

# Database URL (password from secrets)
DATABASE_URL=postgresql://webapp:${AURORA_DB_PASSWORD}@testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com:5432/users_production
```

### **ECS Task Definition Secrets**
File: `ecs/ecs_users_prod_taskdefinition.json`

```json
{
  "environment": [
    {
      "name": "DATABASE_URL",
      "value": "postgresql://webapp:%s@testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com:5432/users_production"
    },
    {
      "name": "SECRET_KEY", 
      "value": "%s"
    },
    {
      "name": "AURORA_DB_PASSWORD",
      "value": "%s"
    }
  ]
}
```

## 🚀 Deployment Script Configuration

### **Manual Deployment Script**
File: `scripts/deploy-manual.sh`

```bash
# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="068561046929"
CLUSTER_NAME="testdriven-production-cluster"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
```

### **Aurora Deployment Script**
File: `scripts/deploy-ecs-production-aurora.sh`

```bash
# AWS Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-068561046929}"
CLUSTER_NAME="testdriven-production"
SERVICE_NAME="testdriven-users-production"

# Aurora Configuration
AURORA_CLUSTER_ENDPOINT="testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com"
AURORA_READER_ENDPOINT="testdriven-production-aurora.cluster-ro-copao2ykcikc.us-east-1.rds.amazonaws.com"
AURORA_DB_NAME="users_production"
AURORA_DB_USER="webapp"
```

## 🔍 Secret Detection & Security

### **Files That Contain Secrets**
⚠️ **Never commit these with real values:**

```yaml
# Configuration files with placeholders
config/environments/production.env: Contains database URLs, API endpoints
ecs/ecs_users_prod_taskdefinition.json: Contains %s placeholders for secrets
ecs/ecs_users_stage_aurora_taskdefinition.json: Contains %s placeholders

# Scripts that use secrets
scripts/deploy-ecs-production-aurora.sh: Uses environment variables
scripts/deploy-ecs-staging-aurora.sh: Uses environment variables
```

### **Secret Injection Points**
```bash
# GitHub Actions injects secrets at runtime
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

# ECS task definitions use parameter substitution
DATABASE_URL="postgresql://webapp:${AURORA_DB_PASSWORD}@..."
SECRET_KEY="${PRODUCTION_SECRET_KEY}"
```

## 🛠️ Setup Commands

### **Configure GitHub Secrets**
```bash
# Automated setup
./scripts/setup-aurora-github-secrets.sh

# Manual setup via GitHub CLI
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."
gh secret set AWS_SECRET_ACCESS_KEY --body "wJalr..."
gh secret set AURORA_DB_PASSWORD --body "your-password"
gh secret set PRODUCTION_SECRET_KEY --body "$(python -c 'import secrets; print(secrets.token_hex(32))')"
```

### **Verify AWS Credentials**
```bash
# Test AWS access
aws sts get-caller-identity

# Expected output:
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "068561046929", 
    "Arn": "arn:aws:iam::068561046929:user/your-username"
}

# Test ECR access
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 068561046929.dkr.ecr.us-east-1.amazonaws.com
```

### **Test Database Connection**
```bash
# Test Aurora connectivity (requires psql)
psql "postgresql://webapp:YOUR_PASSWORD@testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com:5432/users_production" -c "SELECT version();"
```

## 🔐 Security Best Practices

### **Secret Management**
- ✅ Use GitHub Secrets for all sensitive values
- ✅ Never commit secrets to version control
- ✅ Use parameter substitution in task definitions
- ✅ Rotate secrets regularly
- ✅ Use least-privilege IAM policies

### **Access Control**
```yaml
# Required IAM permissions for deployment user
Policies:
  - AmazonECS_FullAccess
  - AmazonEC2ContainerRegistryFullAccess
  - AmazonRDSFullAccess
  - ElasticLoadBalancingFullAccess
  - CloudFormationFullAccess
  - IAMReadOnlyAccess
```

## 📋 Verification Checklist

### **Before Deployment**
- [ ] AWS credentials configured and tested
- [ ] GitHub secrets added to repository
- [ ] ECR repositories exist and accessible
- [ ] Aurora database accessible with credentials
- [ ] ECS cluster and services exist

### **Secret Validation**
- [ ] AWS_ACCESS_KEY_ID format correct (AKIA...)
- [ ] AWS_SECRET_ACCESS_KEY format correct (40 chars)
- [ ] AURORA_DB_PASSWORD connects to database
- [ ] SECRET_KEY is sufficiently random (32+ chars)
- [ ] All secrets added to GitHub repository

### **Post-Deployment**
- [ ] Application connects to Aurora database
- [ ] ECS tasks start successfully
- [ ] Load balancer health checks pass
- [ ] API endpoints respond correctly

---

## 🚨 Emergency Access

### **If You Lose Access**
1. **AWS Console**: Use root account to create new IAM user
2. **Database**: Use Aurora console to reset webapp password
3. **GitHub**: Repository settings → Secrets → Update values
4. **ECS**: Use console to update task definitions manually

### **Recovery Commands**
```bash
# Reset ECS service to use new secrets
aws ecs update-service --cluster testdriven-production-cluster --service testdriven-users-production-service --force-new-deployment

# Update task definition with new secrets
aws ecs register-task-definition --cli-input-json file://ecs/ecs_users_prod_taskdefinition.json
```

---

*Keep this document secure and never commit it with real secret values.*
