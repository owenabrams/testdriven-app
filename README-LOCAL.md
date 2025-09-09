# TestDriven App - Local Development Setup

This is a simplified version of the TestDriven app for local development without PWA or Bulma dependencies.

## Tech Stack
- **Frontend**: React 18 + Material-UI 5
- **Backend**: Flask + SQLAlchemy
- **Database**: SQLite (for local development)

## Quick Start

### 1. Complete Application Launch (Recommended)
```bash
# Launches both backend and frontend with full demo data seeding
./start-local.sh
```

This script will:
- Set up Python virtual environment
- Install all dependencies
- Initialize and seed database with demo data from `SAVINGS_PLATFORM_INTEGRATION_GUIDE.md`
- Create all demo users (Sarah, Mary, Grace, Alice, Jane, etc.)
- Start both Flask backend and React frontend
- Verify integration guide compliance

### 2. Manual Setup (Alternative)

#### Backend Setup (Flask API)
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

#### Frontend Setup (React)
```bash
cd services/client
npm install
npm start
```

### 3. Re-seed Database (If Needed)
```bash
# Re-creates database with fresh integration guide data
./reseed-integration-guide-data.sh
```

### 4. Verify Integration Guide Compliance
```bash
# Checks if seeded data matches SAVINGS_PLATFORM_INTEGRATION_GUIDE.md
python verify-integration-guide-seeding.py
```

## URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Savings Platform**: http://localhost:3000/savings-groups

## Demo User Credentials (from SAVINGS_PLATFORM_INTEGRATION_GUIDE.md)

### Admin Users
- **Super Admin**: `superadmin@testdriven.io` / `superpassword123`
- **Service Admin**: `admin@savingsgroups.ug` / `admin123`

### Group Officers (Enhanced Permissions)
- **Sarah Nakato (Chair)**: `sarah@kampala.ug` / `password123`
- **Mary Nambi (Treasurer)**: `mary@kampala.ug` / `password123`
- **Grace Mukasa (Secretary)**: `grace@kampala.ug` / `password123`

### Group Members (Standard Access)
- **Alice Ssali**: `alice@kampala.ug` / `password123`
- **Jane Nakirya**: `jane@kampala.ug` / `password123`
- **Rose Namuli**: `rose@kampala.ug` / `password123`
- **John Mukasa**: `john@kampala.ug` / `password123`
- **Peter Ssali**: `peter@kampala.ug` / `password123`

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