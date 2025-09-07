import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert
} from '@mui/material';
import {
  SupervisorAccount as SupervisorAccountIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const AdminPanel = () => {
  const { isAuthenticated } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_USERS_SERVICE_URL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
      } else {
        setMessage({ text: 'Failed to fetch users', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error fetching users', type: 'error' });
    }
    setLoading(false);
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_USERS_SERVICE_URL}/admin/services`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setServices(data.data.services);
      } else {
        setMessage({ text: 'Failed to fetch services', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error fetching services', type: 'error' });
    }
    setLoading(false);
  };

  const fetchAccessRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.REACT_APP_USERS_SERVICE_URL}/admin/access-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccessRequests(data.data.requests);
      } else {
        setMessage({ text: 'Failed to fetch access requests', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Error fetching access requests', type: 'error' });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (tabValue === 0) fetchUsers();
      else if (tabValue === 1) fetchServices();
      else if (tabValue === 2) fetchAccessRequests();
    }
  }, [isAuthenticated, tabValue]);

  if (!isAuthenticated) {
    return (
      <Container maxWidth="md">
        <Alert severity="warning" sx={{ mt: 4 }}>
          You must be logged in to access the admin panel.
        </Alert>
      </Container>
    );
  }

  const getRoleChip = (user) => {
    if (user.is_super_admin) {
      return <Chip label="Super Admin" color="error" size="small" />;
    } else if (user.role === 'service_admin') {
      return <Chip label="Service Admin" color="warning" size="small" />;
    } else if (user.admin) {
      return <Chip label="Admin" color="primary" size="small" />;
    } else {
      return <Chip label="User" color="default" size="small" />;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SupervisorAccountIcon sx={{ mr: 2, fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
              Admin Panel
            </Typography>
          </Box>

          {message.text && (
            <Alert 
              severity={message.type} 
              sx={{ mb: 3 }}
              onClose={() => setMessage({ text: '', type: '' })}
            >
              {message.text}
            </Alert>
          )}

          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab 
              icon={<PeopleIcon />} 
              label="Users" 
              iconPosition="start"
            />
            <Tab 
              icon={<BusinessIcon />} 
              label="Services" 
              iconPosition="start"
            />
            <Tab 
              icon={<SettingsIcon />} 
              label="Access Requests" 
              iconPosition="start"
            />
          </Tabs>

          {/* Users Tab */}
          {tabValue === 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>System Users</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Username</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell>Active</TableCell>
                      <TableCell>Managed Services</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleChip(user)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.active ? 'Active' : 'Inactive'} 
                            color={user.active ? 'success' : 'default'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          {user.managed_services?.length > 0 
                            ? user.managed_services.join(', ') 
                            : 'None'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Services Tab */}
          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>System Services</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Endpoint</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Admins</TableCell>
                      <TableCell>Users</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell>{service.id}</TableCell>
                        <TableCell>{service.name}</TableCell>
                        <TableCell>{service.description}</TableCell>
                        <TableCell>{service.endpoint_url}</TableCell>
                        <TableCell>
                          <Chip 
                            label={service.active ? 'Active' : 'Inactive'} 
                            color={service.active ? 'success' : 'default'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>{service.admin_count}</TableCell>
                        <TableCell>{service.user_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Access Requests Tab */}
          {tabValue === 2 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>Pending Access Requests</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell>Permissions</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {accessRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.id}</TableCell>
                        <TableCell>{request.user.username}</TableCell>
                        <TableCell>{request.service.name}</TableCell>
                        <TableCell>{request.requested_permissions}</TableCell>
                        <TableCell>{request.reason}</TableCell>
                        <TableCell>
                          {new Date(request.request_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="small" 
                            color="success" 
                            sx={{ mr: 1 }}
                          >
                            Approve
                          </Button>
                          <Button 
                            size="small" 
                            color="error"
                          >
                            Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {accessRequests.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No pending access requests
                </Typography>
              )}
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminPanel;