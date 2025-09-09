import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Avatar,
  Chip,
  Alert,
} from '@mui/material';
import {
  SupervisorAccount,
  People,
  AccountBalance,
  Groups,
  Settings,
  Security,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import MemberManagement from '../../components/Admin/MemberManagement';
import FinancialSupport from '../../components/Admin/FinancialSupport';
import GroupOversight from '../../components/Admin/GroupOversight';
import SystemSettings from '../../components/Admin/SystemSettings';
import AdminStatsCards from '../../components/Admin/AdminStatsCards';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState(0);
  const { user } = useAuth();

  // Check if user has admin privileges
  const isAdmin = user?.is_super_admin || user?.role === 'super_admin' || user?.admin;

  if (!isAdmin) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Access Denied
          </Typography>
          <Typography>
            You need administrator privileges to access this section. Please contact your system administrator.
          </Typography>
        </Alert>
      </Box>
    );
  }

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Box>
      {/* Admin Header */}
      <Box display="flex" alignItems="center" mb={4}>
        <Avatar sx={{ bgcolor: 'error.main', mr: 2, width: 56, height: 56 }}>
          <SupervisorAccount sx={{ fontSize: 32 }} />
        </Avatar>
        <Box>
          <Typography variant="h4" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive system administration and member support
          </Typography>
          <Box display="flex" gap={1} mt={1}>
            <Chip 
              label="Super Admin" 
              color="error" 
              size="small" 
              icon={<Security />}
            />
            <Chip 
              label="Full CRUD Access" 
              color="success" 
              size="small" 
            />
          </Box>
        </Box>
      </Box>

      {/* Admin Stats */}
      <AdminStatsCards />

      {/* Admin Tabs */}
      <Card sx={{ mt: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={handleTabChange} aria-label="admin tabs">
            <Tab 
              label="Member Management" 
              icon={<People />} 
              iconPosition="start"
            />
            <Tab 
              label="Financial Support" 
              icon={<AccountBalance />} 
              iconPosition="start"
            />
            <Tab 
              label="Group Oversight" 
              icon={<Groups />} 
              iconPosition="start"
            />
            <Tab 
              label="System Settings" 
              icon={<Settings />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={tab} index={0}>
          <MemberManagement />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <FinancialSupport />
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <GroupOversight />
        </TabPanel>
        <TabPanel value={tab} index={3}>
          <SystemSettings />
        </TabPanel>
      </Card>
    </Box>
  );
}