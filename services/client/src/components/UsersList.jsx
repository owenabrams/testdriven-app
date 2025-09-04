import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  Box
} from '@mui/material';

const UsersList = (props) => {
  if (props.loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          Loading users...
        </Typography>
      </Box>
    );
  }

  // Handle case where users array is empty or undefined
  if (!props.users || props.users.length === 0) {
    return (
      <div>
        <Typography variant="h2" component="h1" gutterBottom sx={{ mb: 3 }}>
          All Users
        </Typography>
        <hr />
        <br />
        
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No users found. 
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Register a new account to see users appear here!
          </Typography>
        </Box>
      </div>
    );
  }

  return (
    <div>
      <Typography variant="h2" component="h1" gutterBottom sx={{ mb: 3 }}>
        All Users
      </Typography>
      <hr />
      <br />
      
      <TableContainer component={Paper} elevation={2}>
        <Table sx={{ minWidth: 650 }} hover>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Email</strong></TableCell>
              <TableCell><strong>Username</strong></TableCell>
              <TableCell><strong>Active</strong></TableCell>
              <TableCell><strong>Admin</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {props.users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <Chip 
                    label={String(user.active)} 
                    color={user.active ? 'success' : 'error'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={String(user.admin)} 
                    color={user.admin ? 'primary' : 'default'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default UsersList;
