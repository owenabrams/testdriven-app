import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  CircularProgress,
  Fab,
  IconButton,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  AccountBalance,
  TrendingUp,
  School,
  AttachMoney,
  Group,
} from '@mui/icons-material';
import { apiClient } from '../../services/api';

const ACTIVITY_TYPES = [
  { value: 'savings_collection', label: 'Savings Collection', icon: <AccountBalance /> },
  { value: 'loan_disbursement', label: 'Loan Disbursement', icon: <AttachMoney /> },
  { value: 'loan_repayment', label: 'Loan Repayment', icon: <TrendingUp /> },
  { value: 'fine_collection', label: 'Fine Collection', icon: <AttachMoney /> },
  { value: 'training_session', label: 'Training Session', icon: <School /> },
  { value: 'ecd_fund_contribution', label: 'ECD Fund', icon: <Group /> },
  { value: 'target_fund_contribution', label: 'Target Fund', icon: <TrendingUp /> },
];

export default function MeetingActivities({ groupId, meetingId }) {
  const [open, setOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [formData, setFormData] = useState({
    activity_type: '',
    description: '',
    amount: '',
    status: 'pending'
  });

  const queryClient = useQueryClient();

  // Fetch activities
  const { data: activities, isLoading, error } = useQuery({
    queryKey: ['meeting-activities', groupId, meetingId],
    queryFn: async () => {
      const response = await apiClient.get(`/meeting-activities/?group_id=${groupId}&meeting_id=${meetingId}`);
      return response.data.activities || [];
    }
  });

  // Create activity mutation
  const createActivityMutation = useMutation({
    mutationFn: async (activityData) => {
      const response = await apiClient.post('/meeting-activities/', {
        ...activityData,
        meeting_id: meetingId,
        group_id: groupId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meeting-activities', groupId, meetingId]);
      setOpen(false);
      resetForm();
    }
  });

  // Update activity mutation
  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const response = await apiClient.put(`/meeting-activities/${id}`, updateData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meeting-activities', groupId, meetingId]);
      setOpen(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      activity_type: '',
      description: '',
      amount: '',
      status: 'pending'
    });
    setEditingActivity(null);
  };

  const handleSubmit = () => {
    if (editingActivity) {
      updateActivityMutation.mutate({ id: editingActivity.id, ...formData });
    } else {
      createActivityMutation.mutate(formData);
    }
  };

  const handleEdit = (activity) => {
    setEditingActivity(activity);
    setFormData({
      activity_type: activity.activity_type,
      description: activity.description,
      amount: activity.amount,
      status: activity.status
    });
    setOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getActivityTypeLabel = (type) => {
    const activityType = ACTIVITY_TYPES.find(t => t.value === type);
    return activityType ? activityType.label : type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load meeting activities: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Meeting Activities ({activities?.length || 0})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Add Activity
        </Button>
      </Box>

      {/* Activities Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {formatCurrency(
                  activities?.filter(a => a.activity_type === 'savings_collection')
                    .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0) || 0
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Savings Collected
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {formatCurrency(
                  activities?.filter(a => a.activity_type === 'loan_disbursement')
                    .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0) || 0
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Loans Disbursed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                {formatCurrency(
                  activities?.filter(a => a.activity_type === 'loan_repayment')
                    .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0) || 0
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Loan Repayments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="error.main">
                {activities?.filter(a => a.status === 'completed').length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Activities
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activities Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Activity Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activities?.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    {ACTIVITY_TYPES.find(t => t.value === activity.activity_type)?.icon}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {getActivityTypeLabel(activity.activity_type)}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{activity.description}</TableCell>
                <TableCell align="right">
                  {formatCurrency(activity.amount)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={activity.status}
                    color={getStatusColor(activity.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(activity.created_date).toLocaleDateString()}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleEdit(activity)}
                  >
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {(!activities || activities.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No activities recorded for this meeting
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Activity Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingActivity ? 'Edit Activity' : 'Add New Activity'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Activity Type"
                value={formData.activity_type}
                onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
              >
                {ACTIVITY_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box display="flex" alignItems="center">
                      {type.icon}
                      <Typography sx={{ ml: 1 }}>{type.label}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount (UGX)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createActivityMutation.isLoading || updateActivityMutation.isLoading}
          >
            {editingActivity ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
