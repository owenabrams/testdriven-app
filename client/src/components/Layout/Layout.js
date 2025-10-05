import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Groups as GroupsIcon,
  Campaign as CampaignIcon,
  AccountBalance as LoansIcon,
  AccountBalance,
  Analytics as AnalyticsIcon,
  SupervisorAccount as AdminIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Logout,
  Event as CalendarIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { notificationsAPI } from '../../services/api';

const drawerWidth = 240;

// Simplified menu items - show all CRUD functions for our microfinance system
const getMenuItemsForRole = (user) => {
  // All users get access to the main microfinance features
  return [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Groups', icon: <GroupsIcon />, path: '/groups' },
    { text: 'Members', icon: <AccountCircle />, path: '/members' },
    { text: 'Meetings', icon: <CalendarIcon />, path: '/meetings' },
    { text: 'Activities', icon: <CampaignIcon />, path: '/activities' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications' },
    // Admin features for super_admin role
    ...(user?.role === 'super_admin' || user?.is_super_admin ? [
      { text: 'System Admin', icon: <AdminIcon />, path: '/admin' },
      { text: 'Data Export', icon: <AnalyticsIcon />, path: '/export' },
    ] : []),
  ];
};

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Get role-appropriate menu items
  const mainMenuItems = getMenuItemsForRole(user);
  
  // Microservice items (always available)
  const microserviceItems = [
    { text: 'Savings Platform', icon: <AccountBalance />, path: '/groups' },
  ];

  // Get notifications count
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications-count', user?.id],
    queryFn: () => notificationsAPI.getUnreadCount(user?.id),
    select: (response) => response.data?.unread_count || 0,
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!user?.id,
  });

  const unreadCount = unreadCountData || 0;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Enhanced Savings
        </Typography>
      </Toolbar>
      <Divider />
      {/* Main Application Menu */}
      <List>
        {mainMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      {/* Microservices Section */}
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
          MICROSERVICES
        </Typography>
      </Box>
      <List>
        {microserviceItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname.startsWith(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'secondary.light',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {[...mainMenuItems, ...microserviceItems].find(item => 
              location.pathname === item.path || 
              (item.path === '/savings-groups' && location.pathname.startsWith('/savings-groups'))
            )?.text || 'Dashboard'}
          </Typography>
          
          <IconButton color="inherit" onClick={() => navigate('/notifications')}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="primary-search-account-menu"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/profile'); }}>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => { handleProfileMenuClose(); navigate('/settings/currency'); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Currency Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}