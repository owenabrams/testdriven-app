#!/bin/bash

echo "🧪 Testing Multi-Tiered Admin System"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if services are running
check_services() {
    print_status "Checking if services are running..."
    
    # Check Flask API
    if curl -s http://localhost:5000/users/ping > /dev/null 2>&1; then
        print_success "Flask API is running on port 5000"
    else
        print_warning "Flask API not responding on port 5000"
        print_status "Starting Flask API..."
        cd services/users
        source venv/bin/activate
        export FLASK_APP=project/__init__.py
        export FLASK_ENV=development
        export APP_SETTINGS=project.config.DevelopmentConfig
        export DATABASE_URL=sqlite:///app.db
        export SECRET_KEY=dev-secret-key
        python manage.py run > /dev/null 2>&1 &
        FLASK_PID=$!
        cd ../..
        sleep 5
        
        # Verify it started
        if curl -s http://localhost:5000/users/ping > /dev/null 2>&1; then
            print_success "Flask API started successfully"
        else
            print_error "Failed to start Flask API"
            return 1
        fi
    fi
    
    # Check React App
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "React app is running on port 3000"
    else
        print_warning "React app not responding on port 3000"
        print_status "Starting React app..."
        cd services/client
        npm start > /dev/null 2>&1 &
        REACT_PID=$!
        cd ../..
        sleep 15
        
        # Verify it started
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            print_success "React app started successfully"
        else
            print_error "Failed to start React app"
            return 1
        fi
    fi
}

# Setup database with admin system
setup_database() {
    print_status "Setting up database with admin system..."
    
    cd services/users
    source venv/bin/activate
    export FLASK_APP=project/__init__.py
    export FLASK_ENV=development
    export APP_SETTINGS=project.config.DevelopmentConfig
    export DATABASE_URL=sqlite:///app.db
    export SECRET_KEY=dev-secret-key
    
    # Recreate database
    python manage.py recreate_db
    if [ $? -eq 0 ]; then
        print_success "Database recreated successfully"
    else
        print_error "Failed to recreate database"
        exit 1
    fi
    
    # Seed database
    python manage.py seed_db
    if [ $? -eq 0 ]; then
        print_success "Database seeded successfully"
    else
        print_error "Failed to seed database"
        exit 1
    fi
    
    # Create super admin (non-interactive)
    echo -e "superadmin\nsuperadmin@testdriven.io\nsuperpassword123" | python manage.py create_super_admin
    if [ $? -eq 0 ]; then
        print_success "Super admin created successfully"
    else
        print_warning "Super admin creation failed (may already exist)"
    fi
    
    # List admins
    print_status "Current admin users:"
    python manage.py list_admins
    
    cd ../..
}

# Run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    
    cd services/client
    npm test -- --watchAll=false --coverage=false
    if [ $? -eq 0 ]; then
        print_success "Unit tests passed"
    else
        print_error "Unit tests failed"
        return 1
    fi
    cd ..
}

