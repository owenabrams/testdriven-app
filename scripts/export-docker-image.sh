#!/bin/bash

echo "📦 Exporting Docker Image for Manual Upload"
echo "==========================================="

# Export the Docker image to a tar file
echo "🔄 Exporting savings-groups-platform image..."
docker save -o savings-groups-platform.tar savings-groups-platform:latest

if [ $? -eq 0 ]; then
    echo "✅ Image exported successfully!"
    echo ""
    echo "📁 File created: savings-groups-platform.tar"
    echo "📊 File size: $(du -h savings-groups-platform.tar | cut -f1)"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Use AWS CloudShell:"
    echo "   - Go to AWS Console → Click CloudShell icon"
    echo "   - Upload the tar file: Actions → Upload file"
    echo "   - Load image: docker load -i savings-groups-platform.tar"
    echo "   - Tag: docker tag savings-groups-platform:latest 068561046929.dkr.ecr.us-east-1.amazonaws.com/savings-groups-platform:latest"
    echo "   - Push: docker push 068561046929.dkr.ecr.us-east-1.amazonaws.com/savings-groups-platform:latest"
    echo ""
    echo "2. Or try from a different network connection"
    echo ""
else
    echo "❌ Failed to export image"
    exit 1
fi