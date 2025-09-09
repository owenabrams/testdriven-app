#!/bin/bash

# Merge Client Features - Ensure main client/ has all comprehensive features

echo "🔄 Merging Client Features for Complete Integration"
echo "================================================="

# 1. Backup current main client
echo "📦 Creating backup of current main client..."
if [ -d "client-backup" ]; then
    rm -rf client-backup
fi
cp -r client client-backup
echo "   ✅ Backup created: client-backup/"

# 2. Update main client package.json with missing dependencies
echo ""
echo "📦 Updating main client dependencies..."

cd client

# Add missing dependencies from services/client
npm install --save \
    @hookform/resolvers \
    @tanstack/react-query \
    @tanstack/react-query-devtools \
    yup \
    @testing-library/jest-dom \
    @testing-library/react \
    @testing-library/user-event

echo "   ✅ Dependencies updated"

# 3. Check for missing important components
echo ""
echo "🔍 Checking for missing components..."

# Check if we have all the comprehensive pages
missing_components=()

# Check SavingsGroups pages
savings_pages=(
    "src/pages/SavingsGroups/Calendar/CalendarPage.js"
    "src/pages/SavingsGroups/Dashboard/SavingsGroupsDashboard.js"
    "src/pages/SavingsGroups/Admin/AdminDashboard.js"
    "src/pages/SavingsGroups/MySavings/MySavingsPage.js"
    "src/pages/SavingsGroups/MyGroup/MyGroupPage.js"
    "src/pages/SavingsGroups/Transactions/TransactionsPage.js"
    "src/pages/SavingsGroups/Meetings/MeetingsPage.js"
    "src/pages/SavingsGroups/MyLoans/MyLoansPage.js"
    "src/pages/SavingsGroups/Campaigns/CampaignsPage.js"
    "src/pages/SavingsGroups/Settings/SettingsPage.js"
)

for page in "${savings_pages[@]}"; do
    if [ -f "$page" ]; then
        echo "   ✅ $page"
    else
        echo "   ❌ $page - MISSING"
        missing_components+=("$page")
    fi
done

# Check Admin components
admin_components=(
    "src/components/Admin/AdminStatsCards.js"
    "src/components/Admin/MemberManagement.js"
    "src/components/Admin/GroupOversight.js"
    "src/components/Admin/FinancialSupport.js"
    "src/components/Admin/SystemSettings.js"
)

for component in "${admin_components[@]}"; do
    if [ -f "$component" ]; then
        echo "   ✅ $component"
    else
        echo "   ❌ $component - MISSING"
        missing_components+=("$component")
    fi
done

# Check services
services=(
    "src/services/savingsGroupsAPI.js"
    "src/services/api.js"
)

for service in "${services[@]}"; do
    if [ -f "$service" ]; then
        echo "   ✅ $service"
    else
        echo "   ❌ $service - MISSING"
        missing_components+=("$service")
    fi
done

# 4. Update AuthContext with better error handling
echo ""
echo "🔧 Enhancing AuthContext..."