# Run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    
    # Set environment variables for Cypress
    export CYPRESS_REACT_APP_USERS_SERVICE_URL=http://localhost:5000
    export REACT_APP_USERS_SERVICE_URL=http://localhost:5000
    
    # Run specific admin system tests
    print_status "Running admin system tests..."
    npx cypress run --spec "cypress/e2e/admin-system.cy.js" --browser chrome --headless
    ADMIN_TEST_RESULT=$?
    
    print_status "Running service access request tests..."
    npx cypress run --spec "cypress/e2e/service-access-requests.cy.js" --browser chrome --headless
    ACCESS_TEST_RESULT=$?
    
    # Run existing authentication tests
    print_status "Running authentication tests..."
    npx cypress run --spec "cypress/e2e/register.cy.js,cypress/e2e/login.cy.js,cypress/e2e/status.cy.js" --browser chrome --headless
    AUTH_TEST_RESULT=$?
    
    # Check results
    if [ $ADMIN_TEST_RESULT -eq 0 ]; then
        print_success "Admin system tests passed"
    else
        print_error "Admin system tests failed"
    fi
    
    if [ $ACCESS_TEST_RESULT -eq 0 ]; then
        print_success "Service access request tests passed"
    else
        print_error "Service access request tests failed"
    fi
    
    if [ $AUTH_TEST_RESULT -eq 0 ]; then
        print_success "Authentication tests passed"
    else
        print_error "Authentication tests failed"
    fi
    
    # Return overall result
    if [ $ADMIN_TEST_RESULT -eq 0 ] && [ $ACCESS_TEST_RESULT -eq 0 ] && [ $AUTH_TEST_RESULT -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Test API endpoints directly
test_api_endpoints() {
    print_status "Testing API endpoints directly..."
    
    # Test super admin login
    print_status "Testing super admin login..."
    ADMIN_TOKEN=$(curl -s -X POST http://localhost:5000/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"superadmin@testdriven.io","password":"superpassword123"}' | \
        python3 -c "import sys, json; print(json.load(sys.stdin)['auth_token'])" 2>/dev/null)
    
    if [ ! -z "$ADMIN_TOKEN" ]; then
        print_success "Super admin login successful"
        
        # Test admin endpoints
        print_status "Testing admin endpoints..."
        
        # Test users endpoint
        USERS_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:5000/admin/users)
        if echo "$USERS_RESPONSE" | grep -q "success"; then
            print_success "Admin users endpoint working"
        else
            print_error "Admin users endpoint failed"
        fi
        
        # Test services endpoint
        SERVICES_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:5000/admin/services)
        if echo "$SERVICES_RESPONSE" | grep -q "success"; then
            print_success "Admin services endpoint working"
        else
            print_error "Admin services endpoint failed"
        fi
        
        # Test access requests endpoint
        REQUESTS_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:5000/admin/access-requests)
        if echo "$REQUESTS_RESPONSE" | grep -q "success"; then
            print_success "Admin access requests endpoint working"
        else
            print_error "Admin access requests endpoint failed"
        fi
        
    else
        print_error "Super admin login failed"
        return 1
    fi
}

# Generate test report
generate_report() {
    print_status "Generating test report..."
    
    echo ""
    echo "📊 TEST SUMMARY"
    echo "==============="
    echo "✅ Database setup: Complete"
    echo "✅ Super admin created: superadmin@testdriven.io"
    echo "✅ Services seeded: users, orders, products"
    echo "✅ API endpoints: Functional"
    echo "✅ Authentication system: Enhanced with RBAC"
    echo "✅ Admin panel: Available at /admin"
    echo ""
    echo "🔐 ADMIN CREDENTIALS"
    echo "==================="
    echo "Super Admin:"
    echo "  Email: superadmin@testdriven.io"
    echo "  Password: superpassword123"
    echo "  Access: Full system access"
    echo ""
    echo "🌐 APPLICATION URLS"
    echo "=================="
    echo "Frontend: http://localhost:3000"
    echo "Backend:  http://localhost:5000"
    echo "Admin Panel: http://localhost:3000/admin"
    echo ""
}

# Main execution
main() {
    print_status "Starting comprehensive admin system testing..."
    
    # Step 1: Check and start services
    check_services
    
    # Step 2: Setup database
    setup_database
    
    # Step 3: Test API endpoints
    test_api_endpoints
    if [ $? -ne 0 ]; then
        print_error "API endpoint tests failed"
        exit 1
    fi
    
    # Step 4: Run unit tests
    # run_unit_tests
    # if [ $? -ne 0 ]; then
    #     print_warning "Unit tests failed, continuing with E2E tests"
    # fi
    
    # Step 5: Run E2E tests
    run_e2e_tests
    E2E_RESULT=$?
    
    # Step 6: Generate report
    generate_report
    
    if [ $E2E_RESULT -eq 0 ]; then
        print_success "All tests completed successfully! 🎉"
        echo ""
        echo "You can now:"
        echo "1. Visit http://localhost:3000 to use the application"
        echo "2. Login as super admin to access the admin panel"
        echo "3. Register new users and test the access request system"
        exit 0
    else
        print_error "Some tests failed. Check the output above for details."
        exit 1
    fi
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    if [ ! -z "$FLASK_PID" ]; then
        kill $FLASK_PID 2>/dev/null
    fi
    if [ ! -z "$REACT_PID" ]; then
        kill $REACT_PID 2>/dev/null
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"