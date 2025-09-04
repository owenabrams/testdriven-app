import React from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Divider
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';

const AddUser = (props) => {
  if (!props.isAuthenticated) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to add users
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <PersonAddIcon sx={{ mr: 2, color: 'primary.main' }} />
        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
          Add New User
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Box component="form" onSubmit={(event) => props.addUser(event)}>
        <TextField
          name="username"
          label="Username"
          type="text"
          placeholder="Enter a username"
          required
          fullWidth
          margin="normal"
          value={props.username}
          onChange={props.handleChange}
          variant="outlined"
          sx={{ mb: 2 }}
        />
        
        <TextField
          name="email"
          label="Email Address"
          type="email"
          placeholder="Enter an email address"
          required
          fullWidth
          margin="normal"
          value={props.email}
          onChange={props.handleChange}
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
          value={props.password}
          onChange={props.handleChange}
          variant="outlined"
          sx={{ mb: 3 }}
        />
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          startIcon={<PersonAddIcon />}
          sx={{ 
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 'bold',
            textTransform: 'none'
          }}
        >
          Add User
        </Button>
      </Box>
    </Paper>
  );
};

export default AddUser;
