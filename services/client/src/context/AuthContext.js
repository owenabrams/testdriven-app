import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, isAuthenticated: true, user: action.payload };
    case 'LOGOUT':
      return { ...state, isAuthenticated: false, user: null };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  loading: false,
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Check auth status on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // You could validate the token here
      dispatch({ type: 'LOGIN', payload: { token } });
    }
  }, []);
  
  const login = (token, user) => {
    localStorage.setItem('authToken', token);
    dispatch({ type: 'LOGIN', payload: user });
  };
  
  const logout = () => {
    localStorage.removeItem('authToken');
    dispatch({ type: 'LOGOUT' });
  };
  
  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };
  
  const value = {
    ...state,
    login,
    logout,
    setLoading,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};