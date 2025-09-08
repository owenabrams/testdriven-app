import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AccountBalance as SavingsIcon,
  Group as GroupIcon,
  TrendingUp as TransactionsIcon,
  Assessment as LoansIcon,
  EventNote as MeetingsIcon,
  Campaign as CampaignsIcon,
  Settings as SettingsIcon,
  SupervisorAccount as AdminIcon,
  Analytics as AnalyticsIcon,
  People as MembersIcon,
  AccountCircle as ProfileIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';

/**
 * Role-based navigation component that shows appropriate menu items
 * based on user role and context (main app vs microservice)
 */
export default function RoleBasedNavigation({ 
  user, 
  currentPath, 
  onNavigate, 
  context = 'main' // 'main' or 'savings-groups'
}) {
  
  const getUserRole = () => {
    if (user?.is_super_admin) return 'super_admin';
    if (user?.admin) return 'service_admin';
    
    // Check if user is a group officer (based on email for demo)
    if (user?.email?.includes('sarah') || 
        user?.email?.includes('mary') || 
        user?.email?.includes('grace')) {
      return 'group_officer';
    }
    
    return 'group_member';
  };

  const userRole = getUserRole();

  // Main application navigation (for the general system)
  const getMainAppNavigation = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
      { id: 'profile', label: 'My Profile', icon: <ProfileIcon />, path: '/my-profile' },
    ];

    switch (userRole) {
      case 'super_admin':
        return [
          ...baseItems,
          { id: 'admin', label: 'System Admin', icon: <AdminIcon />, path: '/admin' },
          { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
          { id: 'groups', label: 'All Groups', icon: <GroupIcon />, path: '/groups' },
          { id: 'campaigns', label: 'Campaigns', icon: <CampaignsIcon />, path: '/campaigns' },
          { id: 'loans', label: 'Loans', icon: <LoansIcon />, path: '/loans' },
        ];

      case 'service_admin':
        return [
          ...baseItems,
          { id: 'admin', label: 'Service Admin', icon: <AdminIcon />, path: '/admin' },
          { id: 'groups', label: 'Manage Groups', icon: <GroupIcon />, path: '/groups' },
          { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
          { id: 'campaigns', label: 'Campaigns', icon: <CampaignsIcon />, path: '/campaigns' },
        ];

      case 'group_officer':
      case 'group_member':
        return [
          ...baseItems,
          { id: 'groups', label: 'My Groups', icon: <GroupIcon />, path: '/groups' },
          { id: 'campaigns', label: 'Campaigns', icon: <CampaignsIcon />, path: '/campaigns' },
        ];

      default:
        return baseItems;
    }
  };

  // Savings Groups microservice navigation
  const getSavingsGroupsNavigation = () => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
      { id: 'calendar', label: 'Activity Calendar', icon: <CalendarIcon /> },
    ];

    switch (userRole) {
      case 'super_admin':
        return [
          ...baseItems,
          { id: 'system-overview', label: 'System Overview', icon: <AdminIcon /> },
          { id: 'all-groups', label: 'All Groups', icon: <GroupIcon /> },
          { id: 'all-transactions', label: 'All Transactions', icon: <TransactionsIcon /> },
          { id: 'system-analytics', label: 'System Analytics', icon: <AnalyticsIcon /> },
          { id: 'settings', label: 'System Settings', icon: <SettingsIcon /> },
        ];

      case 'service_admin':
        return [
          ...baseItems,
          { id: 'admin-panel', label: 'Admin Panel', icon: <AdminIcon /> },
          { id: 'manage-groups', label: 'Manage Groups', icon: <GroupIcon /> },
          { id: 'verify-transactions', label: 'Verify Transactions', icon: <TransactionsIcon /> },
          { id: 'member-management', label: 'Member Management', icon: <MembersIcon /> },
          { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
          { id: 'campaigns', label: 'Campaigns', icon: <CampaignsIcon /> },
        ];

      case 'group_officer':
        return [
          ...baseItems,
          { id: 'my-group', label: 'My Group', icon: <GroupIcon /> },
          { id: 'my-savings', label: 'My Savings', icon: <SavingsIcon /> },
          { id: 'group-transactions', label: 'Group Transactions', icon: <TransactionsIcon /> },
          { id: 'member-management', label: 'Manage Members', icon: <MembersIcon /> },
          { id: 'meetings', label: 'Meetings', icon: <MeetingsIcon /> },
          { id: 'loans', label: 'Group Loans', icon: <LoansIcon /> },
          { id: 'campaigns', label: 'Campaigns', icon: <CampaignsIcon /> },
        ];

      case 'group_member':
        return [
          ...baseItems,
          { id: 'my-group', label: 'My Group', icon: <GroupIcon /> },
          { id: 'my-savings', label: 'My Savings', icon: <SavingsIcon /> },
          { id: 'my-transactions', label: 'My Transactions', icon: <TransactionsIcon /> },
          { id: 'my-loans', label: 'My Loans', icon: <LoansIcon /> },
          { id: 'meetings', label: 'Meetings', icon: <MeetingsIcon /> },
          { id: 'campaigns', label: 'Campaigns', icon: <CampaignsIcon /> },
        ];

      default:
        return baseItems;
    }
  };

  const navigationItems = context === 'savings-groups' 
    ? getSavingsGroupsNavigation() 
    : getMainAppNavigation();

  const getRoleDisplayInfo = () => {
    switch (userRole) {
      case 'super_admin':
        return { label: 'Super Administrator', color: '#d32f2f' };
      case 'service_admin':
        return { label: 'Service Administrator', color: '#f57c00' };
      case 'group_officer':
        return { label: 'Group Officer', color: '#1976d2' };
      case 'group_member':
        return { label: 'Group Member', color: '#388e3c' };
      default:
        return { label: 'User', color: '#757575' };
    }
  };

  const roleInfo = getRoleDisplayInfo();

  return (
    <Box>
      {/* Context Header */}
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography variant="h6" noWrap>
          {context === 'savings-groups' ? 'Savings Groups' : 'Enhanced Savings'}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {context === 'savings-groups' ? 'Microservice Platform' : 'Main Platform'}
        </Typography>
      </Box>

      {/* User Role Badge */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>
          {user?.username}
        </Typography>
        <Box 
          sx={{ 
            display: 'inline-block',
            px: 1.5, 
            py: 0.5, 
            borderRadius: 1, 
            bgcolor: roleInfo.color,
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 'bold'
          }}
        >
          {roleInfo.label}
        </Box>
      </Box>

      {/* Navigation Items */}
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={currentPath === item.id}
              onClick={() => onNavigate(item.id, item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Microservice Access */}
      {context === 'main' && (
        <>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Microservices
            </Typography>
          </Box>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => onNavigate('savings-platform', '/savings-groups')}>
                <ListItemIcon>
                  <SavingsIcon />
                </ListItemIcon>
                <ListItemText primary="Savings Platform" />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}

      {/* Back to Main App */}
      {context === 'savings-groups' && (
        <>
          <Divider sx={{ my: 1 }} />
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => onNavigate('main-app', '/dashboard')}>
                <ListItemIcon>
                  <DashboardIcon />
                </ListItemIcon>
                <ListItemText primary="Back to Main App" />
              </ListItemButton>
            </ListItem>
          </List>
        </>
      )}
    </Box>
  );
}