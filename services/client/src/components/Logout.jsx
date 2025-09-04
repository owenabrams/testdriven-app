import React, { Component } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Container,
  CircularProgress
} from '@mui/material';
import {
  Logout as LogoutIcon
} from '@mui/icons-material';

class Logout extends Component {
  componentDidMount() {
    this.props.logoutUser();
  }
  
  render() {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, mb: 4 }}>
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <LogoutIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Logging Out...
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              You are now logged out. Redirecting to home page...
            </Typography>
            <CircularProgress color="primary" />
          </Paper>
        </Box>
        <Navigate to="/" />
      </Container>
    );
  }
};

export default Logout;
