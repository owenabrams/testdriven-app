import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Person,
  Phone,
  Email,
  Work,
  School,
  Home,
  AccountBalance,
  TrendingUp,
  Group,
} from '@mui/icons-material';
import { apiClient } from '../../services/api';

const GENDER_OPTIONS = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
];

const EDUCATION_LEVELS = [
  { value: 'None', label: 'None' },
  { value: 'Primary', label: 'Primary' },
  { value: 'Secondary', label: 'Secondary' },
  { value: 'Tertiary', label: 'Tertiary' },
  { value: 'University', label: 'University' },
];

const MARITAL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
];

const OFFICER_ROLES = [
  { value: 'CHAIRPERSON', label: 'Chairperson' },
  { value: 'SECRETARY', label: 'Secretary' },
  { value: 'TREASURER', label: 'Treasurer' },
  { value: 'MEMBER', label: 'Member' },
];

export default function MemberProfileEdit({ memberId, open, onClose }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  // Fetch member profile
  const { data: memberProfile, isLoading, error } = useQuery({
    queryKey: ['member-profile', memberId],
    queryFn: async () => {
      const response = await apiClient.get(`/member-profile/${memberId}`);
      return response.data;
    },
    enabled: !!memberId && open
  });

  // Update member profile mutation
  const updateMemberMutation = useMutation({
    mutationFn: async (updateData) => {
      const response = await apiClient.put(`/member-profile/${memberId}`, updateData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['member-profile', memberId]);
      queryClient.invalidateQueries(['members']);
      setEditing(false);
    }
  });

  React.useEffect(() => {
    if (memberProfile?.member_info) {
      setFormData({
        name: memberProfile.member_info.name || '',
        phone: memberProfile.member_info.phone || '',
        email: memberProfile.member_info.email || '',
        gender: memberProfile.member_info.gender || '',
        date_of_birth: memberProfile.member_info.date_of_birth || '',
        education_level: memberProfile.member_info.education_level || '',
        occupation: memberProfile.member_info.occupation || '',
        marital_status: memberProfile.member_info.marital_status || '',
        address: memberProfile.member_info.address || '',
        emergency_contact_name: memberProfile.member_info.emergency_contact_name || '',
        emergency_contact_phone: memberProfile.member_info.emergency_contact_phone || '',
        role: memberProfile.member_info.role || 'MEMBER',
      });
    }
  }, [memberProfile]);

  const handleSave = () => {
    updateMemberMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (memberProfile?.member_info) {
      setFormData({
        name: memberProfile.member_info.name || '',
        phone: memberProfile.member_info.phone || '',
        email: memberProfile.member_info.email || '',
        gender: memberProfile.member_info.gender || '',
        date_of_birth: memberProfile.member_info.date_of_birth || '',
        education_level: memberProfile.member_info.education_level || '',
        occupation: memberProfile.member_info.occupation || '',
        marital_status: memberProfile.member_info.marital_status || '',
        address: memberProfile.member_info.address || '',
        emergency_contact_name: memberProfile.member_info.emergency_contact_name || '',
        emergency_contact_phone: memberProfile.member_info.emergency_contact_phone || '',
        role: memberProfile.member_info.role || 'MEMBER',
      });
    }
    setEditing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Alert severity="error">
            Failed to load member profile: {error.message}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  const member = memberProfile?.member_info;
  const financial = memberProfile?.financial_summary;
  const attendance = memberProfile?.attendance_summary;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Avatar sx={{ mr: 2, width: 48, height: 48 }}>
              {member?.name?.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="h6">{member?.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {member?.group_name}
              </Typography>
            </Box>
          </Box>
          <Box>
            {!editing ? (
              <Button
                startIcon={<Edit />}
                onClick={() => setEditing(true)}
                variant="outlined"
              >
                Edit Profile
              </Button>
            ) : (
              <Box>
                <Button
                  startIcon={<Save />}
                  onClick={handleSave}
                  variant="contained"
                  sx={{ mr: 1 }}
                  disabled={updateMemberMutation.isLoading}
                >
                  Save
                </Button>
                <Button
                  startIcon={<Cancel />}
                  onClick={handleCancel}
                  variant="outlined"
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={3}>
          {/* Personal Information */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Gender"
                      value={formData.gender || ''}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      disabled={!editing}
                    >
                      {GENDER_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      type="date"
                      value={formData.date_of_birth || ''}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      disabled={!editing}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Education Level"
                      value={formData.education_level || ''}
                      onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <School sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    >
                      {EDUCATION_LEVELS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Occupation"
                      value={formData.occupation || ''}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <Work sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Marital Status"
                      value={formData.marital_status || ''}
                      onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                      disabled={!editing}
                    >
                      {MARITAL_STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      disabled={!editing}
                      multiline
                      rows={2}
                      InputProps={{
                        startAdornment: <Home sx={{ mr: 1, color: 'text.secondary', alignSelf: 'flex-start', mt: 1 }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Emergency Contact Name"
                      value={formData.emergency_contact_name || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      disabled={!editing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Emergency Contact Phone"
                      value={formData.emergency_contact_phone || ''}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      disabled={!editing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      label="Role"
                      value={formData.role || 'MEMBER'}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <Group sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    >
                      {OFFICER_ROLES.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Financial & Attendance Summary */}
          <Grid item xs={12} md={4}>
            <Grid container spacing={2}>
              {/* Financial Summary */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Financial Summary
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <AccountBalance color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Total Savings"
                          secondary={formatCurrency(financial?.total_savings)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <TrendingUp color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Loans Received"
                          secondary={formatCurrency(financial?.total_loans_received)}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <TrendingUp color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Loan Repayments"
                          secondary={formatCurrency(financial?.total_loan_repayments)}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Attendance Summary */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Attendance Summary
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Meetings Attended"
                          secondary={`${attendance?.meetings_attended || 0} / ${attendance?.total_meetings_invited || 0}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Attendance Rate"
                          secondary={`${member?.attendance_percentage || 0}%`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Loan Eligibility"
                          secondary={
                            <Chip
                              label={member?.is_eligible_for_loans ? 'Eligible' : 'Not Eligible'}
                              color={member?.is_eligible_for_loans ? 'success' : 'error'}
                              size="small"
                            />
                          }
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
