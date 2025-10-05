import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search,
  CheckCircle,
  Cancel,
  Pending,
  AccountBalance,
  Phone,
  Receipt,
  Warning,
  Edit,
  History,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savingsGroupsAPI } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function FinancialSupport() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('verify'); // 'verify', 'correct', 'emergency'
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Mock data for pending mobile money transactions
  const pendingTransactions = [
    {
      id: 1,
      memberName: 'Alice Nakato',
      groupName: 'Kampala Women Group',
      amount: 50000,
      provider: 'MTN',
      transactionId: 'MTN123456789',
      phone: '+256701234567',
      status: 'PENDING',
      submittedDate: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      savingType: 'PERSONAL',
    },
    {
      id: 2,
      memberName: 'John Mukasa',
      groupName: 'Nakasero Traders',
      amount: 25000,
      provider: 'Airtel',
      transactionId: 'AIR987654321',
      phone: '+256702345678',
      status: 'PENDING',
      submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      savingType: 'ECD',
    },
    {
      id: 3,
      memberName: 'Mary Nambi',
      groupName: 'Central Market Group',
      amount: 75000,
      provider: 'MTN',
      transactionId: 'MTN555666777',
      phone: '+256703456789',
      status: 'REJECTED',
      submittedDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      savingType: 'SOCIAL',
      rejectionReason: 'Transaction ID not found in MTN records',
    },
  ];

  // Filter transactions
  const filteredTransactions = pendingTransactions.filter(transaction =>
    transaction.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.transactionId.includes(searchTerm) ||
    transaction.phone.includes(searchTerm)
  );

  // Verify transaction mutation
  const verifyTransactionMutation = useMutation({
    mutationFn: (data) => {
      // This would call the actual API endpoint
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
        toast.success('Transaction verified successfully');
        setDialogOpen(false);
        reset();
      },
      onError: (error) => {
        toast.error('Failed to verify transaction');
      },
  });

  // Balance correction mutation
  const correctBalanceMutation = useMutation({
    mutationFn: (data) => {
      // This would call the actual API endpoint
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
        toast.success('Balance corrected successfully');
        setDialogOpen(false);
        reset();
      },
      onError: (error) => {
        toast.error('Failed to correct balance');
      },
  });

  const handleOpenDialog = (transaction, type) => {
    setSelectedTransaction(transaction);
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedTransaction(null);
    reset();
  };

  const onVerifyTransaction = (data) => {
    verifyTransactionMutation.mutate({
      transactionId: selectedTransaction.id,
      action: data.action,
      reason: data.reason,
    });
  };

  const onCorrectBalance = (data) => {
    correctBalanceMutation.mutate({
      memberId: selectedTransaction.memberId,
      adjustment: parseFloat(data.adjustment),
      reason: data.reason,
      type: data.type,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'VERIFIED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Pending />;
      case 'VERIFIED': return <CheckCircle />;
      case 'REJECTED': return <Cancel />;
      default: return null;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Financial Support
        </Typography>
        <Alert severity="info" sx={{ maxWidth: 400 }}>
          <Typography variant="body2">
            <strong>Admin Support:</strong> Verify transactions, correct balances, and provide financial assistance
          </Typography>
        </Alert>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Pending sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6">
                {pendingTransactions.filter(t => t.status === 'PENDING').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Verifications
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccountBalance sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">5</Typography>
              <Typography variant="body2" color="text.secondary">
                Balance Corrections
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Phone sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">12</Typography>
              <Typography variant="body2" color="text.secondary">
                Mobile Money Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h6">2</Typography>
              <Typography variant="body2" color="text.secondary">
                Urgent Issues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search transactions by member name, transaction ID, or phone..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3, maxWidth: 600 }}
      />

      {/* Transactions Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member & Group</TableCell>
              <TableCell>Transaction Details</TableCell>
              <TableCell>Amount & Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {transaction.memberName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {transaction.groupName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" mb={0.5}>
                    <Phone sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2">{transaction.phone}</Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <Receipt sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2">{transaction.transactionId}</Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {transaction.provider}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    UGX {transaction.amount.toLocaleString()}
                  </Typography>
                  <Chip
                    label={transaction.savingType}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(transaction.status)}
                    label={transaction.status}
                    color={getStatusColor(transaction.status)}
                    size="small"
                  />
                  {transaction.rejectionReason && (
                    <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                      {transaction.rejectionReason}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {transaction.submittedDate.toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {transaction.submittedDate.toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  {transaction.status === 'PENDING' && (
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(transaction, 'verify')}
                      title="Verify Transaction"
                    >
                      <CheckCircle />
                    </IconButton>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(transaction, 'correct')}
                    title="Balance Correction"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(transaction, 'history')}
                    title="View History"
                  >
                    <History />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Transaction Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'verify' && 'Verify Mobile Money Transaction'}
          {dialogType === 'correct' && 'Balance Correction'}
          {dialogType === 'history' && 'Transaction History'}
        </DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <>
              {dialogType === 'verify' && (
                <Box component="form" onSubmit={handleSubmit(onVerifyTransaction)} sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Verifying transaction for <strong>{selectedTransaction.memberName}</strong>
                  </Alert>
                  
                  <List>
                    <ListItem>
                      <ListItemIcon><Phone /></ListItemIcon>
                      <ListItemText
                        primary="Phone Number"
                        secondary={selectedTransaction.phone}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Receipt /></ListItemIcon>
                      <ListItemText
                        primary="Transaction ID"
                        secondary={selectedTransaction.transactionId}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><AccountBalance /></ListItemIcon>
                      <ListItemText
                        primary="Amount"
                        secondary={`UGX ${selectedTransaction.amount.toLocaleString()}`}
                      />
                    </ListItem>
                  </List>

                  <Divider sx={{ my: 2 }} />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Action</InputLabel>
                    <Select
                      {...register('action', { required: 'Action is required' })}
                      label="Action"
                    >
                      <MenuItem value="VERIFY">Verify & Approve</MenuItem>
                      <MenuItem value="REJECT">Reject Transaction</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Reason/Notes"
                    multiline
                    rows={3}
                    {...register('reason', { required: 'Reason is required' })}
                    error={!!errors.reason}
                    helperText={errors.reason?.message}
                    placeholder="Provide reason for verification or rejection..."
                  />
                </Box>
              )}

              {dialogType === 'correct' && (
                <Box component="form" onSubmit={handleSubmit(onCorrectBalance)} sx={{ mt: 2 }}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Balance Correction:</strong> This action will be logged and audited
                  </Alert>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Correction Type</InputLabel>
                        <Select
                          {...register('type', { required: 'Type is required' })}
                          label="Correction Type"
                        >
                          <MenuItem value="ADD">Add to Balance</MenuItem>
                          <MenuItem value="SUBTRACT">Subtract from Balance</MenuItem>
                          <MenuItem value="SET">Set Balance</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Amount"
                        type="number"
                        {...register('adjustment', { 
                          required: 'Amount is required',
                          min: { value: 0.01, message: 'Amount must be positive' }
                        })}
                        error={!!errors.adjustment}
                        helperText={errors.adjustment?.message}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Justification"
                        multiline
                        rows={3}
                        {...register('reason', { required: 'Justification is required' })}
                        error={!!errors.reason}
                        helperText={errors.reason?.message}
                        placeholder="Provide detailed justification for this balance correction..."
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {dialogType === 'history' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Transaction history and audit trail would be displayed here.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {dialogType === 'verify' && (
            <Button
              onClick={handleSubmit(onVerifyTransaction)}
              variant="contained"
              disabled={verifyTransactionMutation.isLoading}
            >
              {verifyTransactionMutation.isLoading ? 'Processing...' : 'Process Transaction'}
            </Button>
          )}
          {dialogType === 'correct' && (
            <Button
              onClick={handleSubmit(onCorrectBalance)}
              variant="contained"
              color="warning"
              disabled={correctBalanceMutation.isLoading}
            >
              {correctBalanceMutation.isLoading ? 'Correcting...' : 'Apply Correction'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}