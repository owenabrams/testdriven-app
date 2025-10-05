#!/bin/bash

echo "🔧 Cleaning VSCode and Augment cache..."

# Kill all VSCode processes
echo "Stopping VSCode processes..."
pkill -f "Visual Studio Code" 2>/dev/null
pkill -f "Code Helper" 2>/dev/null
sleep 2

# Clear Augment cache and workspace storage
echo "Clearing Augment cache..."
rm -rf ~/Library/Caches/augment* 2>/dev/null
rm -rf "/Users/abe/Library/Application Support/Code/User/workspaceStorage/94fd4017a88a15e700d02cc6fe469900/Augment.vscode-augment" 2>/dev/null
rm -rf ~/Library/Application\ Support/Code/logs/ 2>/dev/null
rm -rf ~/Library/Application\ Support/Code/CachedExtensions/ 2>/dev/null
rm -rf /tmp/*augment* 2>/dev/null

# Clear any conversation history files
find ~/Library/Application\ Support/Code -name "*conversation*" -delete 2>/dev/null
find ~/Library/Application\ Support/Code -name "*history*" -delete 2>/dev/null

echo "✅ Cache cleared successfully!"
echo "🚀 Starting VSCode with clean state..."

# Start VSCode with the current directory
open -a "Visual Studio Code" .

echo "✅ VSCode restarted! The conversation history has been cleared and performance should be improved."
