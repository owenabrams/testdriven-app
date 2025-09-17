#!/bin/bash

# Aurora Password Setup Script
# This script helps set up the Aurora database password for GitHub Actions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo "=============================================="
    echo "🔐 $1"
    echo "=============================================="
}

# Check if Aurora cluster exists
check_aurora_cluster() {
    print_status "Checking Aurora cluster status..."
    
    CLUSTER_STATUS=$(aws rds describe-db-clusters \
        --db-cluster-identifier testdriven-production-aurora \
        --query 'DBClusters[0].Status' \
        --output text 2>/dev/null || echo "NOT_FOUND")
    
    if [ "$CLUSTER_STATUS" = "NOT_FOUND" ]; then
        print_error "Aurora cluster 'testdriven-production-aurora' not found"
        echo "Please run: ./scripts/setup-aurora-serverless.sh"
        exit 1
    fi
    
    if [ "$CLUSTER_STATUS" != "available" ]; then
        print_warning "Aurora cluster status: $CLUSTER_STATUS"
        print_status "Waiting for cluster to become available..."
    else
        print_success "Aurora cluster is available"
    fi
}

# Reset Aurora password
reset_aurora_password() {
    print_header "Reset Aurora Database Password"
    
    # Generate new secure password
    NEW_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    print_status "Generating new secure password..."
    print_status "Updating Aurora cluster password..."
    
    aws rds modify-db-cluster \
        --db-cluster-identifier testdriven-production-aurora \
        --master-user-password "$NEW_PASSWORD" \
        --apply-immediately
    
    if [ $? -eq 0 ]; then
        print_success "Password updated successfully!"
        echo ""
        print_status "New password: $NEW_PASSWORD"
        print_warning "Please save this password securely!"
        echo ""
        
        # Save to temporary file
        echo "$NEW_PASSWORD" > /tmp/aurora_password.txt
        print_status "Password saved to /tmp/aurora_password.txt"
        
        return 0
    else
        print_error "Failed to update password"
        return 1
    fi
}

# Show current connection info
show_connection_info() {
    print_header "Aurora Connection Information"
    
    ENDPOINT=$(aws rds describe-db-clusters \
        --db-cluster-identifier testdriven-production-aurora \
        --query 'DBClusters[0].Endpoint' \
        --output text)
    
    READER_ENDPOINT=$(aws rds describe-db-clusters \
        --db-cluster-identifier testdriven-production-aurora \
        --query 'DBClusters[0].ReaderEndpoint' \
        --output text)
    
    print_success "Aurora Cluster Information:"
    echo "===================================="
    echo "📍 Write Endpoint: $ENDPOINT"
    echo "📖 Reader Endpoint: $READER_ENDPOINT"
    echo "🔌 Port: 5432"
    echo "🗃️ Database: users_production"
    echo "👤 Username: webapp"
    echo ""
    
    if [ -f "/tmp/aurora_password.txt" ]; then
        PASSWORD=$(cat /tmp/aurora_password.txt)
        echo "🔐 Password: ${PASSWORD:0:5}***"
        echo ""
        echo -e "${BLUE}🔗 Connection String:${NC}"
        echo "postgresql://webapp:$PASSWORD@$ENDPOINT:5432/users_production"
    else
        echo "🔐 Password: [Use existing password or reset]"
    fi
}

# Main menu
main() {
    print_header "Aurora Password Setup"
    
    check_aurora_cluster
    
    echo ""
    echo "What would you like to do?"
    echo "1) Reset Aurora database password"
    echo "2) Show connection information"
    echo "3) Exit"
    echo ""
    
    read -p "Enter your choice (1-3): " choice
    
    case $choice in
        1)
            reset_aurora_password
            show_connection_info
            echo ""
            print_status "Next steps:"
            echo "1. Copy the password above"
            echo "2. Go to GitHub repository settings > Secrets and variables > Actions"
            echo "3. Update or create these secrets:"
            echo "   - AWS_RDS_URI: postgresql://webapp:PASSWORD@$ENDPOINT:5432/users_production"
            echo "   - AURORA_DB_PASSWORD: PASSWORD"
            ;;
        2)
            show_connection_info
            ;;
        3)
            print_status "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
