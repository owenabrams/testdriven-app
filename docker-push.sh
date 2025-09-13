#!/bin/bash

set -e  # Exit on any error

echo "Starting Docker build and push process..."
echo "Branch: $GITHUB_REF_NAME"
echo "Commit: $COMMIT_SHORT"
echo "Docker Environment: $DOCKER_ENV"
echo "Repository: $REPO"

# Only push on staging or production branches
if [[ "$GITHUB_REF_NAME" == "staging" ]] || [[ "$GITHUB_REF_NAME" == "production" ]]; then

    echo "Building and pushing images for $GITHUB_REF_NAME branch..."

    # Build and push backend service
    echo "Building backend service..."
    docker build ./services/users -t testdriven-backend:$COMMIT_SHORT -f ./services/users/Dockerfile-$DOCKER_ENV
    docker tag testdriven-backend:$COMMIT_SHORT $REPO/testdriven-backend:$TAG
    echo "Pushing backend service..."
    docker push $REPO/testdriven-backend:$TAG

    # Build and push frontend
    echo "Building frontend..."
    docker build ./client -t testdriven-frontend:$COMMIT_SHORT -f ./client/Dockerfile-$DOCKER_ENV --build-arg REACT_APP_USERS_SERVICE_URL=https://api-$TAG.yourdomain.com
    docker tag testdriven-frontend:$COMMIT_SHORT $REPO/testdriven-frontend:$TAG
    echo "Pushing frontend..."
    docker push $REPO/testdriven-frontend:$TAG

    echo "All images built and pushed successfully!"

else
    echo "Not on staging or production branch, skipping Docker push..."
fi
