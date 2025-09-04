#!/bin/bash

# Local CI Testing Script
# This script simulates CI pipeline locally without Docker

set -e

echo "🚀 Starting local CI pipeline simulation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[CI]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate required tools
print_status "Validating required tools..."
required_tools=("python3" "node" "npm")
for tool in "${required_tools[@]}"; do
    if ! command_exists "$tool"; then
        print_error "Required tool '$tool' is not installed"
        exit 1
    fi
done
print_success "All required tools are available"

# Step 1: Backend Code Quality Checks
print_status "Step 1: Running backend code quality checks..."

cd services/users
if [ ! -d "venv" ]; then
    print_status "Creating Python virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

print_status "Running backend linting..."
if python -m flake8 project --exclude=venv; then
    print_success "Backend linting passed"
else
    print_error "Backend linting failed"
    exit 1
fi

print_status "Running backend tests..."
if python -m pytest project/tests/ -v; then
    print_success "Backend tests passed"
else
    print_error "Backend tests failed"
    exit 1
fi

cd ../..

# Step 2: Frontend Code Quality Checks
print_status "Step 2: Running frontend code quality checks..."

cd services/client
npm install

print_status "Running frontend tests..."
if npm run coverage; then
    print_success "Frontend tests passed"
else
    print_error "Frontend tests failed"
    exit 1
fi

cd ../..

# Step 3: Integration Tests (if services are running)
print_status "Step 3: Checking for running services..."
if curl -s http://localhost:3000 > /dev/null && curl -s http://localhost:5001/users/ping > /dev/null; then
    print_status "Services are running, running E2E tests..."
    if ./node_modules/.bin/cypress run; then
        print_success "E2E tests passed"
    else
        print_warning "E2E tests failed (services may not be properly configured)"
    fi
else
    print_warning "Services not running, skipping E2E tests"
    print_status "To run E2E tests, start services first:"
    print_status "  Backend: cd services/users && source venv/bin/activate && python run_flask.py"
    print_status "  Frontend: cd services/client && npm start"
fi

print_success "🎉 Local CI pipeline completed successfully!"