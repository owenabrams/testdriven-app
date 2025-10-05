# 🔄 AWS Deployment Replication Guide

## 📋 Overview
This guide provides step-by-step instructions to replicate your successful AWS deployment using the exact configuration that's currently working.

## 🎯 Your Working Configuration

### **Production Environment (VERIFIED WORKING)**
- **URL**: http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com
- **AWS Account**: 068561046929
- **Region**: us-east-1
- **Status**: ✅ Fully operational

## 🚀 Quick Replication Steps

### **Step 1: Verify Prerequisites**
```bash
# Check AWS CLI access
aws sts get-caller-identity

# Expected output should show Account: "068561046929"
# If not, configure AWS CLI with your credentials:
aws configure
```

### **Step 2: Set Up GitHub Secrets**
Navigate to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets (get values from your AWS account):
```yaml
AWS_ACCESS_KEY_ID: "AKIA..." # Your AWS access key
AWS_SECRET_ACCESS_KEY: "wJalr..." # Your AWS secret key  
AWS_ACCOUNT_ID: "068561046929"
AURORA_DB_PASSWORD: "your-database-password"
PRODUCTION_SECRET_KEY: "your-flask-secret-key"
STAGING_SECRET_KEY: "your-staging-secret-key"
```

### **Step 3: Deploy Using Proven Method**
```bash
# Make scripts executable
chmod +x scripts/deploy-manual.sh

# Deploy everything (recommended)
./scripts/deploy-manual.sh

# Or deploy specific services
./scripts/deploy-manual.sh frontend
./scripts/deploy-manual.sh backend
```

### **Step 4: Verify Deployment**
```bash
# Check application health
curl http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com/ping

# Check API functionality
curl http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com/users

# Check frontend
curl -I http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com
```

## 🔧 Detailed Configuration

### **AWS Resources (Already Created)**
Your deployment uses these existing AWS resources:

```yaml
# ECS Cluster & Services
Cluster: testdriven-production-cluster
Frontend Service: testdriven-client-production-service  
Backend Service: testdriven-users-production-service

# Load Balancer
ALB: testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com
Frontend Target Group: testdriven-frontend-tg
Backend Target Group: testdriven-backend-tg

# Container Registry
ECR: 068561046929.dkr.ecr.us-east-1.amazonaws.com
Frontend Repo: testdriven-frontend-production
Backend Repo: testdriven-backend-production

# Database
Aurora Cluster: testdriven-production-aurora
Writer: testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com
Reader: testdriven-production-aurora.cluster-ro-copao2ykcikc.us-east-1.rds.amazonaws.com
```

### **Environment Configuration**
Your `config/environments/production.env` contains:

```bash
# Application URLs
REACT_APP_API_URL=http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com
ALB_URL=http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=068561046929

# ECS Configuration
ECS_CLUSTER=testdriven-production-cluster
FRONTEND_SERVICE=testdriven-client-production-service
BACKEND_SERVICE=testdriven-users-production-service

# ECR Configuration
ECR_REGISTRY=068561046929.dkr.ecr.us-east-1.amazonaws.com
```

## 🔐 Secret Configuration

### **Database Connection**
Your Aurora PostgreSQL setup:
```yaml
Host: testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com
Port: 5432
Database: users_production
Username: webapp
Password: [AURORA_DB_PASSWORD secret]
```

### **Application Secrets**
```yaml
Flask Secret Key: [PRODUCTION_SECRET_KEY secret]
Database URL: postgresql://webapp:[PASSWORD]@[HOST]:5432/users_production
```

## 🚀 Deployment Methods

### **Method 1: Manual Deployment (Recommended)**
This is your most reliable deployment method:

```bash
# Full deployment
./scripts/deploy-manual.sh

# Frontend only (most common updates)
./scripts/deploy-manual.sh frontend

# Backend only
./scripts/deploy-manual.sh backend

# With health verification
./scripts/deploy-manual.sh --verify frontend
```

### **Method 2: GitHub Actions (Automated)**
Push to branches triggers automatic deployment:

```bash
# Production deployment
git push origin production

# Staging deployment  
git push origin staging
```

### **Method 3: Aurora-Specific Deployment**
For database-related deployments:

```bash
./scripts/deploy-ecs-production-aurora.sh
```

## 🧪 Testing & Verification

### **Health Check Commands**
```bash
# Application ping
curl http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com/ping
# Expected: {"message": "pong!"}

# Users API
curl http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com/users
# Expected: JSON array of users

# Frontend health
curl -I http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com
# Expected: HTTP/1.1 200 OK
```

### **AWS Service Status**
```bash
# ECS service health
aws ecs describe-services --cluster testdriven-production-cluster --services testdriven-client-production-service --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'

# Task status
aws ecs list-tasks --cluster testdriven-production-cluster --service-name testdriven-users-production-service
```

### **Database Connectivity**
```bash
# Test database connection (if psql installed)
psql "postgresql://webapp:YOUR_PASSWORD@testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com:5432/users_production" -c "SELECT version();"
```

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow**
Your `.github/workflows/main.yml` handles:
- ✅ Automated testing
- ✅ Docker image building
- ✅ ECR push
- ✅ ECS deployment
- ✅ Health verification

### **Deployment Triggers**
```yaml
Production: Push to 'production' branch
Staging: Push to 'staging' branch  
Manual: GitHub Actions workflow dispatch
```

## 🛠️ Troubleshooting

### **Common Issues & Solutions**

**1. AWS Authentication Failed**
```bash
# Solution: Configure AWS CLI
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```

**2. ECR Login Failed**
```bash
# Solution: Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 068561046929.dkr.ecr.us-east-1.amazonaws.com
```

**3. ECS Service Not Starting**
```bash
# Solution: Check service events
aws ecs describe-services --cluster testdriven-production-cluster --services testdriven-users-production-service --query 'services[0].events'
```

**4. Database Connection Failed**
```bash
# Solution: Verify Aurora password in GitHub secrets
# Check security groups allow port 5432
# Verify database is in available state
```

### **Emergency Recovery**
```bash
# Force new deployment
aws ecs update-service --cluster testdriven-production-cluster --service testdriven-users-production-service --force-new-deployment

# Rollback to previous task definition
aws ecs update-service --cluster testdriven-production-cluster --service testdriven-users-production-service --task-definition testdriven-users-production-td:PREVIOUS_REVISION
```

## 📊 Monitoring & Logs

### **CloudWatch Logs**
```bash
# Backend application logs
aws logs tail testdriven-users-prod --follow

# Frontend logs
aws logs tail testdriven-client-prod --follow
```

### **ECS Monitoring**
```bash
# Service metrics
aws ecs describe-services --cluster testdriven-production-cluster --services testdriven-users-production-service

# Task details
aws ecs describe-tasks --cluster testdriven-production-cluster --tasks $(aws ecs list-tasks --cluster testdriven-production-cluster --service-name testdriven-users-production-service --query 'taskArns[0]' --output text)
```

## ✅ Success Checklist

### **Deployment Complete When:**
- [ ] ALB health checks return HTTP 200
- [ ] ECS services show "RUNNING" status
- [ ] Application responds at production URL
- [ ] Database connections successful
- [ ] API endpoints return expected data
- [ ] Frontend loads without errors

### **Verification URLs:**
- [ ] Main app: http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com
- [ ] API ping: http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com/ping
- [ ] Users API: http://testdriven-production-alb-1003393901.us-east-1.elb.amazonaws.com/users

## 🎯 Next Steps

### **After Successful Deployment:**
1. **Monitor**: Watch CloudWatch logs for any errors
2. **Test**: Verify all application functionality
3. **Document**: Update any configuration changes
4. **Backup**: Ensure database backups are configured
5. **Scale**: Adjust ECS service desired count if needed

### **Ongoing Maintenance:**
- Regular security updates
- Database maintenance windows
- Cost optimization reviews
- Performance monitoring
- Backup verification

---

## 📞 Support Resources

### **Key Documentation:**
- `AWS_DEPLOYMENT_INDEX.md` - Complete configuration index
- `AWS_SECRETS_REFERENCE.md` - Secrets and credentials guide
- `AURORA_DEPLOYMENT_GUIDE.md` - Database-specific setup
- `QUICK_DEPLOYMENT_REFERENCE.md` - Quick command reference

### **Deployment Scripts:**
- `scripts/deploy-manual.sh` - Primary deployment script
- `scripts/deploy-ecs-production-aurora.sh` - Aurora deployment
- `scripts/verify-deployment-health.sh` - Health verification

---

*This guide is based on your working production deployment as of 2025-10-05. Follow these exact steps to replicate your successful AWS setup.*
