import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Alert,
} from '@mui/material';
import {
  AccountBalance as SavingsIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { savingsGroupsAPI } from '../../../services/api';

export default function SavingsGroupsDashboard({ userRole, membershipData }) {
  const navigate = useNavigate();
  // Fetch dashboard data based on user role
  const { data: dashboardData, isLoading, error } = useQuery(
    ['savings-dashboard', userRole, membershipData?.member_id],
    () => {
      switch (userRole) {
        case 'super_admin':
        case 'service_admin':
          return savingsGroupsAPI.getAdminDashboard();
        case 'group_officer':
        case 'group_member':
          if (membershipData?.member_id) {
            return savingsGroupsAPI.getMemberDashboard(membershipData.member_id);
          }
          return Promise.resolve({ data: { data: null } });
        default:
          return Promise.resolve({ data: { data: null } });
      }
    },
    {
      enabled: !!userRole,
      retry: 1
    }
  );

  if (isLoading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Loading Dashboard...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Error Loading Dashboard
          </Typography>
          <Typography>
            {error.message || 'Failed to load dashboard data. Please try again.'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  if (!membershipData && (userRole === 'group_officer' || userRole === 'group_member')) {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Welcome to Savings Groups!
          </Typography>
          <Typography>
            You are not currently a member of any savings group. Contact your local group administrator to join a group.
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }}>
            Find Groups Near Me
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {getRoleTitle(userRole)}
      </Typography>
      
      {userRole === 'super_admin' || userRole === 'service_admin' ? (
        <AdminDashboardContent dashboardData={dashboardData} userRole={userRole} />
      ) : (
        <MemberDashboardContent 
          dashboardData={dashboardData} 
          membershipData={membershipData} 
          userRole={userRole} 
        />
      )}
    </Box>
  );
}

function getRoleTitle(userRole) {
  switch (userRole) {
    case 'super_admin': return 'System Administration Dashboard';
    case 'service_admin': return 'Savings Groups Administration';
    case 'group_officer': return 'Group Officer Dashboard';
    case 'group_member': return 'My Savings Dashboard';
    default: return 'Dashboard';
  }
}

function AdminDashboardContent({ dashboardData, userRole }) {
  // Use real data from API or fallback to defaults
  const data = dashboardData?.data?.data;
  const adminStats = {
    totalGroups: data?.summary?.total_groups || 0,
    totalMembers: data?.summary?.total_members || 0,
    totalSavings: data?.summary?.total_savings || 0,
    activeGroups: data?.summary?.active_groups || 0,
    recentGroups: data?.recent_groups || []
  };

  return (
    <Grid container spacing={3}>
      {/* Stats Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <GroupIcon />
              </Avatar>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Groups
                </Typography>
                <Typography variant="h5">
                  {adminStats.totalGroups}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <GroupIcon />
              </Avatar>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Members
                </Typography>
                <Typography variant="h5">
                  {adminStats.totalMembers}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                <SavingsIcon />
              </Avatar>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Savings
                </Typography>
                <Typography variant="h5">
                  UGX {adminStats.totalSavings.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <WarningIcon />
              </Avatar>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Recent Groups
                </Typography>
                <Typography variant="h5">
                  {adminStats.recentGroups.length}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Groups
            </Typography>
            <List>
              {adminStats.recentGroups.length > 0 ? adminStats.recentGroups.map((group, index) => (
                <React.Fragment key={group.id}>
                  <ListItem
                    button
                    onClick={() => navigate(`/groups/${group.id}`)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'action.hover'
                      }
                    }}
                  >
                    <ListItemIcon>
                      <GroupIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'primary.main',
                            fontWeight: 'medium',
                            '&:hover': {
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {group.name}
                        </Typography>
                      }
                      secondary={`${group.district}, ${group.parish} • ${group.state}`}
                    />
                  </ListItem>
                  {index < adminStats.recentGroups.length - 1 && <Divider />}
                </React.Fragment>
              )) : (
                <ListItem>
                  <ListItemText
                    primary="No recent groups"
                    secondary="Groups will appear here as they are created"
                  />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button variant="contained" fullWidth>
                Review Pending Transactions
              </Button>
              <Button variant="outlined" fullWidth>
                Create New Campaign
              </Button>
              <Button variant="outlined" fullWidth>
                Generate Reports
              </Button>
              <Button variant="outlined" fullWidth>
                System Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

function MemberDashboardContent({ dashboardData, membershipData, userRole }) {
  const navigate = useNavigate();
  // Use real data from API or fallback to defaults
  const data = dashboardData?.data?.data;
  const memberStats = {
    totalSavings: data?.total_savings || 0,
    attendanceRate: data?.attendance_rate || 0,
    recentTransactions: data?.recent_transactions || [],
    savings: data?.savings || [],
    member: data?.member || {},
    group: data?.group || {}
  };

  // Calculate savings by type
  const savingsByType = memberStats.savings.reduce((acc, saving) => {
    const typeName = saving.saving_type?.name || 'Unknown';
    acc[typeName] = saving.current_balance || 0;
    return acc;
  }, {});

  return (
    <Grid container spacing={3}>
      {/* Personal Stats */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              My Financial Summary
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Display savings by type */}
              {Object.entries(savingsByType).map(([typeName, amount], index) => (
                <Grid item xs={6} sm={3} key={typeName}>
                  <Box textAlign="center">
                    <Typography variant="h5" color={index === 0 ? "primary" : index === 1 ? "secondary" : "success.main"}>
                      UGX {Number(amount).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {typeName}
                    </Typography>
                  </Box>
                </Grid>
              ))}

              <Grid item xs={6} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h5" color="info.main">
                    UGX {Number(memberStats.totalSavings).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Savings
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Savings Progress */}
            <Typography variant="subtitle1" gutterBottom>
              Savings Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Personal Savings</Typography>
                <Typography variant="body2">
                  {((memberStats.personalSavings / memberStats.groupBalance) * 100).toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(memberStats.personalSavings / memberStats.groupBalance) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Group Info & Quick Stats */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Group Information
            </Typography>
            
            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Group Name
              </Typography>
              <Typography
                variant="body1"
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
                onClick={() => navigate(`/groups/${membershipData?.group_id || 1}`)}
              >
                {membershipData?.group_name || "Kampala Women's Cooperative"}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                My Role
              </Typography>
              <Chip 
                label={userRole === 'group_officer' ? 'Officer' : 'Member'} 
                color={userRole === 'group_officer' ? 'primary' : 'success'}
                size="small"
              />
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Next Meeting
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <EventIcon fontSize="small" />
                <Typography variant="body2">
                  {memberStats.nextMeeting}
                </Typography>
              </Box>
            </Box>

            <Box mb={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Attendance Rate
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon fontSize="small" color="success" />
                <Typography variant="body2">
                  {memberStats.attendanceRate}%
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Button variant="contained" fullWidth sx={{ mb: 1 }}>
              Record New Savings
            </Button>
            <Button variant="outlined" fullWidth>
              View Group Details
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Transactions */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Transactions
            </Typography>
            <List>
              {memberStats.recentTransactions.map((transaction, index) => (
                <React.Fragment key={transaction.id}>
                  <ListItem>
                    <ListItemIcon>
                      <SavingsIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${transaction.type} - UGX ${transaction.amount.toLocaleString()}`}
                      secondary={`${transaction.date} • ${transaction.status}`}
                    />
                    <Chip 
                      label={transaction.status} 
                      color="success" 
                      size="small" 
                    />
                  </ListItem>
                  {index < memberStats.recentTransactions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}