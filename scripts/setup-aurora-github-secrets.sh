#!/bin/bash

# Professional GitHub Actions Secrets Setup for Aurora PostgreSQL
# Sets up all required secrets for CI/CD pipeline with Aurora integration

set -euo pipefail

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

# Check if GitHub CLI is installed
check_github_cli() {
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) is not installed"
        print_status "Install it from: https://cli.github.com/"
        exit 1
    fi
    
    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        print_error "GitHub CLI is not authenticated"
        print_status "Run: gh auth login"
        exit 1
    fi
    
    print_success "GitHub CLI is ready"
}

# Get repository information
get_repo_info() {
    REPO_OWNER=$(gh repo view --json owner --jq '.owner.login')
    REPO_NAME=$(gh repo view --json name --jq '.name')
    
    print_status "Repository: $REPO_OWNER/$REPO_NAME"
}

# Set up AWS secrets
setup_aws_secrets() {
    print_header "AWS Configuration Secrets"
    
    print_status "Setting up AWS credentials and configuration..."
    
    # AWS Account ID
    read -p "Enter AWS Account ID (e.g., 068561046929): " AWS_ACCOUNT_ID
    gh secret set AWS_ACCOUNT_ID --body "$AWS_ACCOUNT_ID"
    print_success "AWS_ACCOUNT_ID set"
    
    # AWS Access Key ID
    read -p "Enter AWS Access Key ID: " AWS_ACCESS_KEY_ID
    gh secret set AWS_ACCESS_KEY_ID --body "$AWS_ACCESS_KEY_ID"
    print_success "AWS_ACCESS_KEY_ID set"
    
    # AWS Secret Access Key
    read -s -p "Enter AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
    echo ""
    gh secret set AWS_SECRET_ACCESS_KEY --body "$AWS_SECRET_ACCESS_KEY"
    print_success "AWS_SECRET_ACCESS_KEY set"
    
    # AWS Region
    AWS_REGION="${AWS_REGION:-us-east-1}"
    read -p "Enter AWS Region [$AWS_REGION]: " input_region
    AWS_REGION="${input_region:-$AWS_REGION}"
    gh secret set AWS_REGION --body "$AWS_REGION"
    print_success "AWS_REGION set to $AWS_REGION"
}

# Set up Aurora secrets
setup_aurora_secrets() {
    print_header "Aurora PostgreSQL Secrets"
    
    print_status "Setting up Aurora database credentials..."
    
    # Aurora DB Password
    read -s -p "Enter Aurora Database Password: " AURORA_DB_PASSWORD
    echo ""
    gh secret set AURORA_DB_PASSWORD --body "$AURORA_DB_PASSWORD"
    print_success "AURORA_DB_PASSWORD set"
    
    # Aurora Cluster Endpoint (auto-detected)
    AURORA_CLUSTER_ENDPOINT="testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com"
    gh secret set AURORA_CLUSTER_ENDPOINT --body "$AURORA_CLUSTER_ENDPOINT"
    print_success "AURORA_CLUSTER_ENDPOINT set"
    
    # Aurora Reader Endpoint (auto-detected)
    AURORA_READER_ENDPOINT="testdriven-production-aurora.cluster-ro-copao2ykcikc.us-east-1.rds.amazonaws.com"
    gh secret set AURORA_READER_ENDPOINT --body "$AURORA_READER_ENDPOINT"
    print_success "AURORA_READER_ENDPOINT set"
}

# Set up application secrets
setup_application_secrets() {
    print_header "Application Secrets"
    
    print_status "Setting up application-specific secrets..."
    
    # Production Secret Key
    read -s -p "Enter Production Secret Key (or press Enter to generate): " PRODUCTION_SECRET_KEY
    echo ""
    if [[ -z "$PRODUCTION_SECRET_KEY" ]]; then
        PRODUCTION_SECRET_KEY=$(openssl rand -hex 32)
        print_status "Generated production secret key"
    fi
    gh secret set PRODUCTION_SECRET_KEY --body "$PRODUCTION_SECRET_KEY"
    print_success "PRODUCTION_SECRET_KEY set"
    
    # Staging Secret Key
    read -s -p "Enter Staging Secret Key (or press Enter to generate): " STAGING_SECRET_KEY
    echo ""
    if [[ -z "$STAGING_SECRET_KEY" ]]; then
        STAGING_SECRET_KEY=$(openssl rand -hex 32)
        print_status "Generated staging secret key"
    fi
    gh secret set STAGING_SECRET_KEY --body "$STAGING_SECRET_KEY"
    print_success "STAGING_SECRET_KEY set"
}

