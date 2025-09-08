import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  People,
  Groups,
  AccountBalance,
  Warning,
  TrendingUp,
  Security,
} from '@mui/icons-material';
import { useQuery } from 'react-query';
import { savingsGroupsAPI } from '../../services/api';

export default function AdminStatsCards() {
  // Fetch admin statistics
  const { data: groups } = useQuery(
    'admin-groups-stats',
    () => savingsGroupsAPI.getGroups(),
    {
      select: (response) => response.data.data || [],
    }
  );

  // Calculate statistics
  const totalGroups = groups?.length || 0;
  const totalMembers = groups?.reduce((sum, group) => sum + (group.member_count || 0), 0) || 0;
  const totalSavings = groups?.reduce((sum, group) => sum + (group.total_balance || 0), 0) || 0;
  const activeLoans = groups?.reduce((sum, group) => sum + (group.active_loans_count || 0), 0) || 0;
  
  // Calculate groups needing attention (example criteria)
  const groupsNeedingAttention = groups?.filter(group => 
    group.member_count < 5 || 
    (group.total_balance || 0) < 100 ||
    group.status === 'FORMING'
  ).length || 0;

  const stats = [
    {
      title: 'Total Members',
      value: totalMembers.toLocaleString(),
      subtitle: 'Across all groups',
      icon: <People />,
      color: 'primary',
      progress: Math.min((totalMembers / 1000) * 100, 100), // Assuming 1000 is target
    },
    {
      title: 'Active Groups',
      value: totalGroups.toString(),
      subtitle: 'Savings groups managed',
      icon: <Groups />,
      color: 'success',
      progress: Math.min((totalGroups / 50) * 100, 100), // Assuming 50 is target
    },
    {
      title: 'Total Savings',
      value: `UGX ${totalSavings.toLocaleString()}`,
      subtitle: 'Collective savings balance',
      icon: <AccountBalance />,
      color: 'info',
      progress: Math.min((totalSavings / 1000000) * 100, 100), // Assuming 1M is target
    },
    {
      title: 'Active Loans',
      value: activeLoans.toString(),
      subtitle: 'Loans being repaid',
      icon: <TrendingUp />,
      color: 'warning',
      progress: Math.min((activeLoans / 20) * 100, 100), // Assuming 20 is target
    },
    {
      title: 'Need Attention',
      value: groupsNeedingAttention.toString(),
      subtitle: 'Groups requiring support',
      icon: <Warning />,
      color: 'error',
      progress: Math.max(100 - (groupsNeedingAttention / totalGroups) * 100, 0),
    },
    {
      title: 'System Health',
      value: '99.9%',
      subtitle: 'Uptime & performance',
      icon: <Security />,
      color: 'success',
      progress: 99.9,
    },
  ];

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Avatar
                  sx={{
                    bgcolor: `${stat.color}.light`,
                    color: `${stat.color}.main`,
                    width: 48,
                    height: 48,
                  }}
                >
                  {stat.icon}
                </Avatar>
              </Box>
              
              <Typography variant="h5" component="div" fontWeight="bold" gutterBottom>
                {stat.value}
              </Typography>
              
              <Typography color="text.secondary" variant="body2" gutterBottom>
                {stat.title}
              </Typography>
              
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                {stat.subtitle}
              </Typography>
              
              <LinearProgress
                variant="determinate"
                value={stat.progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: `${stat.color}.light`,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: `${stat.color}.main`,
                  },
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}