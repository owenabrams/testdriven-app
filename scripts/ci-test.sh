#!/bin/bash

# Local CI Testing Script
# This script simulates the GitHub Actions CI pipeline locally

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

# Step 1: Code Quality Checks
print_status "Step 1: Running code quality checks..."

print_status "Building services..."
docker-compose build users

print_status "Running linting..."
if docker-compose run --rm users python manage.py lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi

print_status "Checking code formatting..."
if docker-compose run --rm users python manage.py format-check; then
    print_success "Code formatting check passed"
else
    print_error "Code formatting check failed"
    exit 1
fi

# Step 2: Tests and Coverage
print_status "Step 2: Running tests and coverage..."

print_status "Starting services..."
docker-compose up -d --build

print_status "Waiting for services to be ready..."
sleep 15

print_status "Setting up database..."
docker-compose exec -T users python manage.py recreate_db

print_status "Running tests with coverage..."
if docker-compose exec -T users python manage.py cov; then
    print_success "Tests and coverage passed"
else
    print_error "Tests failed"
    docker-compose down
    exit 1
fi

# Step 3: Integration Tests (if on main branch simulation)
print_status "Step 3: Running integration tests..."

print_status "Testing service connectivity..."
if curl -f http://localhost/users/ping > /dev/null 2>&1; then
    print_success "Service connectivity test passed"
else
    print_error "Service connectivity test failed"
    docker-compose down
    exit 1
fi

print_status "Running integration tests..."
docker-compose exec -T users python manage.py recreate_db
if docker-compose exec -T users python manage.py test; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    docker-compose down
    exit 1
fi

# Cleanup
print_status "Cleaning up..."
docker-compose down

print_success "🎉 All CI checks passed! Ready to push to GitHub."
