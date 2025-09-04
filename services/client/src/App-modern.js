import React, { useState, useEffect, useCallback } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Container, Box, Typography } from '@mui/material';
import axios from 'axios';

// Main Components
import UsersList from './components/UsersList';
import AddUser from './components/AddUser';
import About from './components/About';
import NavBar from './components/NavBar';
import Form from './components/Form';
import Logout from './components/Logout';
import UserStatus from './components/UserStatus';
import Message from './components/Message';

// Custom hooks for better separation of concerns
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const token = window.localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);
  
  const login = (token) => {
    window.localStorage.setItem('authToken', token);
    setIsAuthenticated(true);
  };
  
  const logout = () => {
    window.localStorage.clear();
    setIsAuthenticated(false);
  };
  
  return { isAuthenticated, login, logout };
};

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
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  
  // Custom hooks
  const { isAuthenticated, login, logout } = useAuth();
  const { message, createMessage, removeMessage } = useMessage();
  
  // Fetch users with useCallback for optimization
  const getUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_USERS_SERVICE_URL}/users`);
      setUsers(res.data.data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
      createMessage('Error loading users. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [createMessage]);
  
  // Load users on mount
  useEffect(() => {
    getUsers();
  }, [getUsers]);
  
  // Add user handler
  const addUser = async (event) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${process.env.REACT_APP_USERS_SERVICE_URL}/users`, userForm);
      await getUsers();
      setUserForm({ username: '', email: '', password: '' });
      createMessage('User added successfully!', 'success');
    } catch (err) {
      console.error('Error adding user:', err);
      createMessage('Error adding user. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Form change handlers
  const handleChange = (event) => {
    const { name, value } = event.target;
    setUserForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Auth form submit
  const handleUserFormSubmit = async (event) => {
    event.preventDefault();
    const formType = window.location.href.split('/').reverse()[0];
    
    let data = {
      email: formData.email,
      password: formData.password
    };
    
    if (formType === 'register') {
      data.username = formData.username;
    }
    
    setLoading(true);
    
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_USERS_SERVICE_URL}/auth/${formType}`,
        data
      );
      
      setFormData({ username: '', email: '', password: '' });
      login(res.data.auth_token);
      await getUsers();
      
      createMessage(
        formType === 'register' ? 'Successfully registered! Welcome!' : 'Welcome back!',
        'success'
      );
    } catch (err) {
      console.error(`${formType} error:`, err);
      
      if (formType === 'login') {
        createMessage('Invalid email or password. Please try again.', 'error');
      } else if (formType === 'register') {
        createMessage('Registration failed. User may already exist.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Logout handler
  const logoutUser = () => {
    logout();
    setFormData({ username: '', email: '', password: '' });
    setUserForm({ username: '', email: '', password: '' });
    createMessage('You have been logged out successfully.', 'info');
  };

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
                  <div>
                    <Typography variant="h2" component="h1" gutterBottom sx={{ mb: 3 }}>
                      All Users
                    </Typography>
                    <AddUser
                      username={userForm.username}
                      email={userForm.email}
                      password={userForm.password}
                      addUser={addUser}
                      handleChange={handleChange}
                      isAuthenticated={isAuthenticated}
                      loading={loading}
                    />
                    <Box sx={{ mt: 4 }}>
                      <UsersList 
                        users={users} 
                        loading={loading}
                      />
                    </Box>
                  </div>
                }
              />
              <Route path="/about" element={<About />} />
              <Route
                path="/register"
                element={
                  <Form
                    formType="Register"
                    formData={formData}
                    handleUserFormSubmit={handleUserFormSubmit}
                    handleFormChange={handleFormChange}
                    isAuthenticated={isAuthenticated}
                    loading={loading}
                  />
                }
              />
              <Route
                path="/login"
                element={
                  <Form
                    formType="Login"
                    formData={formData}
                    handleUserFormSubmit={handleUserFormSubmit}
                    handleFormChange={handleFormChange}
                    isAuthenticated={isAuthenticated}
                    loading={loading}
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
            </Routes>
          </Box>
        </Box>
      </Container>
    </div>
  );
};

export default App;