import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
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
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Person,
  Phone,
  Email,
  AccountBalance,
  Star,
  Gavel,
  Calculate,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

// API functions (to be moved to a service file)
const groupMembersAPI = {
  getMembers: async (groupId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/savings-groups/${groupId}/members`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch members');
    }

    return response.json();
  },

  addMember: async (groupId, memberData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/savings-groups/${groupId}/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add member');
    }

    return response.json();
  },

  updateMember: async (groupId, memberId, memberData) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/savings-groups/${groupId}/members/${memberId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(memberData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update member');
    }

    return response.json();
  },

  removeMember: async (groupId, memberId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/savings-groups/${groupId}/members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove member');
    }

    return response.json();
  },
};

export default function GroupMembers({ groupId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('add'); // 'add', 'edit'
  const [selectedMember, setSelectedMember] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuMember, setMenuMember] = useState(null);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm();

  // Fetch group members
  const { data: membersData, isLoading, error } = useQuery(
    ['group-members', groupId],
    () => groupMembersAPI.getMembers(groupId),
    {
      select: (response) => response.data || {},
      enabled: !!groupId,
    }
  );

  const members = membersData?.members || [];

  // Add member mutation
  const addMemberMutation = useMutation(
    (memberData) => groupMembersAPI.addMember(groupId, memberData),
    {
      onSuccess: () => {
        toast.success('Member added successfully');
        queryClient.invalidateQueries(['group-members', groupId]);
        handleCloseDialog();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to add member');
      },
    }
  );

  // Update member mutation
  const updateMemberMutation = useMutation(
    ({ memberId, memberData }) => groupMembersAPI.updateMember(groupId, memberId, memberData),
    {
      onSuccess: () => {
        toast.success('Member updated successfully');
        queryClient.invalidateQueries(['group-members', groupId]);
        handleCloseDialog();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to update member');
      },
    }
  );

  // Remove member mutation
  const removeMemberMutation = useMutation(
    (memberId) => groupMembersAPI.removeMember(groupId, memberId),
    {
      onSuccess: () => {
        toast.success('Member removed successfully');
        queryClient.invalidateQueries(['group-members', groupId]);
        handleCloseMenu();
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to remove member');
      },
    }
  );

  const handleOpenDialog = (type, member = null) => {
    setDialogType(type);
    setSelectedMember(member);
    setDialogOpen(true);

    if (type === 'edit' && member) {
      reset({
        name: member.name,
        gender: member.gender,
        phone: member.phone,
        role: member.role,
      });
    } else {
      reset({
        name: '',
        gender: '',
        phone: '',
        role: 'MEMBER',
        email: '',
        username: '',
        password: '',
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedMember(null);
    reset();
  };

  const handleOpenMenu = (event, member) => {
    setAnchorEl(event.currentTarget);
    setMenuMember(member);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuMember(null);
  };

  const onSubmit = (data) => {
    if (dialogType === 'add') {
      addMemberMutation.mutate(data);
    } else if (dialogType === 'edit' && selectedMember) {
      updateMemberMutation.mutate({
        memberId: selectedMember.id,
        memberData: data,
      });
    }
  };

  const handleRemoveMember = (member) => {
    if (window.confirm(`Are you sure you want to remove ${member.name} from the group?`)) {
      removeMemberMutation.mutate(member.id);
    }
    handleCloseMenu();
  };

  const getOfficerIcon = (officerRole) => {
    switch (officerRole) {
      case 'chair':
        return <Star color="warning" />;
      case 'treasurer':
        return <AccountBalance color="success" />;
      case 'secretary':
        return <Gavel color="info" />;
      default:
        return <Person color="action" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'FOUNDER':
        return 'secondary';
      case 'OFFICER':
        return 'primary';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Failed to load group members. Please try again later.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">
              Group Members ({members.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog('add')}
            >
              Add Member
            </Button>
          </Box>

          {members.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No members yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add the first member to get started
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Contact</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Balance</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            {getOfficerIcon(member.officer_role)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {member.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {member.gender} • Joined {new Date(member.joined_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {member.phone && (
                            <Typography variant="body2" display="flex" alignItems="center">
                              <Phone sx={{ fontSize: 16, mr: 0.5 }} />
                              {member.phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Chip
                            label={member.role}
                            size="small"
                            color={getRoleColor(member.role)}
                            sx={{ mb: 0.5 }}
                          />
                          {member.officer_role && (
                            <Chip
                              label={member.officer_role.toUpperCase()}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          UGX {member.share_balance?.toLocaleString() || '0'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Total: UGX {member.total_contributions?.toLocaleString() || '0'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.is_active ? 'Active' : 'Inactive'}
                          size="small"
                          color={member.is_active ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          onClick={(e) => handleOpenMenu(e, member)}
                          size="small"
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          handleOpenDialog('edit', menuMember);
          handleCloseMenu();
        }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Member</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleRemoveMember(menuMember)}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove Member</ListItemText>
        </MenuItem>
      </Menu>

      {/* Add/Edit Member Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogType === 'add' ? 'Add New Member' : 'Edit Member'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  {...register('name', { required: 'Name is required' })}
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Gender"
                  {...register('gender', { required: 'Gender is required' })}
                  error={!!errors.gender}
                  helperText={errors.gender?.message}
                  SelectProps={{ native: true }}
                >
                  <option value="">Select Gender</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="OTHER">Other</option>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  {...register('phone')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Role"
                  {...register('role')}
                  SelectProps={{ native: true }}
                >
                  <option value="MEMBER">Member</option>
                  <option value="OFFICER">Officer</option>
                  <option value="FOUNDER">Founder</option>
                </TextField>
              </Grid>

              {dialogType === 'add' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      User Account (Optional - for new users)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      {...register('email')}
                      helperText="Leave empty to add member without user account"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Username"
                      {...register('username')}
                      helperText="Required if email is provided"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Password"
                      type="password"
                      {...register('password')}
                      helperText="Required for new user accounts"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={addMemberMutation.isLoading || updateMemberMutation.isLoading}
            >
              {addMemberMutation.isLoading || updateMemberMutation.isLoading ? (
                <CircularProgress size={20} />
              ) : (
                dialogType === 'add' ? 'Add Member' : 'Update Member'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}