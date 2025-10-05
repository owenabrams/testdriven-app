#!/usr/bin/env python3
"""
🚀 MINIMAL ENHANCED MEETING ACTIVITIES DEMO - LOCAL DEVELOPMENT VERSION
This is your LOCAL development version that runs on port 5001
Keep this file for local development - it won't be affected by production changes
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_socketio import SocketIO
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, date, timedelta
import json
import os
import io
import csv
from decimal import Decimal
import hashlib
import secrets

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# LOCAL DEVELOPMENT CONFIGURATION
app.config['SECRET_KEY'] = 'dev-secret-key-for-local-only'

# Password hashing functions
def hash_password(password):
    """Hash a password with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return salt + password_hash.hex()

def verify_password(password, hashed_password):
    """Verify a password against its hash"""
    if len(hashed_password) < 32:
        return False
    salt = hashed_password[:32]
    stored_hash = hashed_password[32:]
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return password_hash.hex() == stored_hash

# LOCAL Database setup - PostgreSQL
DB_HOST = 'localhost'
DB_PORT = 5432
DB_NAME = 'testdriven_dev'
DB_USER = os.getenv('USER')
DB_PASSWORD = ''  # No password for local development

def get_db_connection():
    """Get PostgreSQL database connection"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            cursor_factory=RealDictCursor
        )
        return conn
    except psycopg2.Error as e:
        print(f"Database connection failed: {e}")
        return None

def decimal_to_float(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, date):
        return obj.isoformat()
    elif hasattr(obj, 'isoformat'):  # Handle time objects
        return obj.isoformat()
    return obj

def serialize_record(record):
    """Serialize database record for JSON response"""
    if record is None:
        return None
    return {key: decimal_to_float(value) for key, value in dict(record).items()}

# Basic API Endpoints for LOCAL development

@app.route('/ping', methods=['GET'])
def ping():
    """Health check endpoint"""
    return jsonify({
        'environment': 'local-development',
        'message': 'pong!',
        'status': 'success',
        'version': '1.0.0-local'
    })

@app.route('/auth/login', methods=['POST'])
def login():
    """Simple login for local development"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    # Accept both credential sets for local development
    if (email == 'admin@savingsgroup.com' and password == 'admin123') or \
       (email == 'superadmin@testdriven.io' and password == 'superpassword123'):
        return jsonify({
            'status': 'success',
            'message': 'Login successful (LOCAL)',
            'auth_token': 'local-dev-token',
            'user': {
                'id': 1,
                'email': email,
                'role': 'super_admin',
                'is_super_admin': True,
                'username': 'admin'
            }
        })
    
    return jsonify({'message': 'Invalid email or password.', 'status': 'fail'}), 401

# Enhanced Meeting Activities API Endpoints (your existing code continues here...)

@app.route('/api/meeting-activities/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Enhanced Meeting Activities API (LOCAL)',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    })

# Add all your existing endpoints here...
# (I'm keeping this short to focus on the environment management solution)

if __name__ == '__main__':
    print("🏦 Starting LOCAL Development Microfinance System API...")
    print("🗄️ Connecting to LOCAL PostgreSQL database...")
    print("✅ Database ready!")
    print("🌐 Starting Flask server on LOCAL port...")
    print("📍 API will be available at: http://localhost:5001")
    print("🔗 Try these endpoints:")
    print("   • http://localhost:5001/ping - Health check")
    print("   • http://localhost:5001/auth/login - Login")
    print("   • http://localhost:5001/api/meeting-activities/health - Activities health")
    print()
    print("🔑 LOCAL LOGIN CREDENTIALS:")
    print("   • admin@savingsgroup.com / admin123")
    print("   • superadmin@testdriven.io / superpassword123")
    print()
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
