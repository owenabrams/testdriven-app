import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Container,
  Divider
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Login as LoginIcon
} from '@mui/icons-material';

const SimpleForm = (props) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formType = props.formType;
    
    const data = {
      email: formData.email,
      password: formData.password
    };
    
    if (formType === 'Register') {
      data.username = formData.username;
    }
    
    const url = `${process.env.REACT_APP_USERS_SERVICE_URL}/auth/${formType.toLowerCase()}`;
    
    try {
      const res = await axios.post(url, data);
      setFormData({ username: '', email: '', password: '' });
      // Create success message before authentication to ensure it appears
      props.createMessage('Successfully ' + (formType === 'Login' ? 'logged in' : 'registered') + '!', 'success');
      await props.loginUser(res.data.auth_token);
    } catch (err) {
      console.log(err);
      if (formType === 'Login') {
        props.createMessage('Login failed. Please check your credentials.', 'error');
      }
      if (formType === 'Register') {
        props.createMessage('Registration failed. User may already exist.', 'error');
      }
    }
  };

  if (props.isAuthenticated) {
    return <Navigate to="/" />;
  }

  const isLogin = props.formType === 'Login';
  const isRegister = props.formType === 'Register';

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {isLogin && <LoginIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />}
            {isRegister && <PersonAddIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />}
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              {isLogin ? 'Login' : 'Register'}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Box component="form" onSubmit={handleSubmit}>
            {isRegister && (
              <TextField
                name="username"
                label="Username"
                type="text"
                placeholder="Enter a username"
                required
                fullWidth
                margin="normal"
                value={formData.username}
                onChange={handleChange}
                variant="outlined"
                sx={{ mb: 2 }}
              />
            )}
            
            <TextField
              name="email"
              label="Email Address"
              type="email"
              placeholder="Enter an email address"
              required
              fullWidth
              margin="normal"
              value={formData.email}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 2 }}
            />
            
            <TextField
              name="password"
              label="Password"
              type="password"
              placeholder="Enter a password"
              required
              fullWidth
              margin="normal"
              value={formData.password}
              onChange={handleChange}
              variant="outlined"
              sx={{ mb: 3 }}
            />
            
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 'bold' }}
            >
              {isLogin ? 'Login' : 'Register'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default SimpleForm;