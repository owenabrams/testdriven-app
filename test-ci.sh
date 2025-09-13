#!/bin/bash

env=$1
fails=""

inspect() {
  if [ $1 -ne 0 ]; then
    fails="${fails} $2"
  fi
}

# run client and server-side tests
dev() {
  echo "Starting development tests..."

  # For now, run tests locally since Docker setup is new
  echo "Running backend tests..."
  cd services/users
  python manage.py test
  inspect $? backend-tests

  echo "Running backend linting..."
  flake8 project
  inspect $? backend-lint

  cd ../../

  echo "Running frontend tests..."
  cd client
  npm test -- --coverage --watchAll=false --passWithNoTests
  inspect $? frontend-tests

  cd ../
}

# run e2e tests
e2e() {
  echo "Starting e2e tests for $1 environment..."
  
  # Check if docker-compose file exists
  if [ ! -f "docker-compose-$1.yml" ]; then
    echo "Warning: docker-compose-$1.yml not found, using docker-compose.yml"
    docker-compose up -d --build
    docker-compose exec -T users python manage.py recreate_db
    docker-compose exec -T users python manage.py seed_db
  else
    docker-compose -f docker-compose-$1.yml up -d --build
    docker-compose -f docker-compose-$1.yml exec -T users python manage.py recreate_db
    docker-compose -f docker-compose-$1.yml exec -T users python manage.py seed_db
  fi
  
  # Wait for services to be ready
  sleep 15
  
  echo "Running Cypress e2e tests..."
  if command -v npx &> /dev/null; then
    npx cypress run --config baseUrl=http://localhost:3000
  else
    ./node_modules/.bin/cypress run --config baseUrl=http://localhost:3000
  fi
  inspect $? e2e
  
  # Clean up
  if [ -f "docker-compose-$1.yml" ]; then
    docker-compose -f docker-compose-$1.yml down
  else
    docker-compose down
  fi
}

# run appropriate tests
if [[ "${env}" == "development" ]]; then
  echo "Running client and server-side tests!"
  dev
elif [[ "${env}" == "staging" ]]; then
  echo "Running e2e tests!"
  e2e stage
elif [[ "${env}" == "production" ]]; then
  echo "Running e2e tests!"
  e2e prod
else
  echo "Running client and server-side tests!"
  dev
fi

# return proper code
if [ -n "${fails}" ]; then
  echo "Tests failed: ${fails}"
  exit 1
else
  echo "Tests passed!"
  exit 0
fi
