import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Container,
  Tab,
  Tabs,
  Alert,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function LoginPage() {
  console.log('🔄 LoginPage component loaded - enhanced debugging active');

  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  console.log('🔄 LoginPage: useAuth result - login:', typeof login, 'register:', typeof register);

  const loginForm = useForm();
  const registerForm = useForm();

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setError('');
  };

  const onLogin = async (data) => {
    console.log('🔐 LoginPage: Starting login process with data:', data);
    console.log('🔐 LoginPage: Form submission - this is from the FORM SUBMIT');
    console.log('🔐 LoginPage: login function type:', typeof login);
    console.log('🔐 LoginPage: login function:', login);

    // Check for form validation errors
    const formErrors = loginForm.formState.errors;
    console.log('🔐 LoginPage: Form validation errors:', formErrors);

    if (Object.keys(formErrors).length > 0) {
      console.log('❌ LoginPage: Form has validation errors, stopping login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🔐 LoginPage: About to call login function...');
      const result = await login(data.email, data.password);
      console.log('🔐 LoginPage: Login function completed, result:', result);

      if (!result.success) {
        setError(result.message);
        setLoading(false);
      } else {
        console.log('✅ LoginPage: Login successful, should redirect now');
        // Don't set loading to false here - let the auth context handle it
        // The App component will re-render when user state changes
      }
    } catch (error) {
      console.error('🔐 LoginPage: Login error details:', {
        error: error,
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setError('Login failed: ' + error.message);
      setLoading(false);
    }
  };

  const onDebugLogin = async () => {
    console.log('🧪 DEBUG BUTTON CLICKED - THIS SHOULD ALWAYS APPEAR!');
    console.log('🧪 Debug: Testing login with admin credentials');
    console.log('🧪 About to call onLogin function...');
    await onLogin({ email: 'admin@savingsgroup.com', password: 'admin123' });
    console.log('🧪 onLogin function call completed');
  };

  const onRegister = async (data) => {
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    
    const result = await register({
      username: data.username,
      email: data.email,
      password: data.password,
    });
    
    if (!result.success) {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h3" gutterBottom color="primary" fontWeight="bold">
          Enhanced Savings
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Empowering Communities Through Smart Savings
        </Typography>

        <Card sx={{ mt: 4, width: '100%' }}>
          <CardContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tab} onChange={handleTabChange} aria-label="auth tabs">
                <Tab label="Login" />
                <Tab label="Register" />
              </Tabs>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <TabPanel value={tab} index={0}>
              <Box
                component="form"
                onSubmit={(e) => {
                  console.log('🔥 FORM SUBMIT EVENT TRIGGERED!', e);
                  console.log('🔥 Form data before submission:', loginForm.getValues());
                  console.log('🔥 Form errors before submission:', loginForm.formState.errors);
                  console.log('🔥 Form is valid:', loginForm.formState.isValid);
                  return loginForm.handleSubmit(onLogin)(e);
                }}
              >
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  {...loginForm.register('email', { required: 'Email is required' })}
                  error={!!loginForm.formState.errors.email}
                  helperText={loginForm.formState.errors.email?.message}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  {...loginForm.register('password', { required: 'Password is required' })}
                  error={!!loginForm.formState.errors.password}
                  helperText={loginForm.formState.errors.password?.message}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                  onClick={(e) => {
                    console.log('🔥 SIGN IN BUTTON CLICKED!', e);
                    console.log('🔥 Button type:', e.target.type);
                    try {
                      console.log('🔥 Form values at button click:', loginForm.getValues());
                      console.log('🔥 Form state:', loginForm.formState);
                      console.log('🔥 Form errors:', loginForm.formState.errors);
                    } catch (error) {
                      console.error('🔥 Error getting form values:', error);
                    }
                  }}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>

                {/* Simple test button */}
                <Button
                  fullWidth
                  variant="text"
                  sx={{ mb: 1 }}
                  onClick={() => {
                    console.log('🔥 SIMPLE TEST BUTTON CLICKED - THIS SHOULD ALWAYS WORK!');
                    alert('Simple button clicked!');
                  }}
                >
                  🔥 Simple Test Button
                </Button>

                {/* Debug button for testing */}
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  onClick={onDebugLogin}
                  disabled={loading}
                >
                  🧪 Test Admin Login
                </Button>
              </Box>
            </TabPanel>

            <TabPanel value={tab} index={1}>
              <Box component="form" onSubmit={registerForm.handleSubmit(onRegister)}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="username"
                  label="Username"
                  name="username"
                  autoComplete="username"
                  {...registerForm.register('username', { required: 'Username is required' })}
                  error={!!registerForm.formState.errors.username}
                  helperText={registerForm.formState.errors.username?.message}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="register-email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  {...registerForm.register('email', { required: 'Email is required' })}
                  error={!!registerForm.formState.errors.email}
                  helperText={registerForm.formState.errors.email?.message}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="register-password"
                  {...registerForm.register('password', { 
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' }
                  })}
                  error={!!registerForm.formState.errors.password}
                  helperText={registerForm.formState.errors.password?.message}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  id="confirm-password"
                  {...registerForm.register('confirmPassword', { required: 'Please confirm your password' })}
                  error={!!registerForm.formState.errors.confirmPassword}
                  helperText={registerForm.formState.errors.confirmPassword?.message}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </Box>
            </TabPanel>
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
          Secure • Democratic • Transparent
        </Typography>
      </Box>
    </Container>
  );
}