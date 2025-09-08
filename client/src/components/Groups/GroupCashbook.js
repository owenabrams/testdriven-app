import React from 'react';
import {
  Card,
  CardContent,
  Typography,
} from '@mui/material';

export default function GroupCashbook({ groupId }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Group Cashbook
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Comprehensive cashbook interface will be implemented here.
        </Typography>
      </CardContent>
    </Card>
  );
}