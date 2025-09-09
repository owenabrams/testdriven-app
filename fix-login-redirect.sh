#!/bin/bash

# Fix Login Redirect Issue

echo "🔧 Fixing Login Redirect Issue"
echo "=============================="

# 1. Create environment file for React
echo "📝 Creating React environment file..."
cat > client/.env << EOF
REACT_APP_USERS_SERVICE_URL=http://localhost:5000
REACT_APP_API_URL=http://localhost:5000
GENERATE_SOURCEMAP=false
EOF
echo "   ✅ Created client/.env"

# 2. Add debugging to AuthContext
echo ""
echo "🔍 Adding debugging to AuthContext..."

# Create a backup
cp client/src/contexts/AuthContext.js client/src/contexts/AuthContext.js.backup

# Add console.log statements to help debug
cat > client/src/contexts/AuthContext.js << 'EOF'
import React, { createContext, useContext, useState, useEffect, useReducer } from 'react';
import { apiClient } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

// Auth reducer for better state management
const authReducer = (state, action) => {
  console.log('🔄 Auth reducer:', action.type, action.payload);
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOGIN_SUCCESS':
      console.log('✅ LOGIN_SUCCESS - User:', action.payload);
      return { ...state, user: action.payload, loading: false };
    case 'LOGOUT':
      console.log('🚪 LOGOUT');
      return { ...state, user: null, loading: false };
    case 'AUTH_ERROR':
      console.log('❌ AUTH_ERROR:', action.payload);
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
    console.log('🔄 AuthProvider useEffect - checking for existing token');
    const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken');
    console.log('🔑 Found token:', token ? 'Yes' : 'No');
    
    if (token) {
      // Verify token and get user info
      console.log('🔍 Verifying token...');
      apiClient.get('/auth/status')
        .then(response => {
          console.log('📡 Auth status response:', response.data);
          if (response.data.status === 'success') {
            dispatch({ type: 'LOGIN_SUCCESS', payload: response.data.data });
          } else {
            console.log('❌ Token invalid, removing...');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('authToken');
            dispatch({ type: 'LOGOUT' });
          }
        })
        .catch((error) => {
          console.error('❌ Auth verification failed:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('authToken');
          dispatch({ type: 'LOGOUT' });
        });
    } else {
      console.log('🔄 No token found, setting loading to false');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = async (email, password) => {
    console.log('🔐 Login attempt for:', email);
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      console.log('📡 Login response:', response.data);

      if (response.data.status === 'success') {
        const { auth_token, user: userData } = response.data;
        console.log('✅ Login successful, storing token and user data');
        localStorage.setItem('auth_token', auth_token);
        dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
        toast.success('Login successful!');
        return { success: true };
      } else {
        const message = response.data.message || 'Login failed';
        console.log('❌ Login failed:', message);
        dispatch({ type: 'AUTH_ERROR', payload: message });
        toast.error(message);
        return { success: false, message };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      console.error('❌ Login error:', error);
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

  console.log('🔄 AuthProvider render - user:', state.user ? 'Logged in' : 'Not logged in', 'loading:', state.loading);

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

echo "   ✅ Added debugging to AuthContext"

# 3. Instructions
echo ""
echo "🎯 DEBUGGING STEPS:"
echo "1. The React app should automatically reload with new environment"
echo "2. Open browser DevTools (F12) and go to Console tab"
echo "3. Try logging in - you'll see detailed debug messages"
echo "4. Look for the specific step where it fails"
echo ""
echo "📋 What to look for in console:"
echo "   - '🔐 Login attempt for: superadmin@testdriven.io'"
echo "   - '✅ Login successful, storing token and user data'"
echo "   - '🔄 AuthProvider render - user: Logged in'"
echo ""
echo "🔧 If you still see issues:"
echo "   1. Check Network tab for failed API calls"
echo "   2. Look for CORS errors in console"
echo "   3. Try manually refreshing the page after login"
echo "   4. Check if token is stored in Application > Local Storage"

echo ""
echo "✅ DEBUG VERSION READY!"
echo "   Open http://localhost:3000 and check browser console while logging in"