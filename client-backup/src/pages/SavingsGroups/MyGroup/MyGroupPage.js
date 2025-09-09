import React from 'react';
import { Box, Typography, Card, CardContent, Grid, List, ListItem, ListItemText, Avatar, Chip } from '@mui/material';

export default function MyGroupPage({ membershipData, userRole }) {
  const mockGroupData = {
    name: \"Kampala Women's Cooperative\",
    members: [
      { name: 'Sarah Nakato', role: 'Chair', balance: 500000 },
      { name: 'Mary Nambi', role: 'Treasurer', balance: 400000 },
      { name: 'Grace Mukasa', role: 'Secretary', balance: 350000 },
      { name: 'Alice Ssali', role: 'Member', balance: 300000 },
      { name: 'Jane Nakirya', role: 'Member', balance: 250000 },
    ]
  };

  return (
    <Box>
      <Typography variant=\"h5\" gutterBottom>My Group</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant=\"h6\" gutterBottom>Group Members</Typography>
              <List>
                {mockGroupData.members.map((member, index) => (
                  <ListItem key={index}>
                    <Avatar sx={{ mr: 2 }}>{member.name.charAt(0)}</Avatar>
                    <ListItemText
                      primary={member.name}
                      secondary={`Balance: UGX ${member.balance.toLocaleString()}`}
                    />
                    <Chip label={member.role} color={member.role === 'Member' ? 'default' : 'primary'} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant=\"h6\" gutterBottom>Group Summary</Typography>
              <Typography>Total Members: {mockGroupData.members.length}</Typography>
              <Typography>Total Balance: UGX {mockGroupData.members.reduce((sum, m) => sum + m.balance, 0).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}