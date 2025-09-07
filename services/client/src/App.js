import React, { useState, useCallback } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Container, Box, Typography } from '@mui/material';

// Main Components
import UsersList from './components/UsersList';
import About from './components/About';
import NavBar from './components/NavBar';
import SimpleForm from './components/forms/SimpleForm';
import Logout from './components/Logout';
import UserStatus from './components/UserStatus';
import Message from './components/Message';
import ModernDemo from './components/ModernDemo';
import TestingDemo from './components/TestingDemo';
import AdminPanel from './components/AdminPanel';

// Hooks
import { useUsers, useAddUser, useAuthMutations } from './hooks/useUsers';
import { useAuth } from './context/AuthContext';

// Custom hook for messages
const useMessage = () => {
  const [message, setMessage] = useState({ name: null, type: null });
  
  const createMessage = useCallback((name, type) => {
    setMessage({ name, type });
    setTimeout(() => {
      setMessage({ name: null, type: null });
    }, 3000);
  }, []);
  
  const removeMessage = useCallback(() => {
    setMessage({ name: null, type: null });
  }, []);
  
  return { message, createMessage, removeMessage };
};

const App = () => {
  // State management with hooks
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: ''
  });
  
  // Custom hooks
  const { isAuthenticated, login, logout } = useAuth();
  const { message, createMessage, removeMessage } = useMessage();
  
  // React Query hooks
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers();
  const addUserMutation = useAddUser();
  const { loginMutation, registerMutation } = useAuthMutations();
  
  // Form change handlers
  const handleChange = (event) => {
    const { name, value } = event.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };
  

  
  // Add user handler
  const addUser = async (event) => {
    event.preventDefault();
    
    try {
      await addUserMutation.mutateAsync(userForm);
      setUserForm({ username: '', email: '', password: '' });
      createMessage('User added successfully!', 'success');
    } catch (err) {
      console.error('Error adding user:', err);
      createMessage('Error adding user. Please try again.', 'error');
    }
  };
  
  // Login user function for Form component
  const loginUser = async (token) => {
    try {
      // Store token first
      localStorage.setItem('authToken', token);
      
      // Validate token and get user data
      const response = await fetch(`${process.env.REACT_APP_USERS_SERVICE_URL}/auth/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const responseData = await response.json();
        // Call login with both token and user data
        login(token, responseData.data);
        // Don't create message here - let the form handle it
      } else {
        localStorage.removeItem('authToken');
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      localStorage.removeItem('authToken');
      createMessage('Login failed. Please try again.', 'error');
    }
  };
  
  // Logout handler
  const logoutUser = () => {
    logout();
    setUserForm({ username: '', email: '', password: '' });
    createMessage('You have been logged out successfully.', 'info');
  };
  
  // Show error message if users failed to load (using useEffect to prevent infinite renders)
  React.useEffect(() => {
    if (usersError) {
      // Only show error message if it's not a network connection issue on initial load
      const isNetworkError = usersError.code === 'ERR_NETWORK' || usersError.message?.includes('Network Error');
      if (isNetworkError) {
        console.warn('API connection issue - this is normal if the Flask API is starting up');
        // Don't show error message for network issues during startup
      } else {
        createMessage('Error loading users. Please try again.', 'error');
      }
    }
  }, [usersError, createMessage]);

  return (
    <div>
      <NavBar
        title="TestDriven.io"
        logoutUser={logoutUser}
        isAuthenticated={isAuthenticated}
      />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {message.name && message.type && (
          <Message
            messageName={message.name}
            messageType={message.type}
            removeMessage={removeMessage}
          />
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 800 }}>
            <Routes>
              <Route
                path="/"
                element={
                  <UsersList 
                    users={users} 
                    loading={usersLoading}
                  />
                }
              />
              <Route path="/about" element={<About />} />
              <Route path="/demo" element={<ModernDemo />} />
              <Route path="/testing" element={<TestingDemo />} />
              <Route
                path="/register"
                element={
                  <SimpleForm
                    formType="Register"
                    isAuthenticated={isAuthenticated}
                    loginUser={loginUser}
                    createMessage={createMessage}
                  />
                }
              />
              <Route
                path="/login"
                element={
                  <SimpleForm
                    formType="Login"
                    isAuthenticated={isAuthenticated}
                    loginUser={loginUser}
                    createMessage={createMessage}
                  />
                }
              />
              <Route
                path="/logout"
                element={
                  <Logout
                    logoutUser={logoutUser}
                    isAuthenticated={isAuthenticated}
                  />
                }
              />
              <Route
                path="/status"
                element={
                  <UserStatus isAuthenticated={isAuthenticated} />
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminPanel />
                }
              />
            </Routes>
          </Box>
        </Box>
      </Container>
    </div>
  );
};

export default App;
