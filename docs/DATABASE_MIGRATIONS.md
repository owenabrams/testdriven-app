# 🔄 Database Migrations: Consistent Schema Changes

## 🎯 **Migration Strategy Across Environments**

Your setup ensures **consistent database schema** across all environments:

```
Local Dev → Testing → Production
    ↓         ↓         ↓
Same SQL → Same SQL → Same SQL
```

## 🗃️ **Database Options Comparison**

| Option | Cost | Setup Time | Migration Support | Best For |
|--------|------|------------|-------------------|----------|
| **Aurora Serverless v2** | 🆓 12 months | 10 min | ✅ Full PostgreSQL | **🌟 RECOMMENDED** |
| **AWS RDS Free** | 🆓 12 months | 10 min | ✅ Full PostgreSQL | Traditional choice |
| **Supabase FREE** | 🆓 Forever | 2 min | ✅ Full PostgreSQL | Quick testing |
| **ElephantSQL** | 🆓 Forever | 2 min | ✅ Full PostgreSQL | Minimal needs |
| **Local + ngrok** | 🆓 | 5 min | ✅ Full PostgreSQL | Development only |

## 🌟 **Aurora Serverless v2 (RECOMMENDED)**

### **Why Aurora Serverless v2 is Perfect:**
- ✅ **FREE for 12 months** (750 hours/month = 24/7)
- ✅ **Auto-scaling**: Scales to 0.5 ACU when idle (~$0.06/hour)
- ✅ **PostgreSQL compatible** (same migrations work)
- ✅ **Perfect for testing**: Only pay when actively using
- ✅ **Production-ready**: Scales up instantly under load
- ✅ **Built-in high availability** and automated backups
- ✅ **Faster than traditional RDS** for variable workloads

### **Quick Setup:**
```bash
# Create FREE Aurora Serverless v2 PostgreSQL
./scripts/setup-aurora-serverless.sh

# Add connection string to GitHub Actions
# AWS_RDS_URI = postgresql://webapp:password@endpoint:5432/users_production
```

## 🆓 **AWS RDS Free Tier (Alternative)**

### **Why AWS RDS Free Tier is Good:**
- ✅ **FREE for 12 months** (750 hours/month = 24/7)
- ✅ **Real production PostgreSQL** (db.t3.micro)
- ✅ **20GB storage** (plenty for testing)
- ✅ **Same as production** - just smaller instance
- ✅ **Built-in backups** and monitoring
- ✅ **Native AWS integration** with your ECS
- ✅ **Full migration support**

### **Quick Setup:**
```bash
# Create FREE AWS RDS PostgreSQL
./scripts/setup-aws-rds-free.sh

# Add connection string to GitHub Actions
# AWS_RDS_URI = postgresql://webapp:password@endpoint:5432/users_production
```

## 🔄 **Migration Workflow**

### **1. Development (Local)**
```bash
# Create new migration
echo "ALTER TABLE users ADD COLUMN phone VARCHAR(20);" > database/migrations/002_add_user_phone.sql

# Test locally
./scripts/run-migrations.sh --environment local

# Verify changes
psql postgresql://postgres:password@localhost:5432/testdriven_dev -c "\d users"
```

### **2. Testing Environment**
```bash
# Push to main branch
git add database/migrations/002_add_user_phone.sql
git commit -m "Add phone field to users"
git push origin main

# Migrations run automatically during deployment
# Check logs: GitHub Actions → Deploy → Migration step
```

### **3. Production Environment**
```bash
# Merge to production
git checkout production
git merge main
git push origin production

# Migrations run automatically during deployment
# Same SQL, same process, zero differences!
```

## 📝 **Creating Migrations**

### **Migration File Format:**
```sql
-- database/migrations/XXX_description.sql

-- Always use IF NOT EXISTS for safety
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Create indexes safely
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Insert data safely
INSERT INTO settings (key, value) VALUES ('feature_flag', 'true') 
ON CONFLICT (key) DO NOTHING;

-- Update migration tracking
INSERT INTO schema_migrations (version) VALUES ('XXX_description') 
ON CONFLICT DO NOTHING;
```

