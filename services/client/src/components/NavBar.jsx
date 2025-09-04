import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Info as InfoIcon,
  PersonAdd as PersonAddIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon
} from '@mui/icons-material';

const NavBar = ({ title = "TestDriven.io", logoutUser, isAuthenticated }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const isActiveRoute = (path) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'About', path: '/about', icon: <InfoIcon /> },
    { label: 'Modern Demo', path: '/demo', icon: <PersonAddIcon /> },
    { label: 'Testing Demo', path: '/testing', icon: <InfoIcon /> }
  ];

  const authItems = isAuthenticated ? [
    { label: 'User Status', path: '/status', icon: <AccountCircleIcon />, variant: 'text' },
    { label: 'Logout', path: '/logout', icon: <LogoutIcon />, variant: 'outlined' }
  ] : [
    { label: 'Register', path: '/register', icon: <PersonAddIcon />, variant: 'contained' },
    { label: 'Login', path: '/login', icon: <LoginIcon />, variant: 'outlined' }
  ];

  const renderDesktopNav = () => (
    <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
      {/* Navigation Links */}
      {navigationItems.map((item) => (
        <Button
          key={item.path}
          component={Link}
          to={item.path}
          color="inherit"
          startIcon={item.icon}
          sx={{
            color: isActiveRoute(item.path) ? theme.palette.secondary.main : 'inherit',
            fontWeight: isActiveRoute(item.path) ? 'bold' : 'normal',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          {item.label}
        </Button>
      ))}

      {/* User Menu for Authenticated Users */}
      {isAuthenticated && (
        <>
          <Button
            color="inherit"
            startIcon={<AccountCircleIcon />}
            onClick={handleUserMenuOpen}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }
            }}
          >
            User Menu
          </Button>
          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
          >
            <MenuItem component={Link} to="/status" onClick={handleUserMenuClose}>
              <AccountCircleIcon sx={{ mr: 1 }} />
              User Status
            </MenuItem>
            <MenuItem component={Link} to="/logout" onClick={handleUserMenuClose}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </>
      )}

      {/* Auth Buttons for Non-Authenticated Users */}
      {!isAuthenticated && (
        <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
          {authItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              variant={item.variant}
              color={item.variant === 'contained' ? 'secondary' : 'inherit'}
              startIcon={item.icon}
              sx={{
                color: item.variant === 'outlined' ? 'inherit' : undefined,
                borderColor: item.variant === 'outlined' ? 'rgba(255, 255, 255, 0.5)' : undefined,
                '&:hover': {
                  borderColor: item.variant === 'outlined' ? 'white' : undefined,
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderMobileDrawer = () => (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={handleMobileMenuToggle}
      className="navbar-menu"
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          backgroundColor: theme.palette.primary.main,
          color: 'white',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          {title}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

      {/* Navigation Items */}
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              onClick={handleMobileMenuToggle}
              sx={{
                backgroundColor: isActiveRoute(item.path) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </Box>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

      {/* Auth Items */}
      <List>
        {authItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              className="navbar-item"
              onClick={handleMobileMenuToggle}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              <Box sx={{ mr: 2, display: 'flex', alignItems: 'center' }}>
                {item.icon}
              </Box>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );

  return (
    <>
      <AppBar
        position="static"
        sx={{
          backgroundColor: theme.palette.primary.main,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              className="navbar-burger"
              onClick={handleMobileMenuToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo/Title */}
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{
              flexGrow: isMobile ? 1 : 0,
              fontWeight: 'bold',
              textDecoration: 'none',
              color: 'inherit',
              mr: 4,
              '&:hover': {
                color: theme.palette.secondary.main,
              }
            }}
          >
            {title}
          </Typography>

          {/* Desktop Navigation */}
          <Box sx={{ flexGrow: 1 }}>
            {renderDesktopNav()}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      {renderMobileDrawer()}
    </>
  );
};

export default NavBar;
