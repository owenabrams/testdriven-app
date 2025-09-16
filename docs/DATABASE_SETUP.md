# 🗃️ PostgreSQL Database Setup for Production

This guide will help you set up a PostgreSQL database for your TestDriven application that matches your development environment.

## 🎯 **Why PostgreSQL?**

- ✅ **Same as Development**: Matches your local PostgreSQL setup
- ✅ **Real-time Data**: Perfect for your planned real-time features
- ✅ **Continuous Integration**: Easy migration from development to production
- ✅ **Scalable**: Handles high-traffic applications
- ✅ **ACID Compliance**: Reliable for financial/user data

## 🚀 **Option 1: AWS RDS PostgreSQL (Recommended)**

### Step 1: Create RDS PostgreSQL Database

1. **Go to AWS RDS Console**: https://console.aws.amazon.com/rds/
2. **Click "Create database"**
3. **Choose these settings**:
   - **Engine**: PostgreSQL
   - **Version**: PostgreSQL 15.4 (or latest)
   - **Template**: Free tier (for testing) or Production (for live)
   - **DB instance identifier**: `testdriven-production-postgres`
   - **Master username**: `webapp`
   - **Master password**: `TestDriven2024!SecureDB` (or generate secure one)
   - **DB instance class**: `db.t3.micro` (free tier) or `db.t3.small` (production)
   - **Storage**: 20 GB (can auto-scale)
   - **VPC**: Use default VPC
   - **Subnet group**: Create new or use default
   - **Public access**: No (more secure)
   - **VPC security groups**: Create new
   - **Database name**: `users_production`

4. **Click "Create database"**
5. **Wait 5-10 minutes** for database to be available

### Step 2: Configure Security Group

1. **Go to EC2 Console → Security Groups**
2. **Find your RDS security group** (usually named like `rds-launch-wizard-X`)
3. **Edit inbound rules**:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Custom → Select your ECS security group (or `sg-` from your ECS cluster)
   - **Description**: "PostgreSQL access from ECS"

### Step 3: Get Connection String

Once your database is available:
1. **Go to RDS Console**
2. **Click on your database**
3. **Copy the Endpoint** (looks like: `testdriven-production-postgres.xxxxx.us-east-1.rds.amazonaws.com`)
4. **Create connection string**:
   ```
   postgresql://webapp:TestDriven2024!SecureDB@YOUR_ENDPOINT:5432/users_production
   ```

## 🚀 **Option 2: Alternative Database Services**

### Supabase (PostgreSQL as a Service)
1. **Go to**: https://supabase.com/
2. **Create new project**
3. **Choose PostgreSQL**
4. **Get connection string from Settings → Database**

### ElephantSQL (PostgreSQL as a Service)
1. **Go to**: https://www.elephantsql.com/
2. **Create free account**
3. **Create new instance**
4. **Get connection URL**

### Railway (PostgreSQL)
1. **Go to**: https://railway.app/
2. **Create new project**
3. **Add PostgreSQL service**
4. **Get connection string**

## 🔐 **Step 4: Add to GitHub Actions**

1. **Go to your GitHub repository**
2. **Settings → Secrets and variables → Actions**
3. **Click "New repository secret"**
4. **Add secret**:
   - **Name**: `AWS_RDS_URI`
   - **Value**: Your full connection string (from Step 3 above)

## 🧪 **Step 5: Test the Connection**

After adding the secret, trigger a new deployment:

1. **Make a small change** to trigger GitHub Actions
2. **Watch the deployment logs**
3. **Look for**: `✅ Database connection successful!`
4. **Your backend should now start properly**

## 📊 **Database Schema**

Your application will automatically create these tables:
- `users` - User accounts and authentication
- `groups` - Savings groups (for your real-time features)
- `transactions` - Financial transactions
- `sessions` - User sessions

## 🔄 **Development to Production Migration**

Since both environments use PostgreSQL:

1. **Schema migrations** work identically
2. **SQL queries** are the same
3. **Database drivers** are identical
4. **Easy data migration** when needed

## 🚀 **Real-time Features Ready**

Your PostgreSQL setup supports:
- ✅ **WebSocket connections**
- ✅ **Real-time notifications**
- ✅ **Concurrent transactions**
- ✅ **ACID compliance**
- ✅ **Triggers and stored procedures**

## 🔧 **Connection String Format**

```
postgresql://[username]:[password]@[host]:[port]/[database]
```

**Example**:
```
postgresql://webapp:TestDriven2024!SecureDB@testdriven-production-postgres.c1234567890.us-east-1.rds.amazonaws.com:5432/users_production
```

## 🆘 **Troubleshooting**

### Backend Still Shows "localhost" Error?
- ✅ Check GitHub Actions secrets are set correctly
- ✅ Redeploy after adding the secret
- ✅ Verify connection string format

### Can't Connect to Database?
- ✅ Check security group allows port 5432
- ✅ Verify database is in "Available" status
- ✅ Check VPC and subnet configuration

### Need Help?
- 📧 Check CloudWatch logs for detailed error messages
- 🔍 Use AWS RDS console to test connectivity
- 📋 Verify all parameters in connection string

## 🎉 **Next Steps**

Once your database is connected:
1. **Your app will be fully functional**
2. **Real-time features will work**
3. **Data will persist between deployments**
4. **You can start building your enhanced features**

---

**🔗 Quick Links:**
- [AWS RDS Console](https://console.aws.amazon.com/rds/)
- [GitHub Actions Secrets](https://github.com/owenabrams/testdriven-app/settings/secrets/actions)
- [Your ECS Console](https://console.aws.amazon.com/ecs/)
