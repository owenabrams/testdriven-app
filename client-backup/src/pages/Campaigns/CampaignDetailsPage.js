import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';

export default function CampaignDetailsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Campaign Details
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Campaign details interface will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}