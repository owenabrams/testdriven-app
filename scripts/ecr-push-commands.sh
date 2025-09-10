#!/bin/bash

# ECR Push Commands - Copy these from AWS Console
# Go to ECR → Your Repository → "View push commands"

echo "🐳 ECR Push Commands for savings-groups-platform"
echo "================================================"
echo ""
echo "Run these commands in order:"
echo ""

# Step 1: Login (you'll need to get this from AWS Console)
echo "1. Login to ECR:"
echo "   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 068561046929.dkr.ecr.us-east-1.amazonaws.com"
echo ""

# Step 2: Tag your image
echo "2. Tag your existing image:"
echo "   docker tag savings-groups-test:latest 068561046929.dkr.ecr.us-east-1.amazonaws.com/savings-groups-platform:latest"
echo ""

# Step 3: Push
echo "3. Push to ECR:"
echo "   docker push 068561046929.dkr.ecr.us-east-1.amazonaws.com/savings-groups-platform:latest"
echo ""

echo "📋 If the login fails due to permissions, try these alternatives:"
echo ""
echo "Alternative 1: Use AWS Console Push Commands"
echo "   1. Go to AWS Console → ECR → savings-groups-platform"
echo "   2. Click 'View push commands'"
echo "   3. Copy and run the commands shown there"
echo ""
echo "Alternative 2: Use AWS CloudShell (if available)"
echo "   1. Open AWS CloudShell from the AWS Console"
echo "   2. Upload your Docker image or rebuild it there"
echo "   3. Run the push commands from CloudShell"
echo ""

# Let's try the commands anyway
echo "🚀 Attempting to run the commands now..."
echo ""

# Check if we have the Docker image
if docker images | grep -q "savings-groups-test"; then
    echo "✅ Docker image 'savings-groups-test' found"
    
    # Try to tag the image
    echo "📦 Tagging image..."
    docker tag savings-groups-test:latest 068561046929.dkr.ecr.us-east-1.amazonaws.com/savings-groups-platform:latest
    echo "✅ Image tagged successfully"
    
    echo ""
    echo "🔑 Now attempting ECR login and push..."
    echo "   (This might fail due to permissions)"
    
    # Try ECR login and push
    if aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 068561046929.dkr.ecr.us-east-1.amazonaws.com; then
        echo "✅ ECR login successful!"
        echo "📤 Pushing image..."
        if docker push 068561046929.dkr.ecr.us-east-1.amazonaws.com/savings-groups-platform:latest; then
            echo "🎉 SUCCESS! Image pushed to ECR!"
            echo ""
            echo "📋 Your image is now available at:"
            echo "   068561046929.dkr.ecr.us-east-1.amazonaws.com/savings-groups-platform:latest"
            echo ""
            echo "🎯 Next: Create ECS Cluster and Service using this image"
        else
            echo "❌ Push failed"
        fi
    else
        echo "❌ ECR login failed due to insufficient permissions"
        echo ""
        echo "💡 Solution: Use the AWS Console push commands instead"
    fi
else
    echo "❌ Docker image 'savings-groups-test' not found"
    echo "   Run: docker build -t savings-groups-test ."
fi