# Create environment-specific database URLs
create_database_urls() {
    print_header "Database URL Configuration"
    
    print_status "Creating environment-specific database URLs..."
    
    # Production Database URL
    PROD_DB_URL="postgresql://webapp:\${AURORA_DB_PASSWORD}@testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com:5432/users_production"
    gh secret set PRODUCTION_DATABASE_URL --body "$PROD_DB_URL"
    print_success "PRODUCTION_DATABASE_URL set"
    
    # Staging Database URL
    STAGING_DB_URL="postgresql://webapp:\${AURORA_DB_PASSWORD}@testdriven-production-aurora.cluster-copao2ykcikc.us-east-1.rds.amazonaws.com:5432/users_staging"
    gh secret set STAGING_DATABASE_URL --body "$STAGING_DB_URL"
    print_success "STAGING_DATABASE_URL set"
}

# Verify secrets
verify_secrets() {
    print_header "Verifying Secrets"
    
    print_status "Listing all repository secrets..."
    
    # Get list of secrets
    secrets=$(gh secret list --json name --jq '.[].name')
    
    required_secrets=(
        "AWS_ACCOUNT_ID"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_REGION"
        "AURORA_DB_PASSWORD"
        "AURORA_CLUSTER_ENDPOINT"
        "AURORA_READER_ENDPOINT"
        "PRODUCTION_SECRET_KEY"
        "STAGING_SECRET_KEY"
        "PRODUCTION_DATABASE_URL"
        "STAGING_DATABASE_URL"
    )
    
    missing_secrets=()
    
    for secret in "${required_secrets[@]}"; do
        if echo "$secrets" | grep -q "^$secret$"; then
            print_success "$secret is set"
        else
            print_error "$secret is missing"
            missing_secrets+=("$secret")
        fi
    done
    
    if [[ ${#missing_secrets[@]} -eq 0 ]]; then
        print_success "All required secrets are configured!"
        return 0
    else
        print_error "Missing secrets: ${missing_secrets[*]}"
        return 1
    fi
}

# Display summary
display_summary() {
    print_header "Setup Summary"
    
    echo "🎉 GitHub Actions secrets have been configured successfully!"
    echo ""
    echo "📋 Configured Secrets:"
    echo "  • AWS Configuration (Account ID, Credentials, Region)"
    echo "  • Aurora PostgreSQL (Password, Endpoints)"
    echo "  • Application Secrets (Production & Staging Keys)"
    echo "  • Database URLs (Production & Staging)"
    echo ""
    echo "🚀 Next Steps:"
    echo "  1. Commit and push your Aurora integration code"
    echo "  2. GitHub Actions will automatically deploy using Aurora"
    echo "  3. Monitor deployment in the Actions tab"
    echo ""
    echo "🔗 Useful Links:"
    echo "  • Repository: https://github.com/$REPO_OWNER/$REPO_NAME"
    echo "  • Actions: https://github.com/$REPO_OWNER/$REPO_NAME/actions"
    echo "  • Secrets: https://github.com/$REPO_OWNER/$REPO_NAME/settings/secrets/actions"
    echo ""
    echo "⚠️  Security Notes:"
    echo "  • Secrets are encrypted and only visible to GitHub Actions"
    echo "  • Rotate secrets regularly for security"
    echo "  • Monitor AWS CloudTrail for access patterns"
}

# Main execution
main() {
    echo "🔐 GitHub Actions Secrets Setup for Aurora PostgreSQL"
    echo "===================================================="
    echo ""
    
    # Pre-flight checks
    check_github_cli
    get_repo_info
    
    # Setup process
    setup_aws_secrets
    setup_aurora_secrets
    setup_application_secrets
    create_database_urls
    
    # Verification
    if verify_secrets; then
        display_summary
        exit 0
    else
        print_error "Secret verification failed. Please check and re-run."
        exit 1
    fi
}

# Run main function
main "$@"
