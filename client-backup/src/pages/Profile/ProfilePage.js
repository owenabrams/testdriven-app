import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';

export default function ProfilePage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile Settings
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            User profile interface will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}