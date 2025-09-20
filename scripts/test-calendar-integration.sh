#!/bin/bash

# Calendar Integration Test Script
# Tests that all calendar functionality works after automated setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL=${1:-"http://localhost:5000"}
FRONTEND_URL=${2:-"http://localhost:3000"}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to get auth token
get_auth_token() {
    log_info "Getting authentication token..."
    
    # Try to login with test user
    TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "test@example.com", "password": "password123"}' | \
        jq -r '.auth_token // empty' 2>/dev/null || echo "")
    
    if [ -z "$TOKEN" ]; then
        # Try to register test user if login fails
        log_info "Creating test user..."
        curl -s -X POST "$API_URL/auth/register" \
            -H "Content-Type: application/json" \
            -d '{"username": "testuser", "email": "test@example.com", "password": "password123"}' > /dev/null
        
        # Try login again
        TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
            -H "Content-Type: application/json" \
            -d '{"email": "test@example.com", "password": "password123"}' | \
            jq -r '.auth_token // empty' 2>/dev/null || echo "")
    fi
    
    if [ -n "$TOKEN" ]; then
        log_success "Authentication token obtained"
        echo "$TOKEN"
    else
        log_error "Failed to get authentication token"
        return 1
    fi
}

# Function to test API endpoints
test_api_endpoints() {
    local token="$1"
    log_info "Testing API endpoints..."
    
    # Test filter options endpoint
    log_info "Testing filter options endpoint..."
    FILTER_RESPONSE=$(curl -s -H "Authorization: Bearer $token" "$API_URL/api/calendar/filter-options")
    
    if echo "$FILTER_RESPONSE" | jq -e '.groups' > /dev/null 2>&1; then
        GROUP_COUNT=$(echo "$FILTER_RESPONSE" | jq '.groups | length')
        log_success "Filter options working - found $GROUP_COUNT groups"
    else
        log_error "Filter options endpoint failed"
        return 1
    fi
    
    # Test calendar events endpoint
    log_info "Testing calendar events endpoint..."
    EVENTS_RESPONSE=$(curl -s -H "Authorization: Bearer $token" "$API_URL/calendar/events")
    
    if echo "$EVENTS_RESPONSE" | jq -e '.events' > /dev/null 2>&1; then
        EVENT_COUNT=$(echo "$EVENTS_RESPONSE" | jq '.events | length')
        log_success "Calendar events working - found $EVENT_COUNT events"
        
        if [ "$EVENT_COUNT" -gt 0 ]; then
            # Test event details endpoint
            EVENT_ID=$(echo "$EVENTS_RESPONSE" | jq -r '.events[0].id')
            log_info "Testing event details endpoint with event ID: $EVENT_ID..."
            
            DETAILS_RESPONSE=$(curl -s -H "Authorization: Bearer $token" "$API_URL/api/calendar/events/$EVENT_ID")
            
            if echo "$DETAILS_RESPONSE" | jq -e '.additional_details' > /dev/null 2>&1; then
                log_success "Event details working - drill-down data available"
            else
                log_error "Event details endpoint failed"
                return 1
            fi
        fi
    else
        log_error "Calendar events endpoint failed"
        return 1
    fi
}

# Function to test database data
test_database_data() {
    log_info "Testing database data..."
    
    # Test using Python script
    python3 -c "
import sys
sys.path.insert(0, 'services/users')

try:
    from project import create_app, db
    from project.api.models import SavingsGroup, GroupMember, GroupTransaction, CalendarEvent
    
    app, _ = create_app()
    with app.app_context():
        groups = SavingsGroup.query.count()
        members = GroupMember.query.count()
        transactions = GroupTransaction.query.count()
        events = CalendarEvent.query.count()
        
        print(f'📊 Database Data Summary:')
        print(f'   - Savings Groups: {groups}')
        print(f'   - Group Members: {members}')
        print(f'   - Transactions: {transactions}')
        print(f'   - Calendar Events: {events}')
        
        if groups >= 3 and members >= 12 and events >= 5:
            print('✅ Database data validation PASSED')
            sys.exit(0)
        else:
            print('❌ Database data validation FAILED - insufficient data')
            sys.exit(1)
except Exception as e:
    print(f'❌ Database test failed: {e}')
    sys.exit(1)
" && log_success "Database data validation passed" || {
        log_error "Database data validation failed"
        return 1
    }
}

# Function to test frontend accessibility
test_frontend() {
    log_info "Testing frontend accessibility..."
    
    # Test if frontend is accessible
    if curl -s -f "$FRONTEND_URL" > /dev/null; then
        log_success "Frontend is accessible"
        
        # Test calendar page specifically
        if curl -s -f "$FRONTEND_URL/savings-groups/calendar" > /dev/null; then
            log_success "Calendar page is accessible"
        else
            log_warning "Calendar page may not be accessible (this might be normal for SPA routing)"
        fi
    else
        log_error "Frontend is not accessible"
        return 1
    fi
}

# Function to run comprehensive test
run_comprehensive_test() {
    log_info "Running comprehensive calendar integration test..."
    
    # Get authentication token
    TOKEN=$(get_auth_token)
    if [ -z "$TOKEN" ]; then
        log_error "Cannot proceed without authentication token"
        return 1
    fi
    
    # Test database data
    if ! test_database_data; then
        log_error "Database data test failed"
        return 1
    fi
    
    # Test API endpoints
    if ! test_api_endpoints "$TOKEN"; then
        log_error "API endpoints test failed"
        return 1
    fi
    
    # Test frontend
    if ! test_frontend; then
        log_error "Frontend test failed"
        return 1
    fi
    
    log_success "🎉 All calendar integration tests PASSED!"
    return 0
}

# Main execution
main() {
    echo "🧪 Calendar Integration Test Suite"
    echo "API URL: $API_URL"
    echo "Frontend URL: $FRONTEND_URL"
    echo "=================================="
    
    if run_comprehensive_test; then
        echo ""
        log_success "✅ Calendar integration is working correctly!"
        echo ""
        echo "📋 Verified functionality:"
        echo "  ✅ Database schema and data"
        echo "  ✅ Calendar events generation"
        echo "  ✅ Filter options API"
        echo "  ✅ Event details drill-down"
        echo "  ✅ Frontend accessibility"
        echo ""
        echo "🌐 Ready for production use!"
        exit 0
    else
        echo ""
        log_error "❌ Calendar integration test failed!"
        echo ""
        echo "🔧 Troubleshooting steps:"
        echo "  1. Check if all services are running"
        echo "  2. Verify database connection"
        echo "  3. Run setup scripts manually:"
        echo "     - python services/users/scripts/ensure_database_schema.py"
        echo "     - python services/users/scripts/ensure_calendar_data.py"
        echo "  4. Check application logs"
        exit 1
    fi
}

# Help function
show_help() {
    echo "Calendar Integration Test Script"
    echo ""
    echo "Usage: $0 [API_URL] [FRONTEND_URL]"
    echo ""
    echo "Arguments:"
    echo "  API_URL      - Backend API URL (default: http://localhost:5000)"
    echo "  FRONTEND_URL - Frontend URL (default: http://localhost:3000)"
    echo ""
    echo "Examples:"
    echo "  $0                                                    # Test local development"
    echo "  $0 http://api.example.com http://app.example.com     # Test production"
    echo "  $0 http://localhost:5000 http://localhost:3000       # Test local explicitly"
}

# Parse arguments
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

# Check dependencies
if ! command -v curl >/dev/null 2>&1; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    log_error "jq is required but not installed"
    exit 1
fi

# Run main function
main