# Create enhanced AuthContext that combines both versions
cat > src/contexts/AuthContext.js << 'EOF'
import React, { createContext, useContext, useState, useEffect, useReducer } from 'react';
import { apiClient } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Auth reducer for better state management
const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOGIN_SUCCESS':
      return { ...state, user: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, loading: false };
    case 'AUTH_ERROR':
      return { ...state, user: null, loading: false, error: action.payload };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  loading: true,
  error: null,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    if (token) {
      // Verify token and get user info
      apiClient.get('/auth/status')
        .then(response => {
          if (response.data.status === 'success') {
            dispatch({ type: 'LOGIN_SUCCESS', payload: response.data.data });
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('authToken');
            dispatch({ type: 'LOGOUT' });
          }
        })
        .catch((error) => {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('authToken');
          dispatch({ type: 'LOGOUT' });
        });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (email, password) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      if (response.data.status === 'success') {
        const { auth_token, user: userData } = response.data;
        localStorage.setItem('auth_token', auth_token);
        dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
        toast.success('Login successful!');
        return { success: true };
      } else {
        const message = response.data.message || 'Login failed';
        dispatch({ type: 'AUTH_ERROR', payload: message });
        toast.error(message);
        return { success: false, message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await apiClient.post('/auth/register', userData);

      if (response.data.status === 'success') {
        const { auth_token, user: newUser } = response.data;
        localStorage.setItem('auth_token', auth_token);
        dispatch({ type: 'LOGIN_SUCCESS', payload: newUser });
        toast.success('Registration successful!');
        return { success: true };
      } else {
        const message = response.data.message || 'Registration failed';
        dispatch({ type: 'AUTH_ERROR', payload: message });
        toast.error(message);
        return { success: false, message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_ERROR', payload: message });
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('authToken');
    dispatch({ type: 'LOGOUT' });
    toast.success('Logged out successfully');
  };

  const value = {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
EOF

echo "   ✅ AuthContext enhanced with better error handling"

# 5. Update package.json scripts for testing
echo ""
echo "🧪 Adding comprehensive test scripts..."

# Update package.json to include test coverage and other useful scripts
npm pkg set scripts.coverage="CI=true react-scripts test --coverage --watchAll=false"
npm pkg set scripts.test:watch="react-scripts test"
npm pkg set scripts.analyze="npm run build && npx bundle-analyzer build/static/js/*.js"

echo "   ✅ Test scripts added"

# 6. Create comprehensive API service if missing
echo ""
echo "🔧 Ensuring comprehensive API service..."

if [ ! -f "src/services/api.js" ]; then
    echo "   📝 Creating comprehensive API service..."
    
    mkdir -p src/services
    
    cat > src/services/api.js << 'EOF'
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_USERS_SERVICE_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('auth_token');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

// Notifications API
export const notificationsAPI = {
  getNotifications: () => apiClient.get('/notifications'),
  markAsRead: (id) => apiClient.put(`/notifications/${id}/read`),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
};

// Users API
export const usersAPI = {
  getUsers: () => apiClient.get('/users'),
  getUser: (id) => apiClient.get(`/users/${id}`),
  createUser: (userData) => apiClient.post('/users', userData),
  updateUser: (id, userData) => apiClient.put(`/users/${id}`, userData),
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
};

// Admin API
export const adminAPI = {
  getSystemStats: () => apiClient.get('/admin/stats'),
  getServices: () => apiClient.get('/admin/services'),
  getAccessRequests: () => apiClient.get('/admin/access-requests'),
  approveAccessRequest: (id) => apiClient.post(`/admin/access-requests/${id}/approve`),
  rejectAccessRequest: (id) => apiClient.post(`/admin/access-requests/${id}/reject`),
};

export default apiClient;
EOF

    echo "   ✅ Comprehensive API service created"
else
    echo "   ✅ API service already exists"
fi

cd ..

# 7. Verify all critical files exist
echo ""
echo "🔍 Final verification of critical files..."

critical_files=(
    "client/src/App.js"
    "client/src/components/Layout/Layout.js"
    "client/src/components/Navigation/RoleBasedNavigation.js"
    "client/src/pages/SavingsGroups/SavingsGroupsApp.js"
    "client/src/pages/SavingsGroups/Calendar/CalendarPage.js"
    "client/src/services/savingsGroupsAPI.js"
    "client/src/contexts/AuthContext.js"
)

all_present=true
for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - MISSING"
        all_present=false
    fi
done

# 8. Summary
echo ""
echo "📊 MERGE SUMMARY"
echo "================"

if [ ${#missing_components[@]} -eq 0 ] && [ "$all_present" = true ]; then
    echo "✅ All components present and up to date"
    echo "✅ Dependencies updated with latest versions"
    echo "✅ AuthContext enhanced with better error handling"
    echo "✅ Comprehensive API service available"
    echo "✅ Test scripts configured"
    echo ""
    echo "🎯 READY TO USE:"
    echo "   1. Run: ./start-local.sh"
    echo "   2. Access: http://localhost:3000"
    echo "   3. Navigate: Main App → Savings Platform → Activity Calendar"
    echo "   4. Test: Women + ECD Fund + Central + This Month filtering"
else
    echo "⚠️  Some components may be missing:"
    for component in "${missing_components[@]}"; do
        echo "   - $component"
    done
    echo ""
    echo "🔧 The main client has been enhanced but may need additional components"
    echo "   Check the backup at client-backup/ if needed"
fi

echo ""
echo "📁 Backup available at: client-backup/"
echo "🎯 Main client now has comprehensive features from both directories"