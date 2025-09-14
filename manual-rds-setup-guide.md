# Manual RDS Setup Guide

Since your AWS user has limited CloudFormation permissions, here's how to set up RDS manually through the AWS Console.

## 🗃️ **Step-by-Step RDS Creation**

### **Step 1: Access RDS Console**
1. Go to: https://console.aws.amazon.com/rds/
2. Make sure you're in the **us-east-1** region (top right)
3. Click **"Create database"**

### **Step 2: Database Configuration**

#### **Engine Options**
- **Engine type**: PostgreSQL
- **Version**: PostgreSQL 15.4 (or latest available)
- **Template**: **Free tier** (IMPORTANT: Choose this to avoid $30/month cost)

#### **Settings**
- **DB instance identifier**: `testdriven-production`
- **Master username**: `webapp`
- **Master password**: `72UWZ5Ez0tbtUqtB`
- **Confirm password**: `72UWZ5Ez0tbtUqtB`

#### **Instance Configuration**
- **DB instance class**: `db.t2.micro` (Free Tier - $0/month for 12 months)
- **Storage type**: General Purpose SSD (gp2)
- **Allocated storage**: 20 GB (Free Tier includes 20GB)
- **Enable storage autoscaling**: No (to avoid unexpected costs)

#### **Connectivity**
- **Virtual Private Cloud (VPC)**: Default VPC
- **Subnet group**: default
- **Public access**: **No** (important for security)
- **VPC security group**: Create new
  - **Name**: `testdriven-production-rds-sg`
- **Availability Zone**: No preference
- **Database port**: 5432

#### **Database Authentication**
- **Database authentication**: Password authentication

#### **Additional Configuration**
- **Initial database name**: `users_production`
- **DB parameter group**: default.postgres15 (or latest)
- **Backup retention period**: 7 days
- **Backup window**: 03:00-04:00 UTC
- **Maintenance window**: Sun 04:00-05:00 UTC
- **Enable Enhanced monitoring**: Yes (60 seconds)
- **Enable Performance Insights**: Yes (7 days retention)

### **Step 3: Create Database**
1. **Review all settings**
2. **Click "Create database"**
3. **Wait 5-10 minutes** for status to change to "Available"

### **Step 4: Get Database Information**
Once the database is "Available":
1. **Click on the database name** (`testdriven-production`)
2. **Copy the Endpoint** (under Connectivity & security)
   - Example: `testdriven-production.xyz.us-east-1.rds.amazonaws.com`
3. **Note the Port**: Should be 5432

## 🔐 **Your Production Secrets**

Once RDS is ready, you'll have:

### **PRODUCTION_SECRET_KEY**
```
c88ff1752e1b99f5e36c3dae0ee858799b1a3be7e7abfdef
```

### **AWS_RDS_URI** (replace YOUR_ENDPOINT with actual endpoint)
```
postgresql://webapp:72UWZ5Ez0tbtUqtB@YOUR_ENDPOINT:5432/users_production
```

**Example with real endpoint:**
```
postgresql://webapp:72UWZ5Ez0tbtUqtB@testdriven-production.xyz.us-east-1.rds.amazonaws.com:5432/users_production
```

## 📝 **Adding to GitHub Secrets**

1. **Go to your GitHub repository**
2. **Settings → Secrets and variables → Actions**
3. **Add these secrets:**

**Secret 1:**
- Name: `PRODUCTION_SECRET_KEY`
- Value: `c88ff1752e1b99f5e36c3dae0ee858799b1a3be7e7abfdef`

**Secret 2:**
- Name: `AWS_RDS_URI`
- Value: `postgresql://webapp:72UWZ5Ez0tbtUqtB@YOUR_ACTUAL_ENDPOINT:5432/users_production`

## 🧪 **Testing Your RDS Setup**

Once RDS is ready, test the connection:

```bash
# Test with our helper script
./get-production-secrets.sh 72UWZ5Ez0tbtUqtB
```

## 🚨 **Security Notes**

- ✅ **Private Access**: RDS has no public IP (secure)
- ✅ **Strong Password**: 16 characters with mixed case and numbers
- ✅ **Encrypted Storage**: AWS encrypts data at rest
- ✅ **VPC Security**: Only accessible from within your VPC

## 🔧 **Troubleshooting**

### **If RDS Creation Fails:**
- Check you have sufficient permissions
- Verify you're in us-east-1 region
- Ensure VPC has available subnets

### **If Connection Fails:**
- Verify security group allows connections from ECS
- Check endpoint is correct
- Confirm password matches

## 📋 **Next Steps After RDS is Ready**

1. **Get the endpoint** from AWS Console
2. **Create the AWS_RDS_URI** with your endpoint
3. **Add both secrets** to GitHub
4. **Test automated deployment**: `git push origin production`

Your RDS database will be production-ready with automated backups, monitoring, and high availability! 🎉
