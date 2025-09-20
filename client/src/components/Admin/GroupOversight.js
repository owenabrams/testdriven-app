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
  Tabs,
  Tab,
  LinearProgress,
  Avatar,
  MenuItem,
} from '@mui/material';
import {
  Search,
  Visibility,
  Edit,
  Warning,
  CheckCircle,
  Groups,
  LocationOn,
  People,
  AccountBalance,
  Assignment,
  Security,
  TrendingUp,
  TrendingDown,
  Phone,
  Email,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { savingsGroupsAPI } from '../../services/api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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

export default function GroupOversight() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('view'); // 'view', 'edit', 'audit'
  const [tab, setTab] = useState(0);
  const [locationFilter, setLocationFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const queryClient = useQueryClient();

  console.log('🔍 GroupOversight component mounted');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch all groups
  const { data: groups, isLoading, error } = useQuery(
    'admin-group-oversight',
    () => savingsGroupsAPI.getGroups(),
    {
      select: (response) => {
        console.log('🔍 Raw API response:', response);
        const groupsData = response.data?.data?.groups || response.data?.groups || response.data?.data || [];
        console.log('🔍 Extracted groups data:', groupsData);
        return Array.isArray(groupsData) ? groupsData : [];
      },
      onError: (error) => {
        console.error('❌ GroupOversight API Error:', error);
        toast.error('Failed to load groups: ' + (error.response?.data?.message || error.message));
      },
      onSuccess: (data) => {
        console.log('✅ GroupOversight API Success:', data);
      }
    }
  );

  // Enhanced group data with risk indicators
  const enhancedGroups = React.useMemo(() => {
    console.log('🔍 Computing enhancedGroups, groups:', groups);
    if (!groups || !Array.isArray(groups)) {
      console.log('❌ Groups is not an array:', groups);
      return [];
    }

    return groups.map(group => {
      const memberCount = group.members_count || group.member_count || 0;
      const balance = group.savings_balance || group.total_balance || 0;
      const activeLoans = group.active_loans_count || 0;
      
      // Calculate risk indicators
      let riskLevel = 'LOW';
      let riskFactors = [];
      
      if (memberCount < 5) {
        riskLevel = 'HIGH';
        riskFactors.push('Low membership');
      }
      if (balance < 100000) {
        riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
        riskFactors.push('Low savings balance');
      }
      if (activeLoans > memberCount * 0.5) {
        riskLevel = 'HIGH';
        riskFactors.push('High loan ratio');
      }
      if (group.state === 'FORMING' || group.status === 'FORMING') {
        riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
        riskFactors.push('Still forming');
      }
      
      return {
        ...group,
        riskLevel,
        riskFactors,
        healthScore: Math.max(0, 100 - riskFactors.length * 25),
      };
    });
  }, [groups]);

  // Filter groups based on search term, location, and risk level
  const filteredGroups = enhancedGroups.filter(group => {
    const matchesSearch = group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.parish?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.village?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLocation = !locationFilter ||
      group.district?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      group.parish?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      group.village?.toLowerCase().includes(locationFilter.toLowerCase());

    const matchesRisk = !riskFilter || group.riskLevel === riskFilter;

    return matchesSearch && matchesLocation && matchesRisk;
  });

  // Update group mutation
  const updateGroupMutation = useMutation(
    ({ groupId, data }) => savingsGroupsAPI.updateGroup(groupId, data),
    {
      onSuccess: () => {
        toast.success('Group updated successfully');
        queryClient.invalidateQueries('admin-group-oversight');
        setDialogOpen(false);
        reset();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update group');
      },
    }
  );

  const handleOpenDialog = (group, type) => {
    setSelectedGroup(group);
    setDialogType(type);
    setDialogOpen(true);
    
    if (type === 'edit') {
      reset({
        name: group.name,
        description: group.description,
        district: group.district,
        parish: group.parish,
        village: group.village,
      });
    }
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedGroup(null);
    reset();
  };

  const onUpdateGroup = (data) => {
    updateGroupMutation.mutate({
      groupId: selectedGroup.id,
      data,
    });
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      default: return 'default';
    }
  };

  const getHealthColor = (score) => {
    if (score >= 75) return 'success.main';
    if (score >= 50) return 'warning.main';
    return 'error.main';
  };

  if (isLoading) {
    return <Typography>Loading groups...</Typography>;
  }

  if (error) {
    return (
      <Alert severity="error">
        <Typography>Failed to load groups: {error.response?.data?.message || error.message}</Typography>
      </Alert>
    );
  }

  console.log('🔍 GroupOversight render - groups:', groups, 'enhancedGroups:', enhancedGroups);

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Group Oversight
        </Typography>
        <Alert severity="info" sx={{ maxWidth: 400 }}>
          <Typography variant="body2">
            <strong>Admin Oversight:</strong> Monitor all groups, assess risks, and ensure compliance
          </Typography>
        </Alert>
      </Box>

      {/* Risk Summary Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">
                {enhancedGroups.filter(g => g.riskLevel === 'LOW').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Low Risk Groups
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6">
                {enhancedGroups.filter(g => g.riskLevel === 'MEDIUM').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Medium Risk Groups
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h6">
                {enhancedGroups.filter(g => g.riskLevel === 'HIGH').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                High Risk Groups
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">
                {Math.round(enhancedGroups.reduce((sum, g) => sum + g.healthScore, 0) / enhancedGroups.length) || 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Average Health Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="Search groups by name, district, parish, or village..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            select
            label="Filter by Location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <MenuItem value="">All Locations</MenuItem>
            <MenuItem value="kampala">Kampala</MenuItem>
            <MenuItem value="wakiso">Wakiso</MenuItem>
            <MenuItem value="jinja">Jinja</MenuItem>
            <MenuItem value="nakivale">Nakivale Settlement</MenuItem>
            <MenuItem value="kiryandongo">Kiryandongo Settlement</MenuItem>
            <MenuItem value="central">Central Region</MenuItem>
            <MenuItem value="eastern">Eastern Region</MenuItem>
            <MenuItem value="western">Western Region</MenuItem>
            <MenuItem value="northern">Northern Region</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            select
            label="Filter by Risk Level"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <MenuItem value="">All Risk Levels</MenuItem>
            <MenuItem value="LOW">Low Risk</MenuItem>
            <MenuItem value="MEDIUM">Medium Risk</MenuItem>
            <MenuItem value="HIGH">High Risk</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              setSearchTerm('');
              setLocationFilter('');
              setRiskFilter('');
            }}
            sx={{ height: '56px' }}
          >
            Clear Filters
          </Button>
        </Grid>
      </Grid>

      {/* Groups Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Group</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Members</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>Health Score</TableCell>
              <TableCell>Risk Level</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGroups.map((group) => (
              <TableRow key={group.id}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      {group.name?.charAt(0)}
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
                        onClick={() => navigate(`/groups/${group.id}`)}
                      >
                        {group.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {group.status} • Formed {group.formation_date ? new Date(group.formation_date).getFullYear() : 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{group.district}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {group.parish}, {group.village}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {group.member_count || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Max: {group.max_members || 30}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    UGX {(group.total_balance || 0).toLocaleString()}
                  </Typography>
                  {group.target_amount && (
                    <Typography variant="caption" color="text.secondary">
                      Target: UGX {group.target_amount.toLocaleString()}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={group.healthScore}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: getHealthColor(group.healthScore),
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 35 }}>
                      {group.healthScore}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={group.riskLevel}
                    color={getRiskColor(group.riskLevel)}
                    size="small"
                  />
                  {group.riskFactors.length > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {group.riskFactors.length} risk factor{group.riskFactors.length > 1 ? 's' : ''}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => navigate(`/groups/${group.id}`)}
                    sx={{ mr: 1 }}
                  >
                    View Details
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(group, 'edit')}
                    title="Edit Group"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(group, 'audit')}
                    title="Audit Report"
                  >
                    <Assignment />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Group Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {dialogType === 'view' && 'Group Details & Risk Assessment'}
              {dialogType === 'edit' && 'Edit Group Settings'}
              {dialogType === 'audit' && 'Group Audit Report'}
            </Typography>
            {dialogType === 'view' && selectedGroup && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Visibility />}
                onClick={() => {
                  handleCloseDialog();
                  navigate(`/groups/${selectedGroup.id}`);
                }}
              >
                View Full Profile
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedGroup && (
            <>
              {dialogType === 'view' && (
                <Box>
                  <Tabs value={tab} onChange={(e, v) => setTab(v)}>
                    <Tab label="Overview" />
                    <Tab label="Risk Assessment" />
                    <Tab label="Financial Health" />
                  </Tabs>
                  
                  <TabPanel value={tab} index={0}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Group Name</Typography>
                        <Typography variant="body1">{selectedGroup.name}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                        <Typography variant="body1">{selectedGroup.status}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Members</Typography>
                        <Typography variant="body1">
                          {selectedGroup.member_count || 0} / {selectedGroup.max_members || 30}
                        </Typography>
                        <Button
                          size="small"
                          variant="text"
                          startIcon={<People />}
                          onClick={() => {
                            handleCloseDialog();
                            navigate(`/groups/${selectedGroup.id}`);
                          }}
                          sx={{ mt: 1 }}
                        >
                          View All Members
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Formation Date</Typography>
                        <Typography variant="body1">
                          {selectedGroup.formation_date ? new Date(selectedGroup.formation_date).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                        <Typography variant="body1">
                          {selectedGroup.village}, {selectedGroup.parish}, {selectedGroup.district}
                        </Typography>
                      </Grid>
                    </Grid>
                  </TabPanel>

                  <TabPanel value={tab} index={1}>
                    {/* Members List */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        Group Members ({selectedGroup.member_count || 0})
                      </Typography>

                      {selectedGroup.members && selectedGroup.members.length > 0 ? (
                        <TableContainer component={Paper} sx={{ mt: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Contact</TableCell>
                                <TableCell>Gender</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Savings</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedGroup.members.map((member) => (
                                <TableRow key={member.id}>
                                  <TableCell>
                                    <Box display="flex" alignItems="center">
                                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 32, height: 32 }}>
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
                                          onClick={() => {
                                            handleCloseDialog();
                                            navigate(`/members/${member.id}`);
                                          }}
                                        >
                                          {member.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          Joined {member.joined_date ? new Date(member.joined_date).toLocaleDateString() : 'N/A'}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={member.role || 'Member'}
                                      size="small"
                                      color={member.role === 'CHAIRPERSON' ? 'primary' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Box>
                                      {member.phone && (
                                        <Typography variant="body2" display="flex" alignItems="center">
                                          <Phone sx={{ fontSize: 14, mr: 0.5 }} />
                                          {member.phone}
                                        </Typography>
                                      )}
                                      {member.email && (
                                        <Typography variant="body2" display="flex" alignItems="center">
                                          <Email sx={{ fontSize: 14, mr: 0.5 }} />
                                          {member.email}
                                        </Typography>
                                      )}
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    {member.gender === 'F' ? 'Female' : member.gender === 'M' ? 'Male' : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={member.is_active ? 'Active' : 'Inactive'}
                                      size="small"
                                      color={member.is_active ? 'success' : 'default'}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" fontWeight="medium">
                                      UGX {(member.share_balance || 0).toLocaleString()}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Total: UGX {(member.total_contributions || 0).toLocaleString()}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          No member details available for this group.
                        </Alert>
                      )}
                    </Box>
                  </TabPanel>

                  <TabPanel value={tab} index={2}>
                    <Box sx={{ mt: 2 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Chip
                          label={`${selectedGroup.riskLevel} RISK`}
                          color={getRiskColor(selectedGroup.riskLevel)}
                          sx={{ mr: 2 }}
                        />
                        <Typography variant="h6">
                          Health Score: {selectedGroup.healthScore}%
                        </Typography>
                      </Box>
                      
                      {selectedGroup.riskFactors.length > 0 ? (
                        <List>
                          {selectedGroup.riskFactors.map((factor, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <Warning color="warning" />
                              </ListItemIcon>
                              <ListItemText primary={factor} />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Alert severity="success">
                          No risk factors identified. Group is performing well.
                        </Alert>
                      )}
                    </Box>
                  </TabPanel>
                  
                  <TabPanel value={tab} index={2}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Total Balance</Typography>
                        <Typography variant="h6" color="primary">
                          UGX {(selectedGroup.total_balance || 0).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Target Amount</Typography>
                        <Typography variant="h6" color="success.main">
                          UGX {(selectedGroup.target_amount || 0).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Active Loans</Typography>
                        <Typography variant="body1">{selectedGroup.active_loans_count || 0}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">Meeting Frequency</Typography>
                        <Typography variant="body1">{selectedGroup.meeting_frequency || 'WEEKLY'}</Typography>
                      </Grid>
                    </Grid>
                  </TabPanel>
                </Box>
              )}

              {dialogType === 'edit' && (
                <Box component="form" onSubmit={handleSubmit(onUpdateGroup)} sx={{ mt: 2 }}>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <strong>Admin Override:</strong> Changes will be logged and audited
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Group Name"
                        {...register('name', { required: 'Name is required' })}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="District"
                        {...register('district', { required: 'District is required' })}
                        error={!!errors.district}
                        helperText={errors.district?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Parish"
                        {...register('parish', { required: 'Parish is required' })}
                        error={!!errors.parish}
                        helperText={errors.parish?.message}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Village"
                        {...register('village', { required: 'Village is required' })}
                        error={!!errors.village}
                        helperText={errors.village?.message}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={3}
                        {...register('description')}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {dialogType === 'audit' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Detailed audit report with compliance status, financial history, and member activity would be displayed here.
                  </Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {dialogType === 'edit' && (
            <Button
              onClick={handleSubmit(onUpdateGroup)}
              variant="contained"
              disabled={updateGroupMutation.isLoading}
            >
              {updateGroupMutation.isLoading ? 'Updating...' : 'Update Group'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}