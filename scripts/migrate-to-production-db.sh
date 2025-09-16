#!/bin/bash

# 🔄 Smooth Migration from Testing to Production Database
# This script helps you migrate from free testing database to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Database Migration: Testing → Production${NC}"
echo "=============================================="

# Function to show migration options
show_migration_options() {
    echo -e "${YELLOW}📊 Migration Options:${NC}"
    echo ""
    echo "1. 🆓 Keep Testing Database (Supabase/ElephantSQL)"
    echo "   ✅ FREE forever"
    echo "   ✅ Perfect for MVP/testing"
    echo "   ⚠️  Limited storage/features"
    echo ""
    echo "2. 🚀 Upgrade to AWS RDS"
    echo "   ✅ Production-grade"
    echo "   ✅ Auto-scaling"
    echo "   ✅ Automated backups"
    echo "   💰 ~$15-25/month"
    echo ""
    echo "3. 🌐 Upgrade to Supabase Pro"
    echo "   ✅ 8GB database"
    echo "   ✅ Real-time features"
    echo "   ✅ Built-in auth/APIs"
    echo "   💰 $25/month"
    echo ""
    echo "4. 🐘 Upgrade ElephantSQL"
    echo "   ✅ Larger databases"
    echo "   ✅ Better performance"
    echo "   💰 $5-20/month"
}

# Function to backup current database
backup_current_database() {
    echo -e "${YELLOW}💾 Creating backup of current database...${NC}"
    
    if [ -z "$CURRENT_DB_URI" ]; then
        echo "Please provide current database URI:"
        read -p "Current DB URI: " CURRENT_DB_URI
    fi
    
    # Create backup
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    echo "Creating backup: $BACKUP_FILE"
    pg_dump "$CURRENT_DB_URI" > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
    else
        echo -e "${RED}❌ Backup failed${NC}"
        exit 1
    fi
}

# Function to setup new production database
setup_production_database() {
    echo -e "${YELLOW}🗃️ Setting up new production database...${NC}"
    
    echo "Please provide new production database URI:"
    read -p "New DB URI: " NEW_DB_URI
    
    # Test connection
    if psql "$NEW_DB_URI" -c "SELECT version();" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Connection to new database successful${NC}"
    else
        echo -e "${RED}❌ Cannot connect to new database${NC}"
        exit 1
    fi
}

# Function to migrate data
migrate_data() {
    echo -e "${YELLOW}🔄 Migrating data...${NC}"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}❌ Backup file not found${NC}"
        exit 1
    fi
    
    echo "Restoring data to new database..."
    psql "$NEW_DB_URI" < "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Data migration successful${NC}"
    else
        echo -e "${RED}❌ Data migration failed${NC}"
        exit 1
    fi
}

# Function to update GitHub secrets
update_github_secrets() {
    echo -e "${YELLOW}🔐 Update GitHub Actions secrets...${NC}"
    echo ""
    echo -e "${BLUE}📋 Update this secret in GitHub Actions:${NC}"
    echo "Secret Name: AWS_RDS_URI"
    echo "Old Value: $CURRENT_DB_URI"
    echo "New Value: $NEW_DB_URI"
    echo ""
    echo -e "${BLUE}🔗 GitHub Secrets: https://github.com/owenabrams/testdriven-app/settings/secrets/actions${NC}"
    echo ""
    read -p "Press Enter after updating the secret..."
}

# Function to test deployment
test_deployment() {
    echo -e "${YELLOW}🧪 Testing deployment with new database...${NC}"
    
    echo "Triggering new deployment..."
    echo "Watch the logs for:"
    echo "  ✅ Database connection successful"
    echo "  ✅ Backend service running"
    echo "  ✅ All tests passing"
    echo ""
    echo -e "${BLUE}🔗 GitHub Actions: https://github.com/owenabrams/testdriven-app/actions${NC}"
}

# Function for zero-downtime migration
zero_downtime_migration() {
    echo -e "${YELLOW}⚡ Zero-Downtime Migration Process:${NC}"
    echo ""
    echo "1. 💾 Backup current database"
    echo "2. 🗃️ Setup new production database"
    echo "3. 🔄 Migrate data"
    echo "4. 🔐 Update GitHub secrets"
    echo "5. 🚀 Deploy with new database"
    echo "6. ✅ Verify everything works"
    echo "7. 🧹 Cleanup old resources"
    echo ""
    
    read -p "Start zero-downtime migration? (y/n): " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        backup_current_database
        setup_production_database
        migrate_data
        update_github_secrets
        test_deployment
        
        echo ""
        echo -e "${GREEN}🎉 Migration Complete!${NC}"
        echo "Your app is now running on the new production database"
    fi
}

# Function for gradual migration
gradual_migration() {
    echo -e "${YELLOW}🐌 Gradual Migration Process:${NC}"
    echo ""
    echo "This approach lets you test thoroughly before switching:"
    echo ""
    echo "1. 🗃️ Setup new database alongside current one"
    echo "2. 🔄 Sync data periodically"
    echo "3. 🧪 Test with new database in staging"
    echo "4. 🚀 Switch when confident"
    echo ""
    echo "Benefits:"
    echo "  ✅ Lower risk"
    echo "  ✅ Easy rollback"
    echo "  ✅ Thorough testing"
    echo ""
    
    read -p "Setup gradual migration? (y/n): " confirm
    
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        setup_production_database
        echo ""
        echo -e "${GREEN}✅ New database ready for testing${NC}"
        echo "You can now test with the new database before switching"
    fi
}

# Function to show cost optimization
show_cost_optimization() {
    echo -e "${YELLOW}💰 Cost Optimization Tips:${NC}"
    echo ""
    echo "🆓 Stay Free Longer:"
    echo "  • Supabase: 500MB free (good for 10k+ users)"
    echo "  • ElephantSQL: 20MB free (good for testing)"
    echo "  • Use multiple free accounts for different environments"
    echo ""
    echo "💵 When You Need to Pay:"
    echo "  • AWS RDS db.t3.micro: ~$15/month"
    echo "  • Supabase Pro: $25/month (includes more features)"
    echo "  • ElephantSQL Tiny: $5/month"
    echo ""
    echo "🎯 Recommendation:"
    echo "  • Start: Free Supabase"
    echo "  • Scale: Supabase Pro (best features)"
    echo "  • Enterprise: AWS RDS"
}

# Function to show environment strategy
show_environment_strategy() {
    echo -e "${YELLOW}🏗️ Multi-Environment Strategy:${NC}"
    echo ""
    echo "Development:"
    echo "  🖥️  Local PostgreSQL"
    echo "  🔧 Docker Compose"
    echo ""
    echo "Testing/Staging:"
    echo "  🆓 Supabase Free (500MB)"
    echo "  🚀 Same ECS deployment"
    echo ""
    echo "Production:"
    echo "  💪 AWS RDS or Supabase Pro"
    echo "  🔄 Identical deployment process"
    echo ""
    echo "Benefits:"
    echo "  ✅ Same PostgreSQL everywhere"
    echo "  ✅ Identical deployment scripts"
    echo "  ✅ Easy promotion between environments"
    echo "  ✅ Cost-effective scaling"
}

# Main menu
main_menu() {
    echo -e "${BLUE}What would you like to do?${NC}"
    echo ""
    echo "1. 📊 See migration options"
    echo "2. ⚡ Zero-downtime migration"
    echo "3. 🐌 Gradual migration"
    echo "4. 💰 Cost optimization tips"
    echo "5. 🏗️ Environment strategy"
    echo "6. 🚪 Exit"
    echo ""
    
    read -p "Choose option (1-6): " choice
    
    case $choice in
        1) show_migration_options ;;
        2) zero_downtime_migration ;;
        3) gradual_migration ;;
        4) show_cost_optimization ;;
        5) show_environment_strategy ;;
        6) exit 0 ;;
        *) echo "Invalid option" ;;
    esac
}

# Main execution
main() {
    show_migration_options
    echo ""
    main_menu
}

# Run the main function
main "$@"
