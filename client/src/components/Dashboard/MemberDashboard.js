import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Button,
  Alert,
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  Event,
  Group,
  CheckCircle,
  Warning,
  Schedule,
  Payment,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { savingsGroupsAPI, meetingsAPI } from '../../services/api';
import StatsCard from './StatsCard';
import ProfessionalLoader from '../Common/ProfessionalLoader';

export default function MemberDashboard() {
  const { user } = useAuth();

  // Fetch member's groups
  const { data: memberGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['member-groups', user?.id],
    queryFn: () => savingsGroupsAPI.getUserMembership(user?.id),
    select: (response) => response.data?.groups || [],
    enabled: !!user?.id,
  });

  // Fetch member's upcoming meetings
  const { data: upcomingMeetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['member-meetings', user?.id],
    queryFn: () => meetingsAPI.getCalendar({ member_id: user?.id }),
    select: (response) => response.data?.meetings || [],
    enabled: !!user?.id,
  });

  // Fetch member's financial summary
  const { data: memberFinancials, isLoading: financialsLoading } = useQuery({
    queryKey: ['member-financials', user?.id],
    queryFn: () => savingsGroupsAPI.getMemberTransactions(user?.id),
    select: (response) => response.data,
    enabled: !!user?.id,
  });

  if (groupsLoading || meetingsLoading || financialsLoading) {
    return <ProfessionalLoader message="Loading Your Dashboard" />;
  }

  const totalSavings = memberFinancials?.total_savings || 0;
  const activeLoans = memberFinancials?.active_loans || 0;
  const attendanceRate = memberFinancials?.attendance_percentage || 0;
  const loanEligible = memberFinancials?.is_eligible_for_loans || false;

  const stats = [
    {
      title: 'Total Savings',
      value: `UGX ${totalSavings.toLocaleString()}`,
      icon: <TrendingUp />,
      color: 'success',
      change: '+5.2% this month',
    },
    {
      title: 'Active Loans',
      value: activeLoans.toString(),
      icon: <AccountBalance />,
      color: 'primary',
      change: activeLoans > 0 ? 'Repayment due' : 'No active loans',
    },
    {
      title: 'Attendance Rate',
      value: `${attendanceRate}%`,
      icon: <CheckCircle />,
      color: attendanceRate >= 50 ? 'success' : 'warning',
      change: attendanceRate >= 50 ? 'Loan eligible' : 'Below 50%',
    },
    {
      title: 'My Groups',
      value: memberGroups.length.toString(),
      icon: <Group />,
      color: 'secondary',
      change: `${memberGroups.length} active memberships`,
    },
  ];

  return (
    <Box>
      {/* Welcome Section */}
      <Box mb={4} sx={{
        background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
        borderRadius: 2,
        p: 3,
        color: 'white'
      }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Welcome back, {user?.username}!
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          Your Personal Savings Dashboard
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
          Track your savings, loans, and group activities.
        </Typography>
      </Box>

      {/* Loan Eligibility Alert */}
      {!loanEligible && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You need at least 50% meeting attendance to be eligible for loans. 
            Current attendance: {attendanceRate}%
          </Typography>
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatsCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* My Groups */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Group color="primary" />
                My Groups
              </Typography>
              
              {memberGroups.length > 0 ? (
                <List>
                  {memberGroups.map((group) => (
                    <ListItem key={group.id} divider>
                      <ListItemIcon>
                        <Group color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={group.name}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {group.region} • {group.members_count} members
                            </Typography>
                            <Typography variant="caption" display="block">
                              My Savings: UGX {(group.my_savings || 0).toLocaleString()}
                            </Typography>
                            <Box mt={0.5}>
                              <Chip
                                label={group.my_role || 'Member'}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  You are not a member of any groups yet. Contact your group chairperson to join.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Meetings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Event color="primary" />
                Upcoming Meetings
              </Typography>
              
              {upcomingMeetings.length > 0 ? (
                <List>
                  {upcomingMeetings.slice(0, 3).map((meeting) => (
                    <ListItem key={meeting.id} divider>
                      <ListItemIcon>
                        <Schedule color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={meeting.title}
                        secondary={
                          <Box>
                            <Typography variant="caption" display="block">
                              {meeting.group_name}
                            </Typography>
                            <Typography variant="caption" display="block">
                              {meeting.meeting_date} at {meeting.meeting_time}
                            </Typography>
                            <Box mt={0.5}>
                              <Chip
                                label={meeting.invitation_status || 'Invited'}
                                size="small"
                                color={meeting.invitation_status === 'ACCEPTED' ? 'success' : 'warning'}
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  No upcoming meetings scheduled.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Payment color="primary" />
                Financial Summary
              </Typography>
              
              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Total Contributions
                </Typography>
                <Typography variant="h5" color="success.main">
                  UGX {totalSavings.toLocaleString()}
                </Typography>
              </Box>

              {memberFinancials?.recent_transactions && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recent Transactions
                  </Typography>
                  <List dense>
                    {memberFinancials.recent_transactions.slice(0, 3).map((transaction, index) => (
                      <ListItem key={index} sx={{ px: 0 }}>
                        <ListItemText
                          primary={transaction.description}
                          secondary={
                            <Box display="flex" justifyContent="space-between">
                              <Typography variant="caption">
                                {new Date(transaction.date).toLocaleDateString()}
                              </Typography>
                              <Typography variant="caption" color="success.main">
                                +UGX {transaction.amount.toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Loan Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <AccountBalance color="primary" />
                Loan Status
              </Typography>
              
              {loanEligible ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    You are eligible to apply for loans!
                  </Alert>
                  <Button variant="contained" fullWidth>
                    Apply for Loan
                  </Button>
                </Box>
              ) : (
                <Box>
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Improve your attendance to become loan eligible.
                  </Alert>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      Attendance Progress
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={attendanceRate}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {attendanceRate}% of 50% required
                    </Typography>
                  </Box>
                </Box>
              )}

              {activeLoans > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Active Loans: {activeLoans}
                  </Typography>
                  <Button variant="outlined" size="small">
                    View Loan Details
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
