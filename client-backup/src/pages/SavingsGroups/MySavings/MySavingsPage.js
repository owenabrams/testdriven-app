import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  AccountBalance as SavingsIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { savingsGroupsAPI } from '../../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function MySavingsPage({ membershipData, userRole }) {
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch member savings data
  const { data: savingsData, isLoading } = useQuery(
    ['member-savings', membershipData?.member_id],
    () => savingsGroupsAPI.getMemberSavings(membershipData.member_id),
    { enabled: !!membershipData?.member_id }
  );

  // Fetch transactions
  const { data: transactionsData } = useQuery(
    ['member-transactions', membershipData?.member_id],
    () => savingsGroupsAPI.getMemberTransactions(membershipData.member_id),
    { enabled: !!membershipData?.member_id }
  );

  // Record new savings mutation
  const recordSavingsMutation = useMutation(
    (data) => savingsGroupsAPI.recordSavings(membershipData.member_id, data),
    {
      onSuccess: () => {
        toast.success('Savings recorded successfully!');
        queryClient.invalidateQueries(['member-savings']);
        queryClient.invalidateQueries(['member-transactions']);
        setDialogOpen(false);
        reset();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to record savings');
      }
    }
  );

  const handleRecordSavings = (data) => {
    recordSavingsMutation.mutate(data);
  };

  // Mock data for demonstration
  const mockSavingsData = {
    personal: { balance: 500000, target: 1000000, transactions: 12 },
    ecd: { balance: userRole === 'group_officer' ? 150000 : 0, target: 200000, transactions: 3 },
    social: { balance: userRole === 'group_officer' ? 75000 : 0, target: 100000, transactions: 2 },
    target: { balance: 0, target: 500000, transactions: 0 },
  };

  const mockTransactions = [
    { id: 1, date: '2024-12-01', type: 'PERSONAL', amount: 50000, method: 'MTN Mobile Money', status: 'VERIFIED', txnId: 'MTN123456' },
    { id: 2, date: '2024-11-28', type: 'ECD', amount: 25000, method: 'Cash', status: 'VERIFIED', txnId: null },
    { id: 3, date: '2024-11-21', type: 'SOCIAL', amount: 30000, method: 'Airtel Money', status: 'VERIFIED', txnId: 'AIR789012' },
    { id: 4, date: '2024-11-15', type: 'PERSONAL', amount: 75000, method: 'MTN Mobile Money', status: 'PENDING', txnId: 'MTN345678' },
  ];

  const savingTypes = [
    { code: 'PERSONAL', name: 'Personal Savings', description: 'Individual member savings' },
    { code: 'ECD', name: 'ECD Fund', description: 'Early Childhood Development fund' },
    { code: 'SOCIAL', name: 'Social Fund', description: 'Social welfare and emergency fund' },
    { code: 'TARGET', name: 'Target Savings', description: 'Campaign-specific target savings' },
  ];

  if (isLoading) {
    return (
      <Box>
        <Typography variant=\"h5\" gutterBottom>My Savings</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display=\"flex\" justifyContent=\"space-between\" alignItems=\"center\" mb={3}>
        <Typography variant=\"h5\">My Savings</Typography>
        <Button
          variant=\"contained\"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          Record New Savings
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <Tab label=\"Savings Overview\" />
        <Tab label=\"Transaction History\" />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Savings Summary Cards */}
          {Object.entries(mockSavingsData).map(([type, data]) => {
            const savingType = savingTypes.find(st => st.code === type.toUpperCase());
            if (!savingType || data.balance === 0) return null;

            const progress = data.target > 0 ? (data.balance / data.target) * 100 : 0;

            return (
              <Grid item xs={12} sm={6} md={6} key={type}>
                <Card>
                  <CardContent>
                    <Box display=\"flex\" alignItems=\"center\" mb={2}>
                      <SavingsIcon color=\"primary\" sx={{ mr: 1 }} />
                      <Typography variant=\"h6\">{savingType.name}</Typography>
                    </Box>

                    <Typography variant=\"h4\" color=\"primary\" gutterBottom>
                      UGX {data.balance.toLocaleString()}
                    </Typography>

                    <Typography variant=\"body2\" color=\"text.secondary\" gutterBottom>
                      {savingType.description}
                    </Typography>

                    {data.target > 0 && (
                      <Box mt={2}>
                        <Box display=\"flex\" justifyContent=\"space-between\" mb={1}>
                          <Typography variant=\"body2\">Progress to Target</Typography>
                          <Typography variant=\"body2\">{progress.toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress
                          variant=\"determinate\"
                          value={Math.min(progress, 100)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant=\"caption\" color=\"text.secondary\" sx={{ mt: 1, display: 'block' }}>
                          Target: UGX {data.target.toLocaleString()}
                        </Typography>
                      </Box>
                    )}

                    <Box display=\"flex\" justifyContent=\"space-between\" alignItems=\"center\" mt={2}>
                      <Typography variant=\"body2\" color=\"text.secondary\">
                        {data.transactions} transactions
                      </Typography>
                      <TrendingUpIcon color=\"success\" fontSize=\"small\" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}

          {/* Total Summary */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant=\"h6\" gutterBottom>
                  Total Savings Summary
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box textAlign=\"center\">
                      <Typography variant=\"h4\" color=\"primary\">
                        UGX {Object.values(mockSavingsData).reduce((sum, data) => sum + data.balance, 0).toLocaleString()}
                      </Typography>
                      <Typography variant=\"body2\" color=\"text.secondary\">
                        Total Balance
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box textAlign=\"center\">
                      <Typography variant=\"h4\" color=\"success.main\">
                        {Object.values(mockSavingsData).reduce((sum, data) => sum + data.transactions, 0)}
                      </Typography>
                      <Typography variant=\"body2\" color=\"text.secondary\">
                        Total Transactions
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <Box textAlign=\"center\">
                      <Typography variant=\"h4\" color=\"info.main\">
                        {((Object.values(mockSavingsData).reduce((sum, data) => sum + data.balance, 0) / 
                           Object.values(mockSavingsData).reduce((sum, data) => sum + data.target, 0)) * 100).toFixed(1)}%
                      </Typography>
                      <Typography variant=\"body2\" color=\"text.secondary\">
                        Overall Progress
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && (
        <Card>
          <CardContent>
            <Box display=\"flex\" alignItems=\"center\" mb={2}>
              <HistoryIcon sx={{ mr: 1 }} />
              <Typography variant=\"h6\">Transaction History</Typography>
            </Box>

            <TableContainer component={Paper} variant=\"outlined\">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Transaction ID</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={transaction.type} 
                          size=\"small\" 
                          variant=\"outlined\"
                          color={transaction.type === 'PERSONAL' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>UGX {transaction.amount.toLocaleString()}</TableCell>
                      <TableCell>{transaction.method}</TableCell>
                      <TableCell>{transaction.txnId || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={transaction.status}
                          color={transaction.status === 'VERIFIED' ? 'success' : 'warning'}
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
      )}

      {/* Record Savings Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth=\"sm\" fullWidth>
        <DialogTitle>Record New Savings</DialogTitle>
        <DialogContent>
          <Box component=\"form\" onSubmit={handleSubmit(handleRecordSavings)} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label=\"Amount (UGX)\"
                  type=\"number\"
                  {...register('amount', { 
                    required: 'Amount is required',
                    min: { value: 1000, message: 'Minimum amount is UGX 1,000' }
                  })}
                  error={!!errors.amount}
                  helperText={errors.amount?.message}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label=\"Saving Type\"
                  {...register('saving_type', { required: 'Saving type is required' })}
                  error={!!errors.saving_type}
                  helperText={errors.saving_type?.message}
                >
                  {savingTypes.map((type) => (
                    <MenuItem key={type.code} value={type.code}>
                      {type.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label=\"Payment Method\"
                  {...register('method', { required: 'Payment method is required' })}
                  error={!!errors.method}
                  helperText={errors.method?.message}
                >
                  <MenuItem value=\"CASH\">Cash</MenuItem>
                  <MenuItem value=\"MTN\">MTN Mobile Money</MenuItem>
                  <MenuItem value=\"AIRTEL\">Airtel Money</MenuItem>
                </TextField>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label=\"Mobile Money Transaction ID\"
                  {...register('transaction_id')}
                  placeholder=\"Enter transaction ID for mobile money payments\"
                  helperText=\"Required for mobile money payments\"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label=\"Notes (Optional)\"
                  multiline
                  rows={2}
                  {...register('notes')}
                  placeholder=\"Add any additional notes about this savings\"
                />
              </Grid>
            </Grid>
          </Box>

          <Alert severity=\"info\" sx={{ mt: 2 }}>
            <Typography variant=\"body2\">
              Your savings will be pending verification by group officers. 
              You will receive a confirmation once verified.
            </Typography>
          </Alert>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit(handleRecordSavings)} 
            variant=\"contained\"
            disabled={recordSavingsMutation.isLoading}
          >
            {recordSavingsMutation.isLoading ? 'Recording...' : 'Record Savings'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}