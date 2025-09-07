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

# return proper code
if [ -n "${fails}" ]; then
  echo "❌ Tests failed: ${fails}"
  exit 1
else
  echo "✅ Unit and integration tests passed!"
  echo "💡 To run e2e tests, use: ./test.sh"
  exit 0
fi