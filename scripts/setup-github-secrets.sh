#!/bin/bash

# 🔐 GitHub Actions Secrets Setup Helper
# This script helps you set up the required secrets for your TestDriven app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 GitHub Actions Secrets Setup Helper${NC}"
echo "========================================"

# Function to validate PostgreSQL connection string
validate_connection_string() {
    local conn_string="$1"
    
    if [[ ! "$conn_string" =~ ^postgresql://[^:]+:[^@]+@[^:]+:[0-9]+/[^/]+$ ]]; then
        echo -e "${RED}❌ Invalid connection string format${NC}"
        echo "Expected format: postgresql://username:password@host:port/database"
        echo "Example: postgresql://webapp:mypassword@mydb.amazonaws.com:5432/users_production"
        return 1
    fi
    
    # Extract components
    local endpoint=$(echo "$conn_string" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    
    if [[ "$endpoint" == "localhost" || "$endpoint" == "127.0.0.1" ]]; then
        echo -e "${RED}❌ Cannot use localhost in production${NC}"
        echo "Please use a real database service (AWS RDS, Supabase, etc.)"
        return 1
    fi
    
    echo -e "${GREEN}✅ Connection string format is valid${NC}"
    echo "   📍 Endpoint: $endpoint"
    return 0
}

# Function to show setup instructions
show_setup_instructions() {
    echo -e "${YELLOW}📋 Database Setup Options:${NC}"
    echo ""
    echo "1. 🚀 AWS RDS PostgreSQL (Recommended)"
    echo "   - Go to: https://console.aws.amazon.com/rds/"
    echo "   - Create PostgreSQL database"
    echo "   - Use: db.t3.micro (free tier)"
    echo ""
    echo "2. 🌐 Supabase (PostgreSQL as a Service)"
    echo "   - Go to: https://supabase.com/"
    echo "   - Create new project"
    echo "   - Get connection string from Settings → Database"
    echo ""
    echo "3. 🐘 ElephantSQL (PostgreSQL as a Service)"
    echo "   - Go to: https://www.elephantsql.com/"
    echo "   - Create free account"
    echo "   - Create new instance"
    echo ""
    echo "4. 🚂 Railway (PostgreSQL)"
    echo "   - Go to: https://railway.app/"
    echo "   - Create new project"
    echo "   - Add PostgreSQL service"
    echo ""
    echo -e "${BLUE}📖 Detailed instructions: docs/DATABASE_SETUP.md${NC}"
}

# Function to get connection string from user
get_connection_string() {
    echo ""
    echo -e "${YELLOW}🔗 Enter your PostgreSQL connection string:${NC}"
    echo "Format: postgresql://username:password@host:port/database"
    echo ""
    read -p "Connection string: " CONNECTION_STRING
    
    if [ -z "$CONNECTION_STRING" ]; then
        echo -e "${RED}❌ Connection string cannot be empty${NC}"
        return 1
    fi
    
    if ! validate_connection_string "$CONNECTION_STRING"; then
        return 1
    fi
    
    return 0
}

# Function to show GitHub setup instructions
show_github_instructions() {
    echo ""
    echo -e "${GREEN}🎯 Add this secret to GitHub Actions:${NC}"
    echo "========================================"
    echo ""
    echo -e "${BLUE}Secret Name:${NC} AWS_RDS_URI"
    echo -e "${BLUE}Secret Value:${NC} $CONNECTION_STRING"
    echo ""
    echo -e "${YELLOW}📝 Steps to add the secret:${NC}"
    echo "1. Go to your GitHub repository"
    echo "2. Click Settings → Secrets and variables → Actions"
    echo "3. Click 'New repository secret'"
    echo "4. Name: AWS_RDS_URI"
    echo "5. Value: (paste the connection string above)"
    echo "6. Click 'Add secret'"
    echo ""
    echo -e "${BLUE}🔗 Direct link: https://github.com/owenabrams/testdriven-app/settings/secrets/actions${NC}"
}

# Function to test connection (if psql is available)
test_connection() {
    if command -v psql >/dev/null 2>&1; then
        echo ""
        echo -e "${YELLOW}🧪 Would you like to test the connection? (y/n)${NC}"
        read -p "Test connection: " test_choice
        
        if [[ "$test_choice" =~ ^[Yy]$ ]]; then
            echo "Testing connection..."
            if psql "$CONNECTION_STRING" -c "SELECT version();" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Database connection successful!${NC}"
            else
                echo -e "${RED}❌ Database connection failed${NC}"
                echo "Please check your connection string and database configuration"
            fi
        fi
    fi
}

# Function to show next steps
show_next_steps() {
    echo ""
    echo -e "${GREEN}🚀 Next Steps:${NC}"
    echo "=============="
    echo "1. ✅ Add the AWS_RDS_URI secret to GitHub Actions (instructions above)"
    echo "2. 🔄 Trigger a new deployment (push to production branch)"
    echo "3. 📊 Watch the deployment logs for database connection success"
    echo "4. 🎉 Your app will be fully functional with real PostgreSQL!"
    echo ""
    echo -e "${BLUE}📋 Useful commands after deployment:${NC}"
    echo "   aws logs tail testdriven-users-prod --follow"
    echo "   aws ecs describe-services --cluster testdriven-production-cluster --services testdriven-users-production-service"
    echo ""
    echo -e "${YELLOW}💡 Pro tip: Your app now supports real-time data and will scale with your PostgreSQL database!${NC}"
}

# Main execution
main() {
    show_setup_instructions
    
    echo ""
    echo -e "${YELLOW}Do you already have a PostgreSQL database set up? (y/n)${NC}"
    read -p "Database ready: " db_ready
    
    if [[ ! "$db_ready" =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${BLUE}📖 Please set up a database first using the options above${NC}"
        echo -e "${BLUE}📋 See docs/DATABASE_SETUP.md for detailed instructions${NC}"
        exit 0
    fi
    
    if get_connection_string; then
        show_github_instructions
        test_connection
        show_next_steps
    else
        echo ""
        echo -e "${RED}❌ Setup incomplete. Please try again with a valid connection string.${NC}"
        exit 1
    fi
}

# Run the main function
main "$@"
