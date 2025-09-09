import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
} from '@mui/material';
import { Add } from '@mui/icons-material';

export default function GroupSavings({ groupId }) {
  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Savings Management
          </Typography>
          <Button variant="contained" startIcon={<Add />}>
            Record Savings
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Savings recording interface will be implemented here.
        </Typography>
      </CardContent>
    </Card>
  );
}