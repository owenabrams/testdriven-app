#!/bin/bash

echo "🧪 Running Admin System E2E Tests"
echo "================================="

# Set environment variables
export CYPRESS_REACT_APP_USERS_SERVICE_URL=http://localhost:5000
export REACT_APP_USERS_SERVICE_URL=http://localhost:5000

# Check if services are running
echo "Checking services..."
if ! curl -s http://localhost:5000/ping > /dev/null 2>&1; then
    echo "❌ Flask API not running on port 5000"
    echo "Please start the Flask API first with: ./start-local.sh"
    exit 1
fi

if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ React app not running on port 3000"
    echo "Please start the React app first with: ./start-local.sh"
    exit 1
fi

echo "✅ Services are running"

# Run the admin system tests
echo ""
echo "Running admin system tests..."
npx cypress run --spec "cypress/e2e/admin-system.cy.js"

echo ""
echo "Running service access request tests..."
npx cypress run --spec "cypress/e2e/service-access-requests.cy.js"

echo ""
echo "Running existing authentication tests..."
npx cypress run --spec "cypress/e2e/register.cy.js,cypress/e2e/login.cy.js,cypress/e2e/status.cy.js"

echo ""
echo "✅ E2E tests completed!"
echo ""
echo "To run tests interactively:"
echo "npx cypress open"