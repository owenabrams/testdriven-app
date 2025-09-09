import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import { Add, AccountBalance } from '@mui/icons-material';

export default function LoansPage() {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Loan Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Automated assessment and loan tracking
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} size="large">
          New Assessment
        </Button>
      </Box>

      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <AccountBalance sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Loan Assessment System
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Automated loan assessment and management interface will be implemented here.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}