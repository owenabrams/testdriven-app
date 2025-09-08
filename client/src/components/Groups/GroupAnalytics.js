import React from 'react';
import {
  Card,
  CardContent,
  Typography,
} from '@mui/material';

export default function GroupAnalytics({ groupId }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Group Analytics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Analytics and reporting interface will be implemented here.
        </Typography>
      </CardContent>
    </Card>
  );
}