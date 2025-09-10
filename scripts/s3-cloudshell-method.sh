#!/bin/bash

echo "📦 S3 + CloudShell Method (No Timeout Issues)"
echo "============================================="
echo ""
echo "This method avoids CloudShell timeouts by using S3 as intermediate storage"
echo ""

# Check if minimal tar exists
if [ -f "savings-groups-minimal.tar" ]; then
    echo "✅ Found minimal image: $(du -h savings-groups-minimal.tar | cut -f1)"
    TAR_FILE="savings-groups-minimal.tar"
else
    echo "✅ Using full image: $(du -h savings-groups-platform.tar | cut -f1)"
    TAR_FILE="savings-groups-platform.tar"
fi

echo ""
echo "🎯 Step-by-Step Instructions:"
echo ""
echo "1. 📤 Upload to S3 (via AWS Console):"
echo "   - Go to S3 Console"
echo "   - Create bucket: 'your-docker-images-temp'"
echo "   - Upload: $TAR_FILE"
echo "   - No timeout issues with S3 web upload!"
echo ""
echo "2. 🔄 Download in CloudShell:"
echo "   aws s3 cp s3://your-docker-images-temp/$TAR_FILE ."
echo ""
echo "3. 🐳 Load and Push to ECR:"
echo "   docker load -i $TAR_FILE"
echo "   docker tag savings-groups-minimal:latest 068561046929.dkr.ecr.us-east-1.amazonaws.com/savings-groups-platform:latest"
echo "   docker push 068561046929.dkr.ecr.us-east-1.amazonaws.com/savings-groups-platform:latest"
echo ""
echo "4. 🧹 Cleanup:"
echo "   aws s3 rm s3://your-docker-images-temp/$TAR_FILE"
echo "   aws s3 rb s3://your-docker-images-temp"
echo ""
echo "💡 Benefits:"
echo "   ✅ No CloudShell timeouts"
echo "   ✅ S3 web upload is reliable"
echo "   ✅ Fast download in CloudShell"
echo "   ✅ Can pause/resume if needed"