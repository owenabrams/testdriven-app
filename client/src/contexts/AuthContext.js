import React, { createContext, useContext, useState, useEffect, useReducer } from 'react';
import { apiClient, authAPI } from '../services/api';
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
      authAPI.getStatus()
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
    console.log('🔐 Password provided:', password ? 'Yes' : 'No');
    console.log('🌐 API URL:', `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/login`);

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      console.log('🌐 Making API call...');
      const response = await authAPI.login(email, password);

      console.log('📡 Login response received:', response);
      console.log('📡 Login response data:', response.data);
      console.log('📡 Response status:', response.status);

      if (response.data && response.data.status === 'success') {
        const { auth_token, user: userData } = response.data;
        console.log('✅ Login successful, storing token and user data');
        console.log('🔑 Token received:', auth_token ? 'Yes' : 'No');
        console.log('👤 User data received:', userData ? 'Yes' : 'No');

        localStorage.setItem('auth_token', auth_token);

        // If user data is not in response, fetch it
        if (userData) {
          console.log('👤 Using provided user data:', userData);
          dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
        } else {
          console.log('👤 Fetching user data with token...');
          // Fetch user data using the token
          try {
            const userResponse = await authAPI.getStatus();
            console.log('👤 User data response:', userResponse.data);
            if (userResponse.data.status === 'success') {
              dispatch({ type: 'LOGIN_SUCCESS', payload: userResponse.data.data });
            }
          } catch (error) {
            console.error('Failed to fetch user data:', error);
            dispatch({ type: 'LOGIN_SUCCESS', payload: { email } }); // Fallback
          }
        }

        toast.success('Login successful!');
        return { success: true };
      } else {
        const message = response.data?.message || 'Login failed - invalid response';
        console.log('❌ Login failed:', message);
        console.log('❌ Full response:', response.data);
        dispatch({ type: 'AUTH_ERROR', payload: message });
        toast.error(message);
        return { success: false, message };
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Network error - check if backend is running';
      console.error('❌ Login error details:', {
        error: error,
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method
      });
      dispatch({ type: 'AUTH_ERROR', payload: message });
      toast.error(message);
      return { success: false, message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await authAPI.register(userData);

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
