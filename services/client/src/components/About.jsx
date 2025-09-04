import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Info as InfoIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Cloud as CloudIcon
} from '@mui/icons-material';

const About = () => (
  <Container maxWidth="md">
    <Box sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <InfoIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
            About TestDriven.io
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          Modern User Management System
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ lineHeight: 1.7 }}>
          This application demonstrates a full-stack user management system built with modern web technologies. 
          It showcases best practices in React development, Material-UI design, and Flask backend architecture.
        </Typography>

        <Typography variant="h6" gutterBottom sx={{ mt: 3, color: 'primary.main', fontWeight: 'bold' }}>
          Key Features
        </Typography>

        <List>
          <ListItem>
            <ListItemIcon>
              <CodeIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="React 18 with Material-UI"
              secondary="Modern React with hooks, routing, and beautiful Material Design components"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <SecurityIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Authentication & Authorization"
              secondary="Secure user registration, login, and JWT-based authentication"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <SpeedIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Responsive Design"
              secondary="Mobile-first design with responsive Material-UI components"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CloudIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="Local Development"
              secondary="Simple local development setup with SQLite database"
            />
          </ListItem>
        </List>

        <Box sx={{ mt: 4, p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            Technology Stack
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Frontend:</strong> React 18, Material-UI, React Router, Axios
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Backend:</strong> Flask, SQLAlchemy, SQLite, JWT Authentication
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Development:</strong> Local setup with Python virtual environment
          </Typography>
          <Typography variant="body2">
            <strong>Testing:</strong> Jest, React Testing Library, Python unittest
          </Typography>
        </Box>
      </Paper>
    </Box>
  </Container>
);

export default About;
