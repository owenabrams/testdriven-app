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
# Load environment variables for testing
export FLASK_APP=project/__init__.py
export FLASK_ENV=testing
export APP_SETTINGS=project.config.TestingConfig
export DATABASE_TEST_URL=sqlite:///test.db
export SECRET_KEY=test-secret-key
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

# Function to start Flask API
start_flask_api() {
  echo "🚀 Starting Flask API..."
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
  echo "Flask API started with PID: $FLASK_PID"
  sleep 5
}

# Function to start React app
start_react_app() {
  echo "🚀 Starting React app..."
  cd services/client
  npm start > /dev/null 2>&1 &
  REACT_PID=$!
  cd ../..
  echo "React app started with PID: $REACT_PID"
  sleep 10
}

# Function to cleanup processes
cleanup() {
  if [ ! -z "$FLASK_PID" ]; then
    echo "🛑 Stopping Flask API (PID: $FLASK_PID)"
    kill $FLASK_PID 2>/dev/null
  fi
  if [ ! -z "$REACT_PID" ]; then
    echo "🛑 Stopping React app (PID: $REACT_PID)"
    kill $REACT_PID 2>/dev/null
  fi
}

# Set trap for cleanup on script exit
trap cleanup EXIT

# Check if Flask API is running
if ! curl -s http://localhost:5000/users/ping > /dev/null; then
  start_flask_api
  # Wait and check again
  if ! curl -s http://localhost:5000/users/ping > /dev/null; then
    echo "❌ Failed to start Flask API"
    inspect 1 e2e-api-setup
  else
    echo "✅ Flask API is running"
    # Initialize database for e2e tests
    echo "🗄️  Setting up database for e2e tests..."
    cd services/users
    source venv/bin/activate
    export FLASK_APP=project/__init__.py
    export FLASK_ENV=development
    export APP_SETTINGS=project.config.DevelopmentConfig
    export DATABASE_URL=sqlite:///app.db
    export SECRET_KEY=dev-secret-key
    python manage.py recreate_db
    python manage.py seed_db
    echo -e "superadmin\nsuperadmin@testdriven.io\nsuperpassword123" | python manage.py create_super_admin
    cd ../..
    echo "✅ Database initialized"
  fi
else
  echo "✅ Flask API already running"
fi

# Check if React app is running
if ! curl -s http://localhost:3000 > /dev/null; then
  start_react_app
  # Wait and check again
  if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Failed to start React app"
    inspect 1 e2e-setup
  else
    echo "✅ React app is running"
  fi
else
  echo "✅ React app already running"
fi

# Run e2e tests if both services are running
if curl -s http://localhost:5000/users/ping > /dev/null && curl -s http://localhost:3000 > /dev/null; then
  echo "🧪 Running Cypress e2e tests..."
  ./node_modules/.bin/cypress run
  inspect $? e2e
else
  echo "❌ Services not ready for e2e tests"
  inspect 1 e2e-services
fi

# return proper code
if [ -n "${fails}" ]; then
  echo "❌ Tests failed: ${fails}"
  exit 1
else
  echo "✅ Tests passed!"
  exit 0
fi