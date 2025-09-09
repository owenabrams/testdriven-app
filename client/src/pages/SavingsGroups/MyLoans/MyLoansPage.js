import React from 'react';
import { Box, Typography, Card, CardContent, Alert, Button } from '@mui/material';

export default function MyLoansPage({ membershipData, userRole }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>My Loans</Typography>
      
      <Card>
        <CardContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Based on your savings history, you may be eligible for a loan of up to UGX 300,000.
          </Alert>
          
          <Typography variant="h6" gutterBottom>Loan Eligibility</Typography>
          <Typography>Savings History Score: 85/100</Typography>
          <Typography>Attendance Score: 95/100</Typography>
          <Typography>Overall Score: 90/100</Typography>
          
          <Button variant="contained" sx={{ mt: 2 }}>
            Apply for Loan
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}