### **Migration Best Practices:**
- ✅ **Use IF NOT EXISTS** for all DDL operations
- ✅ **Use ON CONFLICT DO NOTHING** for data inserts
- ✅ **Test locally first**
- ✅ **Make migrations reversible when possible**
- ✅ **Use descriptive names**: `003_add_savings_goals_table.sql`

## 🔧 **Migration Commands**

### **Check Migration Status:**
```bash
# Local
./scripts/run-migrations.sh --status --environment local

# Testing/Production
./scripts/run-migrations.sh --status --db-uri "$AWS_RDS_URI"
```

### **Run Migrations:**
```bash
# Local development
./scripts/run-migrations.sh --environment local

# Specific database
./scripts/run-migrations.sh --db-uri "postgresql://user:pass@host:5432/db"

# Dry run (see what would be applied)
./scripts/run-migrations.sh --dry-run --environment local
```

### **Manual Migration (if needed):**
```bash
# Connect directly to database
psql "$AWS_RDS_URI"

# Run specific migration
\i database/migrations/002_add_user_phone.sql
```

## 🚀 **Automatic Migration Integration**

### **Deployment Pipeline:**
```yaml
# Your current GitHub Actions workflow
Deploy → Parse Database URI → Run Migrations → Deploy ECS Services
```

### **Migration Logs:**
```
🔄 Running database migrations...
🔍 Testing database connection...
✅ Database connection successful
📋 Creating migration table...
✅ Migration table ready
📊 Migration Status
==================
✅ Applied Migrations:
  • 001_initial_schema
⏳ Pending Migrations:
  • 002_add_user_phone
📝 Applying: 002_add_user_phone
✅ Applied: 002_add_user_phone
🎉 All migrations applied successfully!
```

## 🏗️ **Schema Evolution Example**

### **Version 1: Initial Schema**
```sql
-- database/migrations/001_initial_schema.sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **Version 2: Add User Profile**
```sql
-- database/migrations/002_add_user_profile.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
```

### **Version 3: Add Real-time Features**
```sql
-- database/migrations/003_add_savings_groups.sql
CREATE TABLE IF NOT EXISTS savings_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(12, 2),
    current_amount DECIMAL(12, 2) DEFAULT 0.00,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Real-time trigger for amount updates
CREATE OR REPLACE FUNCTION notify_group_update()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('group_update', json_build_object(
        'group_id', NEW.id,
        'current_amount', NEW.current_amount
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER group_amount_notify
    AFTER UPDATE OF current_amount ON savings_groups
    FOR EACH ROW EXECUTE FUNCTION notify_group_update();
```

## 🔄 **Environment Consistency**

### **Same PostgreSQL Version:**
- **Local**: PostgreSQL 15.4
- **Testing**: PostgreSQL 15.4 (AWS RDS/Supabase)
- **Production**: PostgreSQL 15.4 (AWS RDS)

### **Same Migration Process:**
- **Same SQL files** across all environments
- **Same migration runner** script
- **Same validation** and error handling
- **Same rollback** capabilities (when implemented)

## 💰 **Cost-Effective Scaling**

### **Migration Path:**
```
Development (Local) → Testing (AWS RDS Free) → Production (AWS RDS Paid)
        $0                    $0                      $15-25/month
```

### **When to Upgrade:**
- **Stay on free tier** as long as possible
- **Upgrade when** you hit 20GB storage limit
- **Production features** like Multi-AZ, larger instances

## 🎯 **Real-time Features Ready**

Your migration system supports:
- ✅ **Database triggers** for real-time updates
- ✅ **PostgreSQL NOTIFY/LISTEN** for WebSocket integration
- ✅ **JSON columns** for flexible data
- ✅ **UUID primary keys** for distributed systems
- ✅ **Timestamp tracking** for audit trails

## 🚀 **Next Steps**

### **Immediate:**
1. **Set up AWS RDS Free**: `./scripts/setup-aws-rds-free.sh`
2. **Add to GitHub Actions**: AWS_RDS_URI secret
3. **Test deployment**: Push any change
4. **Verify migrations**: Check deployment logs

### **Development:**
1. **Create migrations** for your real-time features
2. **Test locally** before pushing
3. **Use consistent** PostgreSQL across all environments
4. **Build real-time** features with confidence

Your database migration system is now **production-ready** and supports smooth CI/CD from development to production! 🎉
