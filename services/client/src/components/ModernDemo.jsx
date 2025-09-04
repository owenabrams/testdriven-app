import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Grid,
  Chip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

// Import both old and new components
import UsersList from './UsersList';
import ModernUsersList from './ModernUsersList';
import AddUser from './AddUser';
import ModernAddUser from './ModernAddUser';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ModernDemo = () => {
  const [tab, setTab] = useState(0);
  const { isAuthenticated } = useAuth();
  
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom align="center">
        🚀 Modern React Patterns Demo
      </Typography>
      
      <Typography variant="h6" component="p" gutterBottom align="center" color="text.secondary">
        Compare traditional class components with modern React patterns
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={handleTabChange} centered>
          <Tab label="Users List Comparison" />
          <Tab label="Add User Comparison" />
          <Tab label="Features Overview" />
        </Tabs>
      </Box>

      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 'fit-content' }}>
              <Typography variant="h5" gutterBottom>
                📊 Traditional Component
                <Chip label="Class-based" color="default" size="small" sx={{ ml: 1 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uses class component with state management and lifecycle methods
              </Typography>
              <UsersList users={[]} loading={false} />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 'fit-content' }}>
              <Typography variant="h5" gutterBottom>
                ⚡ Modern Component
                <Chip label="React Query" color="primary" size="small" sx={{ ml: 1 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uses React Query for data fetching with automatic caching and error handling
              </Typography>
              <ModernUsersList />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>
                📝 Traditional Form
                <Chip label="Manual State" color="default" size="small" sx={{ ml: 1 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Manual form state management with custom validation
              </Typography>
              <AddUser
                username=""
                email=""
                password=""
                addUser={() => {}}
                handleChange={() => {}}
                isAuthenticated={isAuthenticated}
                loading={false}
              />
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>
                🎯 Modern Form
                <Chip label="React Hook Form" color="primary" size="small" sx={{ ml: 1 }} />
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                React Hook Form with Yup validation and React Query mutations
              </Typography>
              <ModernAddUser isAuthenticated={isAuthenticated} />
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom color="text.secondary">
                📚 Traditional Approach
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <li>Class components with lifecycle methods</li>
                <li>Manual state management with setState</li>
                <li>Custom form validation logic</li>
                <li>Manual loading states</li>
                <li>Axios calls in components</li>
                <li>Method binding in constructor</li>
                <li>Prop drilling for state</li>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom color="primary">
                🚀 Modern Approach
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <li><strong>React Hooks</strong> - Functional components with hooks</li>
                <li><strong>React Query</strong> - Automatic caching, background updates</li>
                <li><strong>React Hook Form</strong> - Performant form validation</li>
                <li><strong>Yup Schema</strong> - Declarative validation rules</li>
                <li><strong>Context API</strong> - Global state management</li>
                <li><strong>Custom Hooks</strong> - Reusable logic separation</li>
                <li><strong>TypeScript Ready</strong> - Better developer experience</li>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        <Paper sx={{ p: 3, mt: 3, backgroundColor: 'success.light', color: 'success.contrastText' }}>
          <Typography variant="h6" gutterBottom>
            ✨ Benefits of Modern Approach:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2">
                <strong>Better Performance</strong><br />
                Automatic memoization and optimizations
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2">
                <strong>Developer Experience</strong><br />
                Less boilerplate, better debugging
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2">
                <strong>Maintainability</strong><br />
                Cleaner code, easier testing
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2">
                <strong>Modern Standards</strong><br />
                Industry best practices
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>
    </Container>
  );
};

export default ModernDemo;