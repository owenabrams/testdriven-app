import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Add, Campaign } from '@mui/icons-material';

export default function CampaignsPage() {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Target Campaigns
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage democratic target savings campaigns
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} size="large">
          Create Campaign
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Campaign sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Target Campaigns Interface
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Democratic voting system and campaign management will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}