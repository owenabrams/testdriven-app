# Production Secrets Setup Guide

This guide explains how to set up the required GitHub repository secrets for automated production deployment.

## 🔐 **Required GitHub Secrets**

Your automated production deployment requires these secrets to be set in your GitHub repository:

### **1. AWS_RDS_URI**
The complete PostgreSQL connection string for your production RDS instance.

**Format:**
```
postgresql://webapp:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/users_production
```

**How to get it:**
```bash
# Get RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier testdriven-production \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text

# Format: postgresql://webapp:PASSWORD@ENDPOINT:5432/users_production
```

### **2. PRODUCTION_SECRET_KEY**
A secure secret key for Flask application security.

**How to generate:**
```python
import binascii
import os
print(binascii.hexlify(os.urandom(24)).decode())
```

**Example output:**
```
958185f1b6ec1290d5aec4eb4dc77e67846ce85cdb7a212a
```

## 🛠️ **Setting Up GitHub Secrets**

### **Step 1: Navigate to Repository Settings**
1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**

### **Step 2: Add Required Secrets**
Click **New repository secret** for each:

#### **AWS_RDS_URI**
- **Name**: `AWS_RDS_URI`
- **Value**: `postgresql://webapp:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/users_production`

#### **PRODUCTION_SECRET_KEY**
- **Name**: `PRODUCTION_SECRET_KEY`
- **Value**: `958185f1b6ec1290d5aec4eb4dc77e67846ce85cdb7a212a` (use your generated key)

### **Step 3: Verify Existing Secrets**
Make sure these secrets are also set (should already exist):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `LOAD_BALANCER_PROD_DNS_NAME`

## 🚀 **Deployment Process**

### **Automated Deployment Trigger**
Once secrets are set, deployment happens automatically:

1. **Push to production branch**
2. **GitHub Actions runs**
3. **Tests pass**
4. **Images built and pushed to ECR**
5. **ECS services automatically updated**

### **Manual Deployment (if needed)**
```bash
# Set environment variables
export AWS_RDS_URI="postgresql://webapp:PASSWORD@ENDPOINT:5432/users_production"
export PRODUCTION_SECRET_KEY="your-secret-key"

# Run deployment
./scripts/deploy-ecs-production-automated.sh
```

## 🔍 **Verification**

### **Check Secrets Are Set**
In your GitHub repository:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Verify all required secrets are listed
3. Secrets will show as "Updated X days ago" but values are hidden

### **Test Deployment**
1. Make a small change to your code
2. Commit and push to production branch
3. Check GitHub Actions workflow
4. Verify ECS services are updated

## 🚨 **Security Best Practices**

### **Secret Management**
- ✅ **Never commit secrets** to code
- ✅ **Use strong passwords** for RDS (12+ characters, mixed case, numbers, symbols)
- ✅ **Rotate secrets regularly** (every 90 days)
- ✅ **Use different secrets** for staging and production

### **RDS Security**
- ✅ **Private access only** (no public IP)
- ✅ **VPC security groups** restrict access
- ✅ **Encryption at rest** enabled
- ✅ **Strong database passwords**

### **GitHub Security**
- ✅ **Repository secrets** are encrypted
- ✅ **Limited access** to repository settings
- ✅ **Audit logs** track secret usage
- ✅ **Branch protection** on production branch

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **Missing Secrets Error**
```
❌ Missing required secrets: AWS_RDS_URI and PRODUCTION_SECRET_KEY
```
**Solution**: Add the missing secrets in GitHub repository settings

#### **Invalid RDS URI**
```
❌ Database connection failed
```
**Solution**: Verify RDS endpoint and credentials in AWS_RDS_URI

#### **Service Update Failed**
```
❌ Error updating service
```
**Solution**: Check ECS service exists and task definition is valid

### **Debugging Commands**
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier testdriven-production

# Check ECS services
aws ecs describe-services --cluster testdriven-production-cluster --services testdriven-users-production-service

# Check task definitions
aws ecs describe-task-definition --task-definition testdriven-users-production-td
```

## 📋 **Deployment Checklist**

Before setting up automated deployment:

- [ ] **RDS deployed** and accessible
- [ ] **ALB deployed** with target groups
- [ ] **ECS cluster** created with services
- [ ] **GitHub secrets** configured
- [ ] **CloudWatch log groups** created:
  - `testdriven-client-prod`
  - `testdriven-users-prod`

## 🎯 **Next Steps**

1. **Set up secrets** following this guide
2. **Test deployment** with a small change
3. **Monitor logs** in CloudWatch
4. **Set up alerts** for deployment failures
5. **Document rollback** procedures

Your automated production deployment will provide:
- ✅ **Zero-downtime deployments**
- ✅ **Automatic rollback** on failure
- ✅ **Health checks** before traffic routing
- ✅ **Audit trail** of all deployments

Production automation is now ready! 🎉
