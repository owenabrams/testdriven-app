#!/bin/bash

fails=""

inspect() {
  if [ $1 -ne 0 ]; then
    fails="${fails} $2"
  fi
}

echo "🧪 Starting Test Suite"
echo "====================="

# Start the application
echo "🚀 Starting application..."
./start-local.sh &
APP_PID=$!

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Test backend health
echo "🔍 Testing backend health..."
curl -f http://localhost:5000/ping > /dev/null 2>&1
inspect $? backend-health

# Test frontend availability
echo "🔍 Testing frontend availability..."
curl -f http://localhost:3000 > /dev/null 2>&1
inspect $? frontend-health

# Run unit tests
echo "🧪 Running backend unit tests..."
cd services/users
source venv/bin/activate
python manage.py test
inspect $? backend-tests

# Run linting
echo "🔍 Running backend linting..."
flake8 project
inspect $? backend-lint

cd ../../

# Run frontend tests
echo "🧪 Running frontend tests..."
cd client
npm test -- --coverage --watchAll=false
inspect $? frontend-tests

cd ..

# Run e2e tests
echo "🌐 Running end-to-end tests..."
npx cypress run --config baseUrl=http://localhost:3000
inspect $? e2e-tests

# Stop the application
echo "🛑 Stopping application..."
kill $APP_PID 2>/dev/null

# return proper code
if [ -n "${fails}" ]; then
  echo ""
  echo "❌ Tests failed: ${fails}"
  exit 1
else
  echo ""
  echo "✅ All tests passed!"
  exit 0
fi
