#!/bin/bash

# Restart Application with New Changes

echo "🔄 Restarting Application with New Changes"
echo "=========================================="

echo "⚠️  IMPORTANT: You need to stop any currently running servers first!"
echo ""
echo "📋 Steps to restart cleanly:"
echo ""

echo "1️⃣  STOP CURRENT SERVERS:"
echo "   - If you have terminals running React/Flask, press Ctrl+C in each"
echo "   - Or find and kill the processes:"
echo ""

# Check for running processes
echo "🔍 Checking for running processes..."

# Check for React (port 3000)
REACT_PID=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$REACT_PID" ]; then
    echo "   ⚠️  React server running on port 3000 (PID: $REACT_PID)"
    echo "   💀 To kill: kill $REACT_PID"
else
    echo "   ✅ Port 3000 is free"
fi

# Check for Flask (port 5000)
FLASK_PID=$(lsof -ti:5000 2>/dev/null)
if [ ! -z "$FLASK_PID" ]; then
    echo "   ⚠️  Flask server running on port 5000 (PID: $FLASK_PID)"
    echo "   💀 To kill: kill $FLASK_PID"
else
    echo "   ✅ Port 5000 is free"
fi

echo ""
echo "2️⃣  KILL PROCESSES (if needed):"
if [ ! -z "$REACT_PID" ] || [ ! -z "$FLASK_PID" ]; then
    echo "   Run these commands to kill running servers:"
    echo ""
    
    if [ ! -z "$REACT_PID" ]; then
        echo "   kill $REACT_PID    # Kill React server"
    fi
    
    if [ ! -z "$FLASK_PID" ]; then
        echo "   kill $FLASK_PID    # Kill Flask server"
    fi
    
    echo ""
    echo "   Or kill all Node.js and Python processes:"
    echo "   pkill -f 'react-scripts'"
    echo "   pkill -f 'python.*manage.py'"
    echo ""
    
    read -p "❓ Do you want me to kill these processes now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "💀 Killing processes..."
        
        if [ ! -z "$REACT_PID" ]; then
            kill $REACT_PID 2>/dev/null && echo "   ✅ Killed React server (PID: $REACT_PID)"
        fi
        
        if [ ! -z "$FLASK_PID" ]; then
            kill $FLASK_PID 2>/dev/null && echo "   ✅ Killed Flask server (PID: $FLASK_PID)"
        fi
        
        # Wait a moment for processes to die
        sleep 2
        
        # Force kill if still running
        pkill -f 'react-scripts' 2>/dev/null
        pkill -f 'python.*manage.py' 2>/dev/null
        
        echo "   ✅ All processes killed"
    else
        echo "   ⏭️  Skipping automatic kill - please stop servers manually"
        echo ""
        echo "❌ CANNOT CONTINUE until servers are stopped"
        echo "   Please stop your servers and run this script again"
        exit 1
    fi
else
    echo "   ✅ No servers currently running"
fi

echo ""
echo "3️⃣  CLEAR BROWSER CACHE:"
echo "   - Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   - Or clear browser cache completely"
echo "   - This ensures you see the new interface, not cached old one"

echo ""
echo "4️⃣  START FRESH:"
echo "   - The startup script now uses the correct client directory"
echo "   - All dependencies have been updated"
echo "   - New features are integrated"

echo ""
echo "🚀 READY TO START:"
echo "   Run: ./start-local.sh"
echo ""

# Final verification
echo "🔍 Final verification before restart..."

# Check if we're using the right client
if grep -q "cd ../../client" start-local.sh; then
    echo "   ✅ Startup script uses correct client directory"
else
    echo "   ❌ Startup script still wrong - this shouldn't happen!"
    exit 1
fi

# Check if main client has node_modules
if [ -d "client/node_modules" ]; then
    echo "   ✅ Main client has dependencies installed"
else
    echo "   ⚠️  Main client missing node_modules - will install on startup"
fi

echo ""
echo "✅ READY FOR CLEAN RESTART!"
echo ""
echo "📋 Next steps:"
echo "   1. Make sure all servers are stopped (see above)"
echo "   2. Clear browser cache"
echo "   3. Run: ./start-local.sh"
echo "   4. Open: http://localhost:3000"
echo "   5. Look for 'Savings Platform' under MICROSERVICES"
echo ""
echo "🎯 You should now see the modern Material-UI interface"
echo "   with the Savings Platform link in the left sidebar!"