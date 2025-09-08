import React from 'react';
import { Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';

export default function TransactionsPage({ membershipData, userRole }) {
  const mockTransactions = [
    { id: 1, date: '2024-12-01', member: 'Sarah Nakato', type: 'Personal', amount: 50000, status: 'Verified' },
    { id: 2, date: '2024-11-28', member: 'Mary Nambi', type: 'ECD', amount: 25000, status: 'Verified' },
    { id: 3, date: '2024-11-21', member: 'Grace Mukasa', type: 'Social', amount: 30000, status: 'Pending' },
  ];

  return (
    <Box>
      <Typography variant=\"h5\" gutterBottom>
        {userRole === 'group_officer' ? 'All Transactions' : 'My Transactions'}
      </Typography>
      
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant=\"outlined\">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  {userRole === 'group_officer' && <TableCell>Member</TableCell>}
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date}</TableCell>
                    {userRole === 'group_officer' && <TableCell>{transaction.member}</TableCell>}
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>UGX {transaction.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.status}
                        color={transaction.status === 'Verified' ? 'success' : 'warning'}
                        size=\"small\"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}