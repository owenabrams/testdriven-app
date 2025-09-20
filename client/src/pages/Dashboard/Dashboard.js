import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  Groups,
  Campaign,
  AccountBalance,
  Add,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { savingsGroupsAPI } from '../../services/api';
import { campaignsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from '../../components/Dashboard/StatsCard';
import RecentActivity from '../../components/Dashboard/RecentActivity';
import QuickActions from '../../components/Dashboard/QuickActions';
import ProfessionalLoader from '../../components/Common/ProfessionalLoader';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch dashboard data
  const { data: groups, isLoading: groupsLoading, error: groupsError } = useQuery(
    'dashboard-groups',
    () => savingsGroupsAPI.getGroups(),
    {
      select: (response) => response.data?.data || [],
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const { data: campaigns, isLoading: campaignsLoading, error: campaignsError } = useQuery(
    'dashboard-campaigns',
    () => campaignsAPI.getCampaigns(),
    {
      select: (response) => response.data?.data || [],
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  if (groupsLoading || campaignsLoading) {
    return (
      <ProfessionalLoader
        message="Loading Dashboard"
        showSkeleton={true}
      />
    );
  }

  if (groupsError || campaignsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Error Loading Dashboard
            </Typography>
            <Typography variant="body2">
              {groupsError?.message || campaignsError?.message || 'Failed to load dashboard data. Please try again.'}
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const totalGroups = (groups && Array.isArray(groups)) ? groups.length : 0;
  const activeCampaigns = (campaigns && Array.isArray(campaigns)) ? campaigns.length : 0;
  
  // Calculate total savings across all groups
  const totalSavings = (groups && Array.isArray(groups)) ? groups.reduce((sum, group) => {
    return sum + (group.total_balance || 0);
  }, 0) : 0;

  // Calculate active loans
  const activeLoans = (groups && Array.isArray(groups)) ? groups.reduce((sum, group) => {
    return sum + (group.active_loans_count || 0);
  }, 0) : 0;

  const stats = [
    {
      title: 'Total Savings',
      value: `UGX ${totalSavings.toLocaleString()}`,
      icon: <TrendingUp />,
      color: 'success',
      change: '+12.5%',
    },
    {
      title: 'Savings Groups',
      value: totalGroups.toString(),
      icon: <Groups />,
      color: 'primary',
      change: '+2 this month',
    },
    {
      title: 'Active Campaigns',
      value: activeCampaigns.toString(),
      icon: <Campaign />,
      color: 'secondary',
      change: `${(campaigns && Array.isArray(campaigns)) ? campaigns.filter(c => c.status === 'voting').length : 0} voting`,
    },
    {
      title: 'Active Loans',
      value: activeLoans.toString(),
      icon: <AccountBalance />,
      color: 'warning',
      change: 'UGX 2.5M disbursed',
    },
  ];

  return (
    <Box>
      {/* Welcome Section */}
      <Box mb={4} sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 2,
        p: 3,
        color: 'white'
      }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
          Welcome back, {user?.username}!
        </Typography>
        <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
          Enhanced Savings Groups Platform - Empowering Financial Inclusion
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8, mt: 1 }}>
          Here's what's happening with your savings groups today.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatsCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <QuickActions />
        </Grid>

        {/* Recent Groups */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Recent Groups</Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/groups')}
                >
                  View All
                </Button>
              </Box>
              <List>
                {(groups && Array.isArray(groups)) ? groups.slice(0, 3).map((group) => (
                  <ListItem
                    key={group.id}
                    button
                    onClick={() => navigate(`/groups/${group.id}`)}
                    sx={{ px: 0 }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {group.name.charAt(0)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={group.name}
                      secondary={`${group.member_count || 0} members • UGX ${(group.total_balance || 0).toLocaleString()}`}
                    />
                  </ListItem>
                )) : []}
              </List>
              {totalGroups === 0 && (
                <Box textAlign="center" py={2}>
                  <Typography variant="body2" color="text.secondary">
                    No groups yet. Create your first group!
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => navigate('/groups')}
                    sx={{ mt: 1 }}
                  >
                    Create Group
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Campaigns */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Active Campaigns</Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/campaigns')}
                >
                  View All
                </Button>
              </Box>
              <List>
                {(campaigns && Array.isArray(campaigns)) ? campaigns.slice(0, 3).map((campaign) => (
                  <ListItem key={campaign.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight="medium">
                            {campaign.name}
                          </Typography>
                          <Chip
                            label={campaign.status}
                            size="small"
                            color={campaign.status === 'active' ? 'success' : 'warning'}
                          />
                        </Box>
                      }
                      secondary={
                        <Box mt={1}>
                          <Typography variant="caption" color="text.secondary">
                            Target: UGX {campaign.target_amount?.toLocaleString()}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(campaign.total_contributions / campaign.target_amount) * 100}
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                )) : []}
              </List>
              {activeCampaigns === 0 && (
                <Box textAlign="center" py={2}>
                  <Typography variant="body2" color="text.secondary">
                    No active campaigns
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <RecentActivity />
        </Grid>
      </Grid>
    </Box>
  );
}