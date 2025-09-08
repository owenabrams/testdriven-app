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
import { savingsGroupsAPI } from '../../../services/api';

export default function SavingsGroupsDashboard({ userRole, membershipData }) {
  // Fetch dashboard data based on user role
  const { data: dashboardData, isLoading } = useQuery(
    ['savings-dashboard', userRole, membershipData?.group_id],
    () => {
      switch (userRole) {
        case 'super_admin':
        case 'service_admin':
          return savingsGroupsAPI.getAdminDashboard();
        case 'group_officer':
        case 'group_member':
          return savingsGroupsAPI.getMemberDashboard(membershipData?.member_id);
        default:
          return Promise.resolve(null);
      }
    },
    { enabled: !!userRole }
  );

  if (isLoading) {
    return (
      <Box>
        <Typography variant=\"h4\" gutterBottom>
          Loading Dashboard...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!membershipData && (userRole === 'group_officer' || userRole === 'group_member')) {
    return (
      <Box>
        <Alert severity=\"info\" sx={{ mb: 3 }}>
          <Typography variant=\"h6\" gutterBottom>
            Welcome to Savings Groups!
          </Typography>
          <Typography>
            You are not currently a member of any savings group. Contact your local group administrator to join a group.
          </Typography>
          <Button variant=\"contained\" sx={{ mt: 2 }}>
            Find Groups Near Me
          </Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant=\"h4\" gutterBottom>
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
  // Mock data for admin dashboard
  const adminStats = {
    totalGroups: 12,
    totalMembers: 156,
    totalSavings: 45600000,
    activeLoans: 8,
    pendingTransactions: 23,
    recentActivity: [
      { id: 1, type: 'New Group', description: 'Entebbe Fishermen Cooperative registered', time: '2 hours ago' },
      { id: 2, type: 'Large Transaction', description: 'UGX 500,000 deposit verified', time: '4 hours ago' },
      { id: 3, type: 'Loan Approved', description: 'Mary Nambi - UGX 300,000 loan approved', time: '1 day ago' },
    ]
  };

  return (
    <Grid container spacing={3}>
      {/* Stats Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display=\"flex\" alignItems=\"center\">
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                <GroupIcon />
              </Avatar>
              <Box>
                <Typography color=\"textSecondary\" gutterBottom>
                  Total Groups
                </Typography>
                <Typography variant=\"h5\">
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
            <Box display=\"flex\" alignItems=\"center\">
              <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                <GroupIcon />
              </Avatar>
              <Box>
                <Typography color=\"textSecondary\" gutterBottom>
                  Total Members
                </Typography>
                <Typography variant=\"h5\">
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
            <Box display=\"flex\" alignItems=\"center\">
              <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                <SavingsIcon />
              </Avatar>
              <Box>
                <Typography color=\"textSecondary\" gutterBottom>
                  Total Savings
                </Typography>
                <Typography variant=\"h5\">
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
            <Box display=\"flex\" alignItems=\"center\">
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                <WarningIcon />
              </Avatar>
              <Box>
                <Typography color=\"textSecondary\" gutterBottom>
                  Pending Actions
                </Typography>
                <Typography variant=\"h5\">
                  {adminStats.pendingTransactions}
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
            <Typography variant=\"h6\" gutterBottom>
              Recent System Activity
            </Typography>
            <List>
              {adminStats.recentActivity.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color=\"success\" />
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.description}
                      secondary={`${activity.type} • ${activity.time}`}
                    />
                  </ListItem>
                  {index < adminStats.recentActivity.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant=\"h6\" gutterBottom>
              Quick Actions
            </Typography>
            <Box display=\"flex\" flexDirection=\"column\" gap={2}>
              <Button variant=\"contained\" fullWidth>
                Review Pending Transactions
              </Button>
              <Button variant=\"outlined\" fullWidth>
                Create New Campaign
              </Button>
              <Button variant=\"outlined\" fullWidth>
                Generate Reports
              </Button>
              <Button variant=\"outlined\" fullWidth>
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
  // Mock member dashboard data
  const memberStats = {
    personalSavings: 500000,
    ecdFund: userRole === 'group_officer' ? 150000 : 0,
    socialFund: userRole === 'group_officer' ? 75000 : 0,
    totalContributions: userRole === 'group_officer' ? 725000 : 500000,
    groupBalance: 1800000,
    nextMeeting: '2024-12-15',
    attendanceRate: 95,
    recentTransactions: [
      { id: 1, type: 'Personal Savings', amount: 50000, date: '2024-12-01', status: 'Verified' },
      { id: 2, type: 'ECD Fund', amount: 25000, date: '2024-11-28', status: 'Verified' },
      { id: 3, type: 'Social Fund', amount: 30000, date: '2024-11-21', status: 'Verified' },
    ]
  };

  return (
    <Grid container spacing={3}>
      {/* Personal Stats */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant=\"h6\" gutterBottom>
              My Financial Summary
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Box textAlign=\"center\">
                  <Typography variant=\"h5\" color=\"primary\">
                    UGX {memberStats.personalSavings.toLocaleString()}
                  </Typography>
                  <Typography variant=\"body2\" color=\"text.secondary\">
                    Personal Savings
                  </Typography>
                </Box>
              </Grid>
              
              {userRole === 'group_officer' && (
                <>
                  <Grid item xs={6} sm={3}>
                    <Box textAlign=\"center\">
                      <Typography variant=\"h5\" color=\"secondary\">
                        UGX {memberStats.ecdFund.toLocaleString()}
                      </Typography>
                      <Typography variant=\"body2\" color=\"text.secondary\">
                        ECD Fund
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6} sm={3}>
                    <Box textAlign=\"center\">
                      <Typography variant=\"h5\" color=\"success.main\">
                        UGX {memberStats.socialFund.toLocaleString()}
                      </Typography>
                      <Typography variant=\"body2\" color=\"text.secondary\">
                        Social Fund
                      </Typography>
                    </Box>
                  </Grid>
                </>
              )}
              
              <Grid item xs={6} sm={3}>
                <Box textAlign=\"center\">
                  <Typography variant=\"h5\" color=\"info.main\">
                    UGX {memberStats.totalContributions.toLocaleString()}
                  </Typography>
                  <Typography variant=\"body2\" color=\"text.secondary\">
                    Total Contributions
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Savings Progress */}
            <Typography variant=\"subtitle1\" gutterBottom>
              Savings Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box display=\"flex\" justifyContent=\"space-between\" alignItems=\"center\" mb={1}>
                <Typography variant=\"body2\">Personal Savings</Typography>
                <Typography variant=\"body2\">
                  {((memberStats.personalSavings / memberStats.groupBalance) * 100).toFixed(1)}%
                </Typography>
              </Box>
              <LinearProgress
                variant=\"determinate\"
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
            <Typography variant=\"h6\" gutterBottom>
              Group Information
            </Typography>
            
            <Box mb={2}>
              <Typography variant=\"subtitle2\" color=\"text.secondary\">
                Group Name
              </Typography>
              <Typography variant=\"body1\">
                {membershipData?.group_name || 'Kampala Women\\'s Cooperative'}
              </Typography>
            </Box>

            <Box mb={2}>
              <Typography variant=\"subtitle2\" color=\"text.secondary\">
                My Role
              </Typography>
              <Chip 
                label={userRole === 'group_officer' ? 'Officer' : 'Member'} 
                color={userRole === 'group_officer' ? 'primary' : 'success'}
                size=\"small\"
              />
            </Box>

            <Box mb={2}>
              <Typography variant=\"subtitle2\" color=\"text.secondary\">
                Next Meeting
              </Typography>
              <Box display=\"flex\" alignItems=\"center\" gap={1}>
                <EventIcon fontSize=\"small\" />
                <Typography variant=\"body2\">
                  {memberStats.nextMeeting}
                </Typography>
              </Box>
            </Box>

            <Box mb={2}>
              <Typography variant=\"subtitle2\" color=\"text.secondary\">
                Attendance Rate
              </Typography>
              <Box display=\"flex\" alignItems=\"center\" gap={1}>
                <TrendingUpIcon fontSize=\"small\" color=\"success\" />
                <Typography variant=\"body2\">
                  {memberStats.attendanceRate}%
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Button variant=\"contained\" fullWidth sx={{ mb: 1 }}>
              Record New Savings
            </Button>
            <Button variant=\"outlined\" fullWidth>
              View Group Details
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Transactions */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant=\"h6\" gutterBottom>
              Recent Transactions
            </Typography>
            <List>
              {memberStats.recentTransactions.map((transaction, index) => (
                <React.Fragment key={transaction.id}>
                  <ListItem>
                    <ListItemIcon>
                      <SavingsIcon color=\"primary\" />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${transaction.type} - UGX ${transaction.amount.toLocaleString()}`}
                      secondary={`${transaction.date} • ${transaction.status}`}
                    />
                    <Chip 
                      label={transaction.status} 
                      color=\"success\" 
                      size=\"small\" 
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