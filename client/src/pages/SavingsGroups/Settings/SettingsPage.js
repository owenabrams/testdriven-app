import React from 'react';
import { Box, Typography, Card, CardContent, Switch, FormControlLabel, Divider } from '@mui/material';

export default function SettingsPage({ userRole }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Settings</Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Notification Preferences</Typography>
          
          <FormControlLabel
            control={<Switch defaultChecked />}
            label="Email notifications for new transactions"
          />
          <br />
          <FormControlLabel
            control={<Switch defaultChecked />}
            label="SMS alerts for meeting reminders"
          />
          <br />
          <FormControlLabel
            control={<Switch />}
            label="Push notifications for loan updates"
          />
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>Privacy Settings</Typography>
          
          <FormControlLabel
            control={<Switch defaultChecked />}
            label="Show my savings balance to other members"
          />
          <br />
          <FormControlLabel
            control={<Switch defaultChecked />}
            label="Allow group officers to view my transaction history"
          />
        </CardContent>
      </Card>
    </Box>
  );
}