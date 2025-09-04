import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link as MuiLink,
  CircularProgress
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

// Validation schemas
const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

const registerSchema = yup.object({
  username: yup.string().min(3, 'Username must be at least 3 characters').required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

const ModernForm = ({ formType, onSubmit, isAuthenticated, loading }) => {
  const isRegister = formType === 'Register';
  const schema = isRegister ? registerSchema : loginSchema;
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(schema),
    mode: 'onBlur'
  });
  
  // Redirect if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  const onSubmitForm = async (data) => {
    // Create a synthetic event to match the existing API
    const syntheticEvent = {
      preventDefault: () => {},
      target: {
        form: {
          elements: {
            email: { value: data.email },
            password: { value: data.password },
            username: { value: data.username }
          }
        }
      }
    };
    
    await onSubmit(syntheticEvent);
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
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            {formType}
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit(onSubmitForm)} sx={{ mt: 1 }}>
            {isRegister && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                autoComplete="username"
                autoFocus
                error={!!errors.username}
                helperText={errors.username?.message}
                {...register('username')}
              />
            )}
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              type="email"
              autoComplete="email"
              autoFocus={!isRegister}
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email')}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password')}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading || isSubmitting}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
            >
              {loading ? 'Processing...' : formType}
            </Button>
            
            <Box textAlign="center">
              {isRegister ? (
                <Typography variant="body2">
                  Already have an account?{' '}
                  <MuiLink component={Link} to="/login" variant="body2">
                    Sign In
                  </MuiLink>
                </Typography>
              ) : (
                <Typography variant="body2">
                  Don't have an account?{' '}
                  <MuiLink component={Link} to="/register" variant="body2">
                    Sign Up
                  </MuiLink>
                </Typography>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ModernForm;