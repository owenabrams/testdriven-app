import React from 'react';
import { Box, Typography, Card, CardContent, LinearProgress, Button, Grid } from '@mui/material';

export default function CampaignsPage({ membershipData, userRole }) {
  const mockCampaigns = [
    {
      name: \"Women's Empowerment 2025\",
      target: 2000000,
      current: 650000,
      deadline: '2025-12-31',
      status: 'Active'
    }
  ];

  return (
    <Box>
      <Typography variant=\"h5\" gutterBottom>Savings Campaigns</Typography>
      
      <Grid container spacing={3}>
        {mockCampaigns.map((campaign, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card>
              <CardContent>
                <Typography variant=\"h6\" gutterBottom>{campaign.name}</Typography>
                <Typography variant=\"body2\" color=\"text.secondary\" gutterBottom>
                  Deadline: {campaign.deadline}
                </Typography>
                
                <Box sx={{ mt: 2, mb: 2 }}>
                  <Box display=\"flex\" justifyContent=\"space-between\" mb={1}>
                    <Typography variant=\"body2\">Progress</Typography>
                    <Typography variant=\"body2\">
                      {((campaign.current / campaign.target) * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant=\"determinate\"
                    value={(campaign.current / campaign.target) * 100}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant=\"caption\" color=\"text.secondary\" sx={{ mt: 1, display: 'block' }}>
                    UGX {campaign.current.toLocaleString()} of UGX {campaign.target.toLocaleString()}
                  </Typography>
                </Box>
                
                <Button variant=\"contained\" fullWidth>
                  Contribute to Campaign
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}