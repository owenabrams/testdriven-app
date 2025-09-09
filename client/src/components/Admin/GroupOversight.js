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
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import savingsGroupsAPI from '../../services/savingsGroupsAPI';
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

export default function GroupOversight() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('view'); // 'view', 'edit', 'audit'
  const [tab, setTab] = useState(0);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  // Fetch all groups
  const { data: groups, isLoading } = useQuery(
    'admin-group-oversight',
    () => savingsGroupsAPI.getMockData(),
    {
      select: (response) => response.groups || [],
    }
  );

  // Enhanced group data with risk indicators
  const enhancedGroups = React.useMemo(() => {
    if (!groups) return [];
    
    return groups.map(group => {
      const memberCount = group.member_count || 0;
      const balance = group.total_balance || 0;
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
      if (group.status === 'FORMING') {
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

  // Filter groups
  const filteredGroups = enhancedGroups.filter(group =>
    group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.parish?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search groups by name, district, or parish..."
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
                      <Typography variant="body2" fontWeight="medium">
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
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(group, 'view')}
                    title="View Details"
                  >
                    <Visibility />
                  </IconButton>
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
          {dialogType === 'view' && 'Group Details & Risk Assessment'}
          {dialogType === 'edit' && 'Edit Group Settings'}
          {dialogType === 'audit' && 'Group Audit Report'}
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