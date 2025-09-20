import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Box,
} from '@mui/material';
import {
  Savings,
  Campaign,
  AccountBalance,
  Groups,
  TrendingUp,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';

export default function RecentActivity() {
  const navigate = useNavigate();

  // Helper function to make group names clickable in descriptions
  const renderDescription = (description) => {
    // Simple regex to find group names (ending with "Group")
    const groupNameRegex = /([\w\s]+Group)/g;
    const parts = description.split(groupNameRegex);

    return parts.map((part, index) => {
      if (part.endsWith('Group')) {
        return (
          <Typography
            key={index}
            component="span"
            sx={{
              color: 'primary.main',
              cursor: 'pointer',
              textDecoration: 'none',
              fontWeight: 'medium',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
            onClick={() => {
              // For demo purposes, navigate to group 1. In real app, you'd map group names to IDs
              const groupId = part.includes('Kampala') ? 1 : part.includes('Nakasero') ? 2 : 1;
              navigate(`/groups/${groupId}`);
            }}
          >
            {part}
          </Typography>
        );
      }
      return part;
    });
  };
  // Mock recent activity data - in real app, this would come from API
  const activities = [
    {
      id: 1,
      type: 'savings',
      title: 'New savings recorded',
      description: 'John Doe saved UGX 50,000 in Kampala Women Group',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      icon: <Savings />,
      color: 'success',
    },
    {
      id: 2,
      type: 'campaign',
      title: 'Campaign vote cast',
      description: 'Mary voted FOR the School Fees Campaign',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      icon: <Campaign />,
      color: 'secondary',
    },
    {
      id: 3,
      type: 'loan',
      title: 'Loan assessment completed',
      description: 'Peter Mukasa - Eligible for UGX 300,000 (LOW risk)',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      icon: <AccountBalance />,
      color: 'warning',
    },
    {
      id: 4,
      type: 'group',
      title: 'New member joined',
      description: 'Sarah joined Nakasero Savings Group',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      icon: <Groups />,
      color: 'primary',
    },
    {
      id: 5,
      type: 'achievement',
      title: 'Campaign target reached',
      description: 'Medical Fund Campaign completed with 105% target',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      icon: <TrendingUp />,
      color: 'success',
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Recent Activity
        </Typography>
        <List>
          {activities.map((activity) => (
            <ListItem key={activity.id} alignItems="flex-start">
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: `${activity.color}.light`, color: `${activity.color}.main` }}>
                  {activity.icon}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight="medium">
                      {activity.title}
                    </Typography>
                    <Chip
                      label={formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {renderDescription(activity.description)}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}