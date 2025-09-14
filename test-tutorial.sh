#!/bin/bash

type=$1
fails=""

inspect() {
  if [ $1 -ne 0 ]; then
    fails="${fails} $2"
  fi
}

# run server-side tests
server() {
  echo "🚀 Starting backend services for testing..."
  docker-compose up -d --build

  echo "⏳ Waiting for services to be ready..."
  sleep 10

  echo "🧪 Running backend unit tests..."
  docker-compose exec backend python manage.py test
  inspect $? backend-tests

  echo "🔍 Running backend linting..."
  docker-compose exec backend flake8 project
  inspect $? backend-lint

  echo "🛑 Stopping services..."
  docker-compose down
}

# run client-side tests
client() {
  echo "🚀 Starting frontend services for testing..."
  docker-compose up -d --build

  echo "⏳ Waiting for services to be ready..."
  sleep 10

  echo "🧪 Running frontend tests..."
  docker-compose exec frontend npm test -- --coverage --watchAll=false
  inspect $? frontend-tests

  echo "🛑 Stopping services..."
  docker-compose down
}

# run e2e tests
e2e() {
  echo "🚀 Starting staging environment for E2E tests..."
  docker-compose -f docker-compose-stage.yml up -d --build

  echo "⏳ Waiting for services to be ready..."
  sleep 15

  echo "🗄️  Setting up test database..."
  docker-compose -f docker-compose-stage.yml exec backend python manage.py recreate_db
  docker-compose -f docker-compose-stage.yml exec backend python manage.py seed_db

  echo "🌐 Running Cypress E2E tests..."
  ./node_modules/.bin/cypress run --config baseUrl=http://localhost:3000
  inspect $? e2e-tests

  echo "🛑 Stopping staging environment..."
  docker-compose -f docker-compose-stage.yml down
}

# run all tests
all() {
  echo "🧪 Running complete test suite..."
  echo "================================="

  echo ""
  echo "1️⃣  Backend Tests"
  echo "----------------"
  docker-compose up -d --build
  sleep 10

  docker-compose exec backend python manage.py test
  inspect $? backend-tests

  docker-compose exec backend flake8 project
  inspect $? backend-lint

  echo ""
  echo "2️⃣  Frontend Tests"
  echo "-----------------"
  docker-compose exec frontend npm test -- --coverage --watchAll=false
  inspect $? frontend-tests

  docker-compose down

  echo ""
  echo "3️⃣  End-to-End Tests"
  echo "-------------------"
  e2e
}

# run appropriate tests
if [[ "${type}" == "server" ]]; then
  echo "\n"
  echo "Running server-side tests!\n"
  server
elif [[ "${type}" == "client" ]]; then
  echo "\n"
  echo "Running client-side tests!\n"
  client
elif [[ "${type}" == "e2e" ]]; then
  echo "\n"
  echo "Running e2e tests!\n"
  e2e
else
  echo "\n"
  echo "Running all tests!\n"
  all
fi

# return proper code
if [ -n "${fails}" ]; then
  echo "\n"
  echo "Tests failed: ${fails}"
  exit 1
else
  echo "\n"
  echo "Tests passed!"
  exit 0
fi
