#!/bin/bash

# Test script for notifications microservice
# Runs only notification-related tests without affecting core system

echo "🔔 Testing Notifications Microservice..."

# Start services if needed
./start-services.sh

# Run only notification tests
./node_modules/.bin/cypress run --spec "cypress/e2e/notifications-service.cy.js"

# Optional: Run integration tests with existing features
./node_modules/.bin/cypress run --spec "cypress/e2e/auth.cy.js,cypress/e2e/notifications-service.cy.js"

echo "✅ Notifications tests completed"