# RDS (Amazon Relational Database Service) Setup Guide

This guide implements RDS PostgreSQL for production, following the TestDriven tutorial while adapting for your GitHub Actions setup.

## 🎯 Why RDS Instead of Containerized PostgreSQL?

### Benefits of RDS:
- ✅ **Managed Service**: AWS handles backups, updates, monitoring
- ✅ **High Availability**: Multi-AZ deployments, automated failover
- ✅ **Security**: VPC isolation, encryption at rest and in transit
- ✅ **Scalability**: Easy to scale compute and storage
- ✅ **Cost Effective**: No need for ALB registration or public IPs
- ✅ **Data Integrity**: Automated backups, point-in-time recovery

### Problems with Containerized Databases:
- ❌ **Data Loss Risk**: Container crashes can lose data
- ❌ **Complexity**: Need ALB registration, public IPs, Route 53
- ❌ **Maintenance Overhead**: Manual updates, backups, monitoring
- ❌ **Cost**: Additional ALB costs, larger EC2 instances

## 🏗️ RDS Architecture

```
ECS Services → VPC Security Group → RDS PostgreSQL
                                    ├── Automated Backups
                                    ├── Performance Insights
                                    ├── Enhanced Monitoring
                                    └── Encryption
```

## 🚀 Quick Setup

### Prerequisites
1. **ALB must be deployed first:**
   ```bash
   ./scripts/deploy-alb.sh production
   ```

### Deploy RDS
```bash
./scripts/deploy-rds.sh production YourSecurePassword123!
```

This creates:
- ✅ PostgreSQL 15.4 database (db.t3.micro)
- ✅ VPC security group (only accessible from ALB security group)
- ✅ DB subnet group across multiple AZs
- ✅ Automated backups (7 days retention)
- ✅ Enhanced monitoring and Performance Insights
- ✅ Encryption at rest

## 📋 What Gets Created

### RDS Instance
- **Instance ID**: `testdriven-production`
- **Engine**: PostgreSQL 15.4
- **Instance Class**: db.t3.micro (Free Tier eligible)
- **Storage**: 20GB GP2 SSD, encrypted
- **Database**: `users_production`
- **Username**: `webapp`

### Security & Networking
- **VPC**: Uses your default VPC
- **Subnets**: DB subnet group across multiple AZs
- **Security Group**: Only allows access from ALB security group
- **Public Access**: Disabled (private only)

### Monitoring & Backup
- **Backups**: 7 days retention, 3-4 AM backup window
- **Maintenance**: Sunday 4-5 AM maintenance window
- **Monitoring**: Enhanced monitoring every 60 seconds
- **Performance Insights**: 7 days retention

## 🔗 Database Connection

### Connection String Format
```
postgresql://webapp:PASSWORD@ENDPOINT:5432/users_production
```

### Get Connection Details
```bash
# Get RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier testdriven-production \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text

# Check status
aws rds describe-db-instances \
  --db-instance-identifier testdriven-production \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text
```

## 🔐 Connecting to RDS

Since RDS is private (no public access), you need to connect through an EC2 instance:

### Method 1: SSH Tunnel (Recommended)
```bash
# Get connection info
./scripts/connect-rds.sh production

# Create SSH tunnel
ssh -i ~/.ssh/testdriven-production-key.pem -L 5432:RDS_ENDPOINT:5432 ec2-user@EC2_PUBLIC_IP

# Connect locally
psql postgresql://webapp:PASSWORD@localhost:5432/users_production
```

### Method 2: Direct SSH + psql
```bash
# SSH into EC2 instance
ssh -i ~/.ssh/testdriven-production-key.pem ec2-user@EC2_PUBLIC_IP

# Install PostgreSQL client
sudo yum install -y postgresql

# Connect to RDS
psql -h RDS_ENDPOINT -U webapp -d users_production
```

### Method 3: Docker on EC2
```bash
# SSH into EC2 instance
ssh -i ~/.ssh/testdriven-production-key.pem ec2-user@EC2_PUBLIC_IP

# Use PostgreSQL Docker container
docker run -it --rm postgres:15 psql -h RDS_ENDPOINT -U webapp -d users_production
```

## 🚀 Production Deployment with RDS

### Deploy Production ECS with RDS
```bash
./scripts/deploy-ecs-production.sh DB_PASSWORD SECRET_KEY
```

This will:
1. Get RDS endpoint from CloudFormation
2. Create task definitions with RDS connection
3. Deploy ECS services without PostgreSQL container
4. Use RDS for all database operations

### Key Changes for Production
- ✅ **No PostgreSQL container** in task definitions
- ✅ **RDS endpoint** in DATABASE_URL environment variable
- ✅ **Increased memory** for backend (512MB vs 300MB)
- ✅ **Production secrets** for database password and app secret key

## 🧪 Testing RDS Integration

### Test Database Connection
```bash
# Test from ECS container
aws ecs execute-command \
  --cluster testdriven-production-cluster \
  --task TASK_ARN \
  --container users \
  --interactive \
  --command "python -c 'from project import db; print(db.engine.url)'"
```

### Run Migrations
```bash
# SSH into EC2 instance
ssh -i ~/.ssh/testdriven-production-key.pem ec2-user@EC2_PUBLIC_IP

# Find users container
docker ps | grep users

# Run migrations
docker exec -it CONTAINER_ID python manage.py recreate_db
docker exec -it CONTAINER_ID python manage.py seed_db
```

## 📊 Monitoring RDS

### CloudWatch Metrics
- CPU Utilization
- Database Connections
- Read/Write IOPS
- Free Storage Space

### Performance Insights
- Top SQL statements
- Wait events
- Database load

### Enhanced Monitoring
- OS-level metrics
- Process list
- Resource utilization

## 🚨 Troubleshooting

### Common Issues

1. **Connection Timeout**
   - Check security group allows traffic from ALB security group
   - Verify RDS is in same VPC as ECS cluster
   - Ensure database is in "available" status

2. **Authentication Failed**
   - Verify username is "webapp"
   - Check password is correct
   - Ensure database name is "users_production"

3. **DNS Resolution**
   - RDS endpoint should resolve from within VPC
   - Check VPC DNS settings are enabled

### Useful Commands
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier testdriven-production

# View RDS logs
aws rds describe-db-log-files --db-instance-identifier testdriven-production
aws rds download-db-log-file-portion --db-instance-identifier testdriven-production --log-file-name error/postgresql.log

# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx
```

## 💰 Cost Optimization

### Free Tier Eligible
- db.t3.micro instance (750 hours/month free)
- 20GB storage (20GB free)
- Backup storage equal to database size

### Cost Monitoring
- Enable billing alerts
- Monitor RDS usage in Cost Explorer
- Consider Reserved Instances for long-term use

## 🔒 Security Best Practices

- ✅ **Private Access**: No public IP assigned
- ✅ **VPC Security Groups**: Restrictive access rules
- ✅ **Encryption**: At rest and in transit
- ✅ **Strong Passwords**: Complex database passwords
- ✅ **Regular Updates**: Automated minor version updates
- ✅ **Backup Encryption**: Encrypted automated backups

## 🚀 Next Steps

1. **Deploy RDS**: `./scripts/deploy-rds.sh production PASSWORD`
2. **Update ECS**: Deploy production services with RDS integration
3. **Run Migrations**: Initialize database schema
4. **Test Application**: Verify all endpoints work with RDS
5. **Monitor**: Set up CloudWatch alarms and notifications

RDS provides a production-ready, managed database solution that's perfect for your TestDriven application! 🎉
