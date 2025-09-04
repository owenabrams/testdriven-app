#!/usr/bin/env python3

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Set required environment variables
os.environ['FLASK_APP'] = 'project/__init__.py'
os.environ['FLASK_ENV'] = 'development'
os.environ['APP_SETTINGS'] = 'project.config.DevelopmentConfig'
os.environ['DATABASE_URL'] = 'sqlite:///app.db'
os.environ['SECRET_KEY'] = 'dev-secret-key'

# Import and run the app
from project import create_app, db
from project.api.models import User

app, _ = create_app()

if __name__ == '__main__':
    with app.app_context():
        # Create tables
        db.create_all()
        
        # Add some test users if none exist
        if User.query.count() == 0:
            user1 = User(username='michael', email='michael@reallynotreal.com', password='test')
            user2 = User(username='michaelherman', email='michael@mherman.org', password='test')
            user3 = User(username='testuser', email='test@example.com', password='test')
            
            db.session.add(user1)
            db.session.add(user2)
            db.session.add(user3)
            db.session.commit()
            
            print("✅ Database initialized with test users")
    
    print("🚀 Starting Flask API on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)