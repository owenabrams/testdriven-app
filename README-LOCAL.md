# TestDriven App - Local Development Setup

This is a simplified version of the TestDriven app for local development without PWA or Bulma dependencies.

## Tech Stack
- **Frontend**: React 18 + Material-UI 5
- **Backend**: Flask + SQLAlchemy
- **Database**: SQLite (for local development)

## Quick Start

### 1. Backend Setup (Flask API)
```bash
cd services/users
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
export FLASK_APP=project/__init__.py
export FLASK_ENV=development
export DATABASE_URL=sqlite:///app.db
flask db upgrade
python manage.py run
```

### 2. Frontend Setup (React)
```bash
cd services/client
npm install
npm start
```

## URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Features
- ✅ User registration and login
- ✅ User management (CRUD operations)
- ✅ Material-UI components
- ✅ React Router navigation
- ✅ JWT authentication
- ✅ Native Python/Node.js development
- ❌ No PWA functionality
- ❌ No Bulma CSS

## Project Structure
```
services/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── users/           # Flask backend
    ├── project/
    │   ├── api/
    │   └── __init__.py
    └── requirements.txt
```