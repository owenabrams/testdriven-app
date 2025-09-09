import React from 'react';
import { Box, Typography, Card, CardContent, List, ListItem, ListItemText, Chip } from '@mui/material';

export default function MeetingsPage({ membershipData, userRole }) {
  const mockMeetings = [
    { date: '2024-12-15', type: 'Regular', attended: null, status: 'Upcoming' },
    { date: '2024-12-08', type: 'Regular', attended: true, status: 'Completed' },
    { date: '2024-12-01', type: 'Regular', attended: true, status: 'Completed' },
    { date: '2024-11-24', type: 'Regular', attended: false, status: 'Completed' },
  ];

  return (
    <Box>
      <Typography variant=\"h5\" gutterBottom>Meetings</Typography>
      
      <Card>
        <CardContent>
          <Typography variant=\"h6\" gutterBottom>Meeting History</Typography>
          <List>
            {mockMeetings.map((meeting, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={`${meeting.type} Meeting`}
                  secondary={meeting.date}
                />
                <Chip 
                  label={meeting.status === 'Upcoming' ? 'Upcoming' : meeting.attended ? 'Attended' : 'Absent'} 
                  color={meeting.status === 'Upcoming' ? 'info' : meeting.attended ? 'success' : 'error'}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
}