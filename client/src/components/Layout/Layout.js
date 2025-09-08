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
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'react-query';
import { notificationsAPI } from '../../services/api';

const drawerWidth = 240;

// Role-based menu items for the main application
const getMenuItemsForRole = (user) => {
  const baseItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'My Profile', icon: <AccountCircle />, path: '/my-profile' },
  ];

  // Super Admin gets full access
  if (user?.is_super_admin) {
    return [
      ...baseItems,
      { text: 'System Admin', icon: <AdminIcon />, path: '/admin' },
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
      { text: 'All Groups', icon: <GroupsIcon />, path: '/groups' },
      { text: 'Campaigns', icon: <CampaignIcon />, path: '/campaigns' },
      { text: 'Loans', icon: <LoansIcon />, path: '/loans' },
    ];
  }

  // Service Admin gets service management access
  if (user?.admin) {
    return [
      ...baseItems,
      { text: 'Service Admin', icon: <AdminIcon />, path: '/admin' },
      { text: 'Manage Groups', icon: <GroupsIcon />, path: '/groups' },
      { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
      { text: 'Campaigns', icon: <CampaignIcon />, path: '/campaigns' },
    ];
  }

  // Regular users get basic access
  return [
    ...baseItems,
    { text: 'My Groups', icon: <GroupsIcon />, path: '/groups' },
    { text: 'Campaigns', icon: <CampaignIcon />, path: '/campaigns' },
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
    { text: 'Savings Platform', icon: <AccountBalance />, path: '/savings-groups' },
  ];

  // Get notifications count
  const { data: notifications } = useQuery(
    'notifications',
    () => notificationsAPI.getNotifications(),
    {
      select: (response) => response.data.data || [],
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

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