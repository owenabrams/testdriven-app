#!/bin/bash

# CloudShell Keep-Alive Script
# Run this in CloudShell to prevent timeout during large uploads

echo "🔄 CloudShell Keep-Alive Script"
echo "==============================="
echo "This will keep your CloudShell session active during uploads"
echo ""

# Function to keep session alive
keep_alive() {
    while true; do
        echo "⏰ $(date): Keeping session alive..."
        # Send a harmless command every 5 minutes
        ls > /dev/null 2>&1
        sleep 300  # 5 minutes
    done
}

echo "🚀 Starting keep-alive process..."
echo "💡 Leave this running in a separate CloudShell tab"
echo "📤 Upload your file in another tab while this runs"
echo ""
echo "Press Ctrl+C to stop"

# Start keep-alive in background
keep_alive