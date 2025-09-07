import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Container,
  Divider
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import FormErrors from './FormErrors';
import { registerFormRules, loginFormRules } from './form-rules';

const Form = (props) => {
  // Local state management for form data
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });

  // Form validation state
  const [registerRules, setRegisterRules] = useState(registerFormRules);
  const [loginRules, setLoginRules] = useState(loginFormRules);
  const [valid, setValid] = useState(false);

  // Clear form function
  const clearForm = useCallback(() => {
    setFormData({
      username: '',
      email: '',
      password: ''
    });
  }, []);

  // Email validation
  const validateEmail = useCallback((email) => {
    // eslint-disable-next-line
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  }, []);

  // Reset all validation rules
  const resetRules = () => {
    const resetRegisterRules = registerFormRules.map(rule => ({ ...rule, valid: false }));
    const resetLoginRules = loginFormRules.map(rule => ({ ...rule, valid: false }));
    setRegisterRules(resetRegisterRules);
    setLoginRules(resetLoginRules);
    setValid(false);
  };

  // Check if all rules are valid
  const allTrue = useCallback(() => {
    const formRules = props.formType === 'Register' ? registerRules : loginRules;
    return formRules.every(rule => rule.valid);
  }, [props.formType, registerRules, loginRules]);

  // Validate form
  const validateForm = useCallback(() => {
    // Validate register form
    if (props.formType === 'Register') {
      const updatedRules = [...registerFormRules];
      if (formData.username.length > 5) updatedRules[0].valid = true;
      if (formData.email.length > 5) updatedRules[1].valid = true;
      if (validateEmail(formData.email)) updatedRules[2].valid = true;
      if (formData.password.length > 10) updatedRules[3].valid = true;
      setRegisterRules(updatedRules);
      
      setValid(updatedRules.every(rule => rule.valid));
    }
    
    // Validate login form
    if (props.formType === 'Login') {
      const updatedRules = [...loginFormRules];
      if (formData.email.length > 0) updatedRules[0].valid = true;
      if (formData.password.length > 0) updatedRules[1].valid = true;
      setLoginRules(updatedRules);
      
      setValid(updatedRules.every(rule => rule.valid));
    }
  }, [formData, props.formType, validateEmail]);

  // Handle form input changes
  const handleFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  // Handle form submission
  const handleUserFormSubmit = useCallback(async (event) => {
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
      clearForm();
      props.loginUser(res.data.auth_token);
    } catch (err) {
      console.log(err);
      if (formType === 'Login') {
        props.createMessage('User does not exist.', 'danger');
      }
      if (formType === 'Register') {
        props.createMessage('That user already exists.', 'danger');
      }
    }
  }, [formData, props.formType, props.loginUser, props.createMessage, clearForm]);

  // Clear form on mount
  useEffect(() => {
    clearForm();
    resetRules();
  }, [clearForm]);

  // Clear form when formType changes (modern equivalent of componentWillReceiveProps)
  useEffect(() => {
    clearForm();
    resetRules();
  }, [props.formType, clearForm]);

  // Validate form when data changes
  useEffect(() => {
    validateForm();
  }, [validateForm]);

  if (props.isAuthenticated) {
    return <Navigate to="/" />;
  }

  const isLogin = props.formType === 'Login';
  const isRegister = props.formType === 'Register';
  const currentFormRules = isRegister ? registerRules : loginRules;

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            {isLogin && <LoginIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />}
            {isRegister && <PersonAddIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />}
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              {isLogin ? 'Log In' : 'Register'}
            </Typography>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <FormErrors
            formType={props.formType}
            formRules={currentFormRules}
          />
          
          <Box component="form" onSubmit={handleUserFormSubmit}>
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
                onChange={handleFormChange}
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
              onChange={handleFormChange}
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
              onChange={handleFormChange}
              variant="outlined"
              sx={{ mb: 3 }}
            />
            
            <button
              type="submit"
              disabled={!valid}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                backgroundColor: valid ? '#1976d2' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: valid ? 'pointer' : 'not-allowed',
                opacity: valid ? 1 : 0.6
              }}
            >
              Submit
            </button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Form;
