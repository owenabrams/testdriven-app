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
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const loginForm = useForm();
  const registerForm = useForm();

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    setError('');
  };

  const onLogin = async (data) => {
    setLoading(true);
    setError('');
    
    const result = await login(data.email, data.password);
    
    if (!result.success) {
      setError(result.message);
    }
    
    setLoading(false);
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
              <Box component="form" onSubmit={loginForm.handleSubmit(onLogin)}>
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
                >
                  {loading ? 'Signing In...' : 'Sign In'}
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