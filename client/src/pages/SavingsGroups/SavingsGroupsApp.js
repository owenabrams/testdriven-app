import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  IconButton,
  Alert,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import RoleBasedNavigation from '../../components/Navigation/RoleBasedNavigation';
import { savingsGroupsAPI } from '../../services/api';

// Import page components
import CalendarPage from './Calendar/CalendarPage';
import SavingsGroupsDashboard from './Dashboard/SavingsGroupsDashboard';
import MyGroupPage from './MyGroup/MyGroupPage';
import MySavingsPage from './MySavings/MySavingsPage';
import MyLoansPage from './MyLoans/MyLoansPage';
import TransactionsPage from './Transactions/TransactionsPage';
import MeetingsPage from './Meetings/MeetingsPage';
import CampaignsPage from './Campaigns/CampaignsPage';
import SettingsPage from './Settings/SettingsPage';
import AdminDashboard from './Admin/AdminDashboard';

const DRAWER_WIDTH = 280;

export default function SavingsGroupsApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Handle URL-based navigation
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const page = urlParams.get('page');
    if (page) {
      setCurrentPage(page);
    }
  }, [location]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      // Fetch real user membership data
      const membershipResponse = await savingsGroupsAPI.getUserMembership(user.id);
      const groupsResponse = await savingsGroupsAPI.getGroups();

      setUserData({
        currentUser: user,
        membership: membershipResponse.data?.data,
        groups: groupsResponse.data?.data || []
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      // Fallback to basic user data
      setUserData({
        currentUser: user,
        membership: null,
        groups: []
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = () => {
    if (user?.is_super_admin) return 'super_admin';
    if (user?.admin) return 'service_admin';
    if (user?.email?.includes('sarah') || user?.email?.includes('mary') || user?.email?.includes('grace')) {
      return 'group_officer';
    }
    return 'group_member';
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const handleNavigation = (pageId, path) => {
    if (path && path.startsWith('/')) {
      // Navigate to main app
      navigate(path);
    } else {
      // Navigate within savings groups app
      setCurrentPage(pageId);
      setMobileOpen(false);
    }
  };

  const renderCurrentPage = () => {
    const userRole = getUserRole();
    const props = { userData, currentPage, setCurrentPage, user, userRole };

    switch (currentPage) {
      case 'dashboard':
        return <SavingsGroupsDashboard {...props} />;
      case 'calendar':
        return <CalendarPage {...props} />;
      case 'my-group':
        return <MyGroupPage {...props} />;
      case 'my-savings':
        return <MySavingsPage {...props} />;
      case 'my-loans':
        return <MyLoansPage {...props} />;
      case 'group-transactions':
      case 'my-transactions':
      case 'all-transactions':
        return <TransactionsPage {...props} />;
      case 'meetings':
        return <MeetingsPage {...props} />;
      case 'campaigns':
        return <CampaignsPage {...props} />;
      case 'settings':
        return <SettingsPage {...props} />;
      case 'admin-panel':
      case 'system-overview':
      case 'manage-groups':
      case 'verify-transactions':
      case 'member-management':
      case 'analytics':
      case 'system-analytics':
        return <AdminDashboard {...props} />;
      default:
        return <SavingsGroupsDashboard {...props} />;
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please log in to access the Savings Groups platform.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Typography>Loading Savings Groups data...</Typography>
      </Box>
    );
  }

  const drawer = (
    <RoleBasedNavigation
      user={user}
      currentPath={currentPage}
      onNavigate={handleNavigation}
      context="savings-groups"
    />
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
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
            Savings Groups - {getPageTitle(currentPage)}
          </Typography>

          <IconButton color="inherit" onClick={handleMenuClick}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.username?.charAt(0)?.toUpperCase()}
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>
              <PersonIcon sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8,
        }}
      >
        {renderCurrentPage()}
      </Box>
    </Box>
  );
}

// Helper function to get page titles
function getPageTitle(pageId) {
  const titles = {
    'dashboard': 'Dashboard',
    'calendar': 'Activity Calendar',
    'system-overview': 'System Overview',
    'all-groups': 'All Groups',
    'all-transactions': 'All Transactions',
    'system-analytics': 'System Analytics',
    'admin-panel': 'Admin Panel',
    'manage-groups': 'Manage Groups',
    'verify-transactions': 'Verify Transactions',
    'member-management': 'Member Management',
    'analytics': 'Analytics',
    'my-group': 'My Group',
    'my-savings': 'My Savings',
    'group-transactions': 'Group Transactions',
    'meetings': 'Meetings',
    'loans': 'Loans',
    'my-loans': 'My Loans',
    'my-transactions': 'My Transactions',
    'campaigns': 'Campaigns',
    'settings': 'Settings',
  };
  return titles[pageId] || 'Dashboard';
}