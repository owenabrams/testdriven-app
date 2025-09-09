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
