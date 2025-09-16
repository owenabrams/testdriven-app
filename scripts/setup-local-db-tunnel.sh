#!/bin/bash

# 💻 Local PostgreSQL Tunnel Setup for Testing
# This script helps you use your local PostgreSQL database for production testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}💻 Local PostgreSQL Tunnel Setup${NC}"
echo "=================================="

# Function to check if PostgreSQL is running locally
check_local_postgres() {
    echo -e "${YELLOW}🔍 Checking local PostgreSQL...${NC}"
    
    if ! command -v psql >/dev/null 2>&1; then
        echo -e "${RED}❌ PostgreSQL not found locally${NC}"
        echo "Please install PostgreSQL first"
        exit 1
    fi
    
    # Try to connect to local PostgreSQL
    if psql -h localhost -U postgres -d postgres -c "SELECT version();" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Local PostgreSQL is running${NC}"
    else
        echo -e "${RED}❌ Cannot connect to local PostgreSQL${NC}"
        echo "Please start PostgreSQL service"
        exit 1
    fi
}

# Function to check if ngrok is installed
check_ngrok() {
    echo -e "${YELLOW}🔍 Checking ngrok...${NC}"
    
    if ! command -v ngrok >/dev/null 2>&1; then
        echo -e "${RED}❌ ngrok not found${NC}"
        echo ""
        echo "Install ngrok:"
        echo "1. Go to: https://ngrok.com/"
        echo "2. Sign up for free account"
        echo "3. Download and install ngrok"
        echo "4. Run: ngrok authtoken YOUR_TOKEN"
        exit 1
    fi
    
    echo -e "${GREEN}✅ ngrok is installed${NC}"
}

# Function to create test database
create_test_database() {
    echo -e "${YELLOW}🗃️ Creating test database...${NC}"
    
    # Create database if it doesn't exist
    psql -h localhost -U postgres -c "CREATE DATABASE users_production;" 2>/dev/null || true
    
    # Create user if it doesn't exist
    psql -h localhost -U postgres -c "CREATE USER webapp WITH PASSWORD 'testpassword';" 2>/dev/null || true
    psql -h localhost -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE users_production TO webapp;" 2>/dev/null || true
    
    echo -e "${GREEN}✅ Test database ready${NC}"
}

# Function to start ngrok tunnel
start_tunnel() {
    echo -e "${YELLOW}🌐 Starting ngrok tunnel...${NC}"
    echo "This will create a public URL for your local PostgreSQL"
    echo ""
    echo -e "${RED}⚠️ WARNING: This exposes your local database to the internet${NC}"
    echo -e "${RED}   Only use for testing! Never for production data!${NC}"
    echo ""
    read -p "Continue? (y/n): " confirm
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
    
    echo ""
    echo -e "${BLUE}Starting ngrok tunnel on port 5432...${NC}"
    echo "Press Ctrl+C to stop the tunnel"
    echo ""
    
    # Start ngrok and capture the URL
    ngrok tcp 5432 &
    NGROK_PID=$!
    
    # Wait a moment for ngrok to start
    sleep 3
    
    # Get the public URL
    NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || echo "")
    
    if [ -n "$NGROK_URL" ]; then
        # Extract host and port
        NGROK_HOST=$(echo "$NGROK_URL" | sed 's/tcp:\/\///' | cut -d':' -f1)
        NGROK_PORT=$(echo "$NGROK_URL" | sed 's/tcp:\/\///' | cut -d':' -f2)
        
        CONNECTION_STRING="postgresql://webapp:testpassword@${NGROK_HOST}:${NGROK_PORT}/users_production"
        
        echo -e "${GREEN}🎉 Tunnel active!${NC}"
        echo "=================================="
        echo ""
        echo -e "${BLUE}📋 Add this to GitHub Actions secrets:${NC}"
        echo "Secret Name: AWS_RDS_URI"
        echo "Secret Value: $CONNECTION_STRING"
        echo ""
        echo -e "${BLUE}🔗 GitHub Secrets: https://github.com/owenabrams/testdriven-app/settings/secrets/actions${NC}"
        echo ""
        echo -e "${YELLOW}Keep this terminal open while testing...${NC}"
        
        # Wait for user to stop
        wait $NGROK_PID
    else
        echo -e "${RED}❌ Failed to get ngrok URL${NC}"
        kill $NGROK_PID 2>/dev/null || true
        exit 1
    fi
}

# Function to show alternative options
show_alternatives() {
    echo ""
    echo -e "${BLUE}🆓 Better alternatives for testing:${NC}"
    echo "===================================="
    echo ""
    echo "1. 🌟 Supabase (Recommended)"
    echo "   - FREE 500MB database"
    echo "   - Real-time features built-in"
    echo "   - Go to: https://supabase.com/"
    echo ""
    echo "2. 🐘 ElephantSQL"
    echo "   - FREE 20MB database"
    echo "   - No credit card required"
    echo "   - Go to: https://www.elephantsql.com/"
    echo ""
    echo "3. 🚂 Railway"
    echo "   - $5 free credit monthly"
    echo "   - Easy PostgreSQL setup"
    echo "   - Go to: https://railway.app/"
    echo ""
    echo -e "${YELLOW}💡 These are safer and easier than local tunneling!${NC}"
}

# Main execution
main() {
    show_alternatives
    echo ""
    echo -e "${YELLOW}Do you still want to use local PostgreSQL with ngrok? (y/n)${NC}"
    read -p "Use local setup: " use_local
    
    if [[ ! "$use_local" =~ ^[Yy]$ ]]; then
        echo ""
        echo -e "${GREEN}✅ Great choice! Use one of the free cloud options above.${NC}"
        exit 0
    fi
    
    check_local_postgres
    check_ngrok
    create_test_database
    start_tunnel
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    kill $NGROK_PID 2>/dev/null || true
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Run the main function
main "$@"
