import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Search,
  Edit,
  Visibility,
  AccountBalance,
  History,
  Add,
  Phone,
  Email,
  LocationOn,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savingsGroupsAPI } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function MemberManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('view'); // 'view', 'edit', 'savings'
  const [tab, setTab] = useState(0);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch all groups to get members
  const { data: groups, isLoading } = useQuery({
    queryKey: ['admin-all-groups'],
    queryFn: () => savingsGroupsAPI.getGroups(),
    select: (response) => response.data?.data || [],
  });

  // Extract all members from groups
  const allMembers = React.useMemo(() => {
    if (!groups || !Array.isArray(groups)) return [];
    
    return groups.flatMap(group => 
      (group.members || []).map(member => ({
        ...member,
        groupName: group.name,
        groupId: group.id,
        groupDistrict: group.district,
        groupParish: group.parish,
      }))
    );
  }, [groups]);

  // Filter members based on search
  const filteredMembers = allMembers.filter(member =>
    member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone?.includes(searchTerm) ||
    member.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: ({ groupId, memberId, data }) => savingsGroupsAPI.updateMember(groupId, memberId, data),
    onSuccess: () => {
      toast.success('Member updated successfully');
      queryClient.invalidateQueries('admin-all-groups');
      setDialogOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update member');
    },
  });

  // Record savings mutation
  const recordSavingsMutation = useMutation({
    mutationFn: ({ groupId, memberId, data }) => savingsGroupsAPI.recordSaving(groupId, memberId, data),
    onSuccess: () => {
      toast.success('Savings recorded successfully');
      queryClient.invalidateQueries('admin-all-groups');
      setDialogOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to record savings');
    },
  });

  const handleOpenDialog = (member, type) => {
    setSelectedMember(member);
    setDialogType(type);
    setDialogOpen(true);
    
    if (type === 'edit') {
      reset({
        name: member.name,
        phone: member.phone,
        gender: member.gender,
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMember(null);
    reset();
  };

  const onUpdateMember = (data) => {
    updateMemberMutation.mutate({
      groupId: selectedMember.groupId,
      memberId: selectedMember.id,
      data,
    });
  };

  const onRecordSavings = (data) => {
    recordSavingsMutation.mutate({
      groupId: selectedMember.groupId,
      memberId: selectedMember.id,
      data: {
        ...data,
        amount: parseFloat(data.amount),
        saving_type_code: data.saving_type_code || 'PERSONAL',
      },
    });
  };

  if (isLoading) {
    return <Typography>Loading members...</Typography>;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Member Management
        </Typography>
        <Alert severity="info" sx={{ maxWidth: 400 }}>
          <Typography variant="body2">
            <strong>Admin CRUD:</strong> View, edit, and support all members across groups
          </Typography>
        </Alert>
      </Box>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search members by name, phone, or group..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3, maxWidth: 500 }}
      />

      {/* Members Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Member</TableCell>
              <TableCell>Group</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={`${member.groupId}-${member.id}`}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {member.name?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight="medium"
                        sx={{
                          cursor: 'pointer',
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                            color: 'primary.dark'
                          }
                        }}
                        onClick={() => navigate(`/members/${member.id}`)}
                      >
                        {member.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {member.role} • {member.gender}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      cursor: 'pointer',
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontWeight: 'medium',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: 'primary.dark'
                      }
                    }}
                    onClick={() => navigate(`/groups/${member.groupId || 1}`)}
                  >
                    {member.groupName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {member.groupDistrict}, {member.groupParish}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{member.phone}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    UGX {(member.share_balance || 0).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total: UGX {(member.total_contributions || 0).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={member.is_active ? 'Active' : 'Inactive'}
                    color={member.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(member, 'view')}
                    title="View Details"
                  >
                    <Visibility />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(member, 'edit')}
                    title="Edit Member"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(member, 'savings')}
                    title="Record Savings"
                  >
                    <AccountBalance />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredMembers.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No members found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search terms
          </Typography>
        </Box>
      )}

      {/* Member Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogType === 'view' && 'Member Details'}
          {dialogType === 'edit' && 'Edit Member'}
          {dialogType === 'savings' && 'Record Savings'}
        </DialogTitle>
        <DialogContent>
          {selectedMember && (
            <>
              {dialogType === 'view' && (
                <Box>
                  <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Profile" />
                    <Tab label="Financial" />
                    <Tab label="Activity" />
                  </Tabs>
                  
                  <TabPanel value={tab} index={0}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                        <Typography variant="body1">{selectedMember.name}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                        <Typography variant="body1">{selectedMember.phone}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Gender</Typography>
                        <Typography variant="body1">{selectedMember.gender}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Role</Typography>
                        <Typography variant="body1">{selectedMember.role}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Group</Typography>
                        <Typography variant="body1">
                          {selectedMember.groupName} ({selectedMember.groupDistrict}, {selectedMember.groupParish})
                        </Typography>
                      </Grid>
                    </Grid>
                  </TabPanel>
                  
                  <TabPanel value={tab} index={1}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Share Balance</Typography>
                        <Typography variant="h6" color="primary">
                          UGX {(selectedMember.share_balance || 0).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Total Contributions</Typography>
                        <Typography variant="h6" color="success.main">
                          UGX {(selectedMember.total_contributions || 0).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Joined Date</Typography>
                        <Typography variant="body1">
                          {selectedMember.joined_date ? new Date(selectedMember.joined_date).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </TabPanel>
                  
                  <TabPanel value={tab} index={2}>
                    <Typography variant="body2" color="text.secondary">
                      Recent activity and transaction history would be displayed here.
                    </Typography>
                  </TabPanel>
                </Box>
              )}

              {dialogType === 'edit' && (
                <Box component="form" onSubmit={handleSubmit(onUpdateMember)} sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Name"
                        {...register('name', { required: 'Name is required' })}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Phone"
                        {...register('phone')}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        select
                        label="Gender"
                        {...register('gender')}
                        SelectProps={{ native: true }}
                      >
                        <option value="">Select Gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="OTHER">Other</option>
                      </TextField>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {dialogType === 'savings' && (
                <Box component="form" onSubmit={handleSubmit(onRecordSavings)} sx={{ mt: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Recording savings on behalf of <strong>{selectedMember.name}</strong>
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Amount"
                        type="number"
                        {...register('amount', { 
                          required: 'Amount is required',
                          min: { value: 0.01, message: 'Amount must be positive' }
                        })}
                        error={!!errors.amount}
                        helperText={errors.amount?.message}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">UGX</InputAdornment>,
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        select
                        label="Saving Type"
                        {...register('saving_type_code')}
                        SelectProps={{ native: true }}
                      >
                        <option value="PERSONAL">Personal Savings</option>
                        <option value="ECD">ECD Fund</option>
                        <option value="SOCIAL">Social Fund</option>
                        <option value="TARGET">Target Savings</option>
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Notes"
                        multiline
                        rows={2}
                        {...register('notes')}
                        placeholder="Optional notes about this transaction..."
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {dialogType === 'edit' && (
            <Button
              onClick={handleSubmit(onUpdateMember)}
              variant="contained"
              disabled={updateMemberMutation.isLoading}
            >
              {updateMemberMutation.isLoading ? 'Updating...' : 'Update Member'}
            </Button>
          )}
          {dialogType === 'savings' && (
            <Button
              onClick={handleSubmit(onRecordSavings)}
              variant="contained"
              disabled={recordSavingsMutation.isLoading}
            >
              {recordSavingsMutation.isLoading ? 'Recording...' : 'Record Savings'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}