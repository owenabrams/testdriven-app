#!/bin/bash

# Test Login Flow - Debug authentication issue

echo "🔍 Testing Login Flow"
echo "===================="

# 1. Check if backend is running
echo "🔧 Checking backend status..."
if curl -s http://localhost:5000/users/ping > /dev/null; then
    echo "   ✅ Backend is running on port 5000"
else
    echo "   ❌ Backend not responding on port 5000"
    echo "   🔧 Check if Flask server is running"
    exit 1
fi

# 2. Test user creation/existence
echo ""
echo "👤 Testing user existence..."
response=$(curl -s -X GET http://localhost:5000/users)
if echo "$response" | grep -q "superadmin@testdriven.io"; then
    echo "   ✅ Super admin user exists"
else
    echo "   ⚠️  Super admin user may not exist"
    echo "   🔧 Response: $response"
fi

# 3. Test login endpoint
echo ""
echo "🔐 Testing login endpoint..."
login_response=$(curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@testdriven.io","password":"superpassword123"}')

echo "   📝 Login response: $login_response"

if echo "$login_response" | grep -q "success"; then
    echo "   ✅ Login endpoint working"
    
    # Extract token if present
    if echo "$login_response" | grep -q "auth_token"; then
        echo "   ✅ Auth token returned"
    else
        echo "   ⚠️  No auth token in response"
    fi
else
    echo "   ❌ Login endpoint failed"
fi

# 4. Test auth status endpoint
echo ""
echo "🔍 Testing auth status endpoint..."
status_response=$(curl -s -X GET http://localhost:5000/auth/status)
echo "   📝 Status response: $status_response"

# 5. Check React app API configuration
echo ""
echo "⚛️  Checking React API configuration..."
if grep -q "REACT_APP_USERS_SERVICE_URL" client/.env 2>/dev/null; then
    api_url=$(grep "REACT_APP_USERS_SERVICE_URL" client/.env | cut -d= -f2)
    echo "   📝 API URL configured: $api_url"
else
    echo "   ⚠️  No API URL configured in client/.env"
    echo "   🔧 React will use default: http://localhost:5000"
fi

# 6. Recommendations
echo ""
echo "🎯 TROUBLESHOOTING RECOMMENDATIONS:"
echo ""

if ! curl -s http://localhost:5000/users/ping > /dev/null; then
    echo "❌ BACKEND ISSUE:"
    echo "   1. Check if Flask server is running"
    echo "   2. Run: ./start-local.sh"
    echo "   3. Check Flask terminal for errors"
else
    echo "✅ Backend is working"
    
    if ! echo "$login_response" | grep -q "success"; then
        echo "❌ LOGIN ENDPOINT ISSUE:"
        echo "   1. Check if super admin user exists"
        echo "   2. Run: python services/users/seed_demo_data.py"
        echo "   3. Check Flask logs for authentication errors"
    else
        echo "✅ Login endpoint is working"
        echo ""
        echo "🔍 FRONTEND DEBUGGING:"
        echo "   1. Open browser developer tools (F12)"
        echo "   2. Go to Console tab"
        echo "   3. Try logging in and check for errors"
        echo "   4. Go to Network tab and check API calls"
        echo "   5. Check if auth token is being stored in localStorage"
        echo ""
        echo "🎯 Common issues:"
        echo "   - CORS errors (check Flask terminal)"
        echo "   - Network errors (check browser console)"
        echo "   - Token storage issues (check localStorage)"
        echo "   - React state not updating (check React DevTools)"
    fi
fi

echo ""
echo "📋 QUICK DEBUG STEPS:"
echo "   1. Open http://localhost:3000"
echo "   2. Open browser DevTools (F12)"
echo "   3. Try login with: superadmin@testdriven.io / superpassword123"
echo "   4. Check Console and Network tabs for errors"
echo "   5. Check Application > Local Storage for auth_token"