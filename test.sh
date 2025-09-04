#!/bin/bash

fails=""

inspect() {
  if [ $1 -ne 0 ]; then
    fails="${fails} $2"
  fi
}

# run unit and integration tests
echo "🧪 Running backend tests..."
cd services/users
source venv/bin/activate
python -m pytest project/tests/ -v
inspect $? users
python -m flake8 project --exclude=venv
inspect $? users-lint
cd ../..

echo "🧪 Running frontend tests..."
cd services/client
npm run coverage
inspect $? client
cd ../..

# run e2e tests
echo "🧪 Running e2e tests..."
# Check if React app is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "⚠️  React app not running on localhost:3000. Please start it first with:"
  echo "   cd services/client && npm start"
  inspect 1 e2e-setup
else
  # Check if Flask API is running
  if ! curl -s http://localhost:5001/users/ping > /dev/null; then
    echo "⚠️  Flask API not running on localhost:5001. Please start it first."
    inspect 1 e2e-api-setup
  else
    ./node_modules/.bin/cypress run
    inspect $? e2e
  fi
fi

# return proper code
if [ -n "${fails}" ]; then
  echo "❌ Tests failed: ${fails}"
  exit 1
else
  echo "✅ Tests passed!"
  exit 0
fi