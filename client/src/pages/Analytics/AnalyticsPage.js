import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Analytics } from '@mui/icons-material';

export default function AnalyticsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Analytics & Reports
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Comprehensive insights and performance metrics
      </Typography>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <Analytics sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive analytics and reporting interface will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}