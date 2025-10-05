import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
} from '@mui/material';
import {
  Add,
  Groups,
  Campaign,
  AccountBalance,
  Analytics,
  Savings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Create Group',
      description: 'Start a new savings group',
      icon: <Groups />,
      color: 'primary',
      onClick: () => {
        console.log('🔧 QuickActions: Create Group clicked - navigating to /groups?action=create');
        navigate('/groups?action=create');
      },
    },
    {
      title: 'New Campaign',
      description: 'Launch a target campaign',
      icon: <Campaign />,
      color: 'secondary',
      onClick: () => {
        console.log('🔧 QuickActions: New Campaign clicked - navigating to /campaigns?action=create');
        navigate('/campaigns?action=create');
      },
    },
    {
      title: 'Record Savings',
      description: 'Add member savings',
      icon: <Savings />,
      color: 'success',
      onClick: () => {
        console.log('🔧 QuickActions: Record Savings clicked - navigating to /groups?action=savings');
        navigate('/groups?action=savings');
      },
    },
    {
      title: 'Loan Assessment',
      description: 'Assess loan eligibility',
      icon: <AccountBalance />,
      color: 'warning',
      onClick: () => navigate('/loans?action=assess'),
    },
    {
      title: 'View Analytics',
      description: 'Check performance',
      icon: <Analytics />,
      color: 'info',
      onClick: () => navigate('/analytics'),
    },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          {actions.map((action, index) => (
            <Grid item xs={12} key={index}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={action.icon}
                onClick={action.onClick}
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  py: 1.5,
                  borderColor: `${action.color}.light`,
                  color: `${action.color}.main`,
                  '&:hover': {
                    borderColor: `${action.color}.main`,
                    backgroundColor: `${action.color}.light`,
                    color: 'white',
                  },
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {action.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {action.description}
                  </Typography>
                </Box>
              </Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}