import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import { useAddUser } from '../hooks/useUsers';

// Validation schema
const addUserSchema = yup.object({
  username: yup.string().min(3, 'Username must be at least 3 characters').required('Username is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

const ModernAddUser = ({ isAuthenticated }) => {
  const addUserMutation = useAddUser();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: yupResolver(addUserSchema),
    mode: 'onBlur'
  });
  
  const onSubmit = async (data) => {
    try {
      await addUserMutation.mutateAsync(data);
      reset(); // Clear form on success
    } catch (error) {
      // Error is handled by React Query and can be displayed via mutation.error
      console.error('Error adding user:', error);
    }
  };
  
  if (!isAuthenticated) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Alert severity="info">
          You must be logged in to add users.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h3" gutterBottom>
        Add User
      </Typography>
      
      {addUserMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error adding user: {addUserMutation.error?.response?.data?.message || 'Something went wrong'}
        </Alert>
      )}
      
      {addUserMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          User added successfully!
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <TextField
          margin="normal"
          required
          fullWidth
          id="username"
          label="Username"
          autoComplete="username"
          error={!!errors.username}
          helperText={errors.username?.message}
          {...register('username')}
        />
        
        <TextField
          margin="normal"
          required
          fullWidth
          id="email"
          label="Email Address"
          type="email"
          autoComplete="email"
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
          autoComplete="new-password"
          error={!!errors.password}
          helperText={errors.password?.message}
          {...register('password')}
        />
        
        <Button
          type="submit"
          variant="contained"
          sx={{ mt: 2 }}
          disabled={addUserMutation.isPending}
          startIcon={addUserMutation.isPending ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {addUserMutation.isPending ? 'Adding...' : 'Add User'}
        </Button>
      </Box>
    </Paper>
  );
};

export default ModernAddUser;