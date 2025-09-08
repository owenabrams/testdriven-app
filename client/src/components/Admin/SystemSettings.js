import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Settings,
  Security,
  Notifications,
  Storage,
  Speed,
  Update,
  Backup,
  Warning,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

export default function SystemSettings() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState('');
  
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Mock system settings
  const [settings, setSettings] = useState({
    maxMembersPerGroup: 30,
    defaultMeetingFrequency: 'WEEKLY',
    loanAssessmentValidityMonths: 3,
    mobileMoneyVerificationRequired: true,
    automaticStateTransitions: true,
    emailNotifications: true,
    smsNotifications: false,
    auditLogRetentionDays: 365,
    backupFrequency: 'DAILY',
    maintenanceMode: false,
  });

  const systemStats = {
    totalUsers: 1247,
    totalGroups: 89,
    totalTransactions: 15623,
    systemUptime: '99.9%',
    lastBackup: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    databaseSize: '2.3 GB',
    apiResponseTime: '145ms',
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    toast.success('Setting updated successfully');
  };

  const handleOpenDialog = (type) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setDialogType('');
  };

  const onBackupSystem = () => {
    toast.success('System backup initiated');
    handleCloseDialog();
  };

  const onMaintenanceMode = () => {
    handleSettingChange('maintenanceMode', !settings.maintenanceMode);
    toast.info(settings.maintenanceMode ? 'Maintenance mode disabled' : 'Maintenance mode enabled');
    handleCloseDialog();
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          System Settings
        </Typography>
        <Alert severity="warning" sx={{ maxWidth: 400 }}>
          <Typography variant="body2">
            <strong>Admin Only:</strong> Changes affect the entire system
          </Typography>
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* System Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Speed sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">System Status</Typography>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="System Uptime"
                    secondary={systemStats.systemUptime}
                  />
                  <Chip label="Excellent" color="success" size="small" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="API Response Time"
                    secondary={systemStats.apiResponseTime}
                  />
                  <Chip label="Good" color="success" size="small" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Database Size"
                    secondary={systemStats.databaseSize}
                  />
                  <Chip label="Normal" color="info" size="small" />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Last Backup"
                    secondary={systemStats.lastBackup.toLocaleString()}
                  />
                  <Chip label="Recent" color="success" size="small" />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System Statistics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Storage sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">System Statistics</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="h4" color="primary">
                    {systemStats.totalUsers.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h4" color="success.main">
                    {systemStats.totalGroups}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Groups
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="h4" color="info.main">
                    {systemStats.totalTransactions.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Transactions
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Business Rules */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Settings sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Business Rules</Typography>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="Max Members per Group"
                    secondary="Maximum number of members allowed in a savings group"
                  />
                  <ListItemSecondaryAction>
                    <TextField
                      size="small"
                      type="number"
                      value={settings.maxMembersPerGroup}
                      onChange={(e) => handleSettingChange('maxMembersPerGroup', parseInt(e.target.value))}
                      sx={{ width: 80 }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Loan Assessment Validity"
                    secondary="Months before loan assessment expires"
                  />
                  <ListItemSecondaryAction>
                    <TextField
                      size="small"
                      type="number"
                      value={settings.loanAssessmentValidityMonths}
                      onChange={(e) => handleSettingChange('loanAssessmentValidityMonths', parseInt(e.target.value))}
                      sx={{ width: 80 }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Default Meeting Frequency"
                    secondary="Default frequency for new groups"
                  />
                  <ListItemSecondaryAction>
                    <TextField
                      size="small"
                      select
                      value={settings.defaultMeetingFrequency}
                      onChange={(e) => handleSettingChange('defaultMeetingFrequency', e.target.value)}
                      SelectProps={{ native: true }}
                      sx={{ width: 120 }}
                    >
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Bi-weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </TextField>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Security & Compliance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Security sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Security & Compliance</Typography>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="Mobile Money Verification"
                    secondary="Require admin verification for mobile money transactions"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.mobileMoneyVerificationRequired}
                      onChange={(e) => handleSettingChange('mobileMoneyVerificationRequired', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Automatic State Transitions"
                    secondary="Allow system to automatically update group states"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.automaticStateTransitions}
                      onChange={(e) => handleSettingChange('automaticStateTransitions', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Audit Log Retention"
                    secondary="Days to retain audit logs"
                  />
                  <ListItemSecondaryAction>
                    <TextField
                      size="small"
                      type="number"
                      value={settings.auditLogRetentionDays}
                      onChange={(e) => handleSettingChange('auditLogRetentionDays', parseInt(e.target.value))}
                      sx={{ width: 80 }}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Notifications sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Notification Settings</Typography>
              </Box>
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="Email Notifications"
                    secondary="Send system notifications via email"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="SMS Notifications"
                    secondary="Send system notifications via SMS"
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={settings.smsNotifications}
                      onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Update sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">System Actions</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Backup />}
                    onClick={() => handleOpenDialog('backup')}
                  >
                    Create System Backup
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color={settings.maintenanceMode ? 'success' : 'warning'}
                    startIcon={<Warning />}
                    onClick={() => handleOpenDialog('maintenance')}
                  >
                    {settings.maintenanceMode ? 'Disable' : 'Enable'} Maintenance Mode
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Security />}
                    onClick={() => handleOpenDialog('audit')}
                  >
                    Generate Audit Report
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Dialogs */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === 'backup' && 'Create System Backup'}
          {dialogType === 'maintenance' && 'Maintenance Mode'}
          {dialogType === 'audit' && 'Generate Audit Report'}
        </DialogTitle>
        <DialogContent>
          {dialogType === 'backup' && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                This will create a complete backup of the system including database, configurations, and audit logs.
              </Alert>
              <Typography variant="body2">
                The backup process may take several minutes depending on system size. 
                Users will not be affected during this process.
              </Typography>
            </Box>
          )}
          
          {dialogType === 'maintenance' && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                {settings.maintenanceMode 
                  ? 'This will disable maintenance mode and restore normal system operation.'
                  : 'This will enable maintenance mode and prevent user access to the system.'
                }
              </Alert>
              <Typography variant="body2">
                {settings.maintenanceMode
                  ? 'Users will be able to access the system normally.'
                  : 'Only administrators will be able to access the system during maintenance.'
                }
              </Typography>
            </Box>
          )}
          
          {dialogType === 'audit' && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                This will generate a comprehensive audit report including all system activities, user actions, and compliance data.
              </Alert>
              <Typography variant="body2">
                The report will be available for download and will include data from the last 30 days.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {dialogType === 'backup' && (
            <Button onClick={onBackupSystem} variant="contained">
              Create Backup
            </Button>
          )}
          {dialogType === 'maintenance' && (
            <Button onClick={onMaintenanceMode} variant="contained" color="warning">
              {settings.maintenanceMode ? 'Disable' : 'Enable'} Maintenance Mode
            </Button>
          )}
          {dialogType === 'audit' && (
            <Button onClick={handleCloseDialog} variant="contained">
              Generate Report
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}