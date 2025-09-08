import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  People,
  AccountBalance,
  Campaign,
} from '@mui/icons-material';

export default function GroupOverview({ group }) {
  const stats = [
    {
      title: 'Total Balance',
      value: `UGX ${(group.total_balance || 0).toLocaleString()}`,
      icon: <TrendingUp />,
      color: 'success',
    },
    {
      title: 'Members',
      value: group.member_count || 0,
      icon: <People />,
      color: 'primary',
    },
    {
      title: 'Active Loans',
      value: group.active_loans_count || 0,
      icon: <AccountBalance />,
      color: 'warning',
    },
    {
      title: 'Campaigns',
      value: group.active_campaigns_count || 0,
      icon: <Campaign />,
      color: 'secondary',
    },
  ];

  return (
    <Grid container spacing={3}>
      {/* Stats Cards */}
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    {stat.title}
                  </Typography>
                  <Typography variant="h5" component="div" fontWeight="bold">
                    {stat.value}
                  </Typography>
                </Box>
                <Box sx={{ color: `${stat.color}.main` }}>
                  {stat.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Group Information */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Group Information
            </Typography>
            <List>
              <ListItem>
                <ListItemText
                  primary="Formation Date"
                  secondary={group.formation_date ? new Date(group.formation_date).toLocaleDateString() : 'Not set'}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Location"
                  secondary={`${group.village}, ${group.parish}, ${group.district}`}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Region"
                  secondary={group.region}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Status"
                  secondary={group.status || 'Active'}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Recent activity will be displayed here once implemented.
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}