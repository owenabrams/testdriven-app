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
      // Validate token by checking user status
      const validateToken = async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_USERS_SERVICE_URL}/auth/status`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const responseData = await response.json();
            dispatch({ type: 'LOGIN', payload: responseData.data });
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('authToken');
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('authToken');
          dispatch({ type: 'LOGOUT' });
        }
      };
      
      validateToken();
    }
  }, []);
  
  const login = (token, user = null) => {
    localStorage.setItem('authToken', token);
    if (user) {
      dispatch({ type: 'LOGIN', payload: user });
    } else {
      // If no user data provided, fetch it
      const validateToken = async () => {
        try {
          const response = await fetch(`${process.env.REACT_APP_USERS_SERVICE_URL}/auth/status`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const responseData = await response.json();
            dispatch({ type: 'LOGIN', payload: responseData.data });
          } else {
            localStorage.removeItem('authToken');
            dispatch({ type: 'LOGOUT' });
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('authToken');
          dispatch({ type: 'LOGOUT' });
        }
      };
      
      validateToken();
    }
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