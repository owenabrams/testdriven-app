import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Button } from '@mui/material';

export default function AdminDashboard({ userRole }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {userRole === 'super_admin' ? 'System Administration' : 'Service Administration'}
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Pending Approvals</Typography>
              <Typography variant="h4" color="warning.main">23</Typography>
              <Button variant="contained" sx={{ mt: 2 }} fullWidth>
                Review Pending
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Active Groups</Typography>
              <Typography variant="h4" color="primary.main">12</Typography>
              <Button variant="outlined" sx={{ mt: 2 }} fullWidth>
                Manage Groups
              </Button>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>System Health</Typography>
              <Typography variant="h4" color="success.main">98%</Typography>
              <Button variant="outlined" sx={{ mt: 2 }} fullWidth>
                View Details
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}