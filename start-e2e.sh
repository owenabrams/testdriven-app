#!/bin/bash

echo "🚀 Starting services for e2e testing..."

# Start Flask API in background
echo "Starting Flask API..."
cd services/users
source venv/bin/activate
python run_flask.py &
FLASK_PID=$!
cd ../..

# Wait a moment for Flask to start
sleep 3

# Start React app in background
echo "Starting React app..."
cd services/client
npm start &
REACT_PID=$!
cd ../..

echo "✅ Services started!"
echo "Flask API PID: $FLASK_PID"
echo "React App PID: $REACT_PID"
echo ""
echo "To stop services:"
echo "kill $FLASK_PID $REACT_PID"
echo ""
echo "Services should be available at:"
echo "- React App: http://localhost:3000"
echo "- Flask API: http://localhost:5001"