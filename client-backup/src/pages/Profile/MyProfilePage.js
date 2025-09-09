import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  LocationOn,
  AccountBalance,
  TrendingUp,
  CalendarToday,
  Receipt,
  Assessment,
  Campaign,
  Group,
  Star,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'react-query';
import { savingsGroupsAPI } from '../../services/api';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MyProfilePage() {
  const [tab, setTab] = useState(0);
  const { user } = useAuth();

  // Mock member data - in real app, this would come from API
  const memberData = {
    id: 1,
    name: user?.username || 'Member Name',
    email: user?.email || 'member@example.com',
    phone: '+256701234567',
    gender: 'F',
    role: 'CHAIR',
    joinDate: '2024-01-15',
    isActive: true,
    groupName: 'Kampala Women\'s Cooperative',
    groupId: 1,
    district: 'Kampala',
    parish: 'Central',
    village: 'Nakasero',
    
    // Financial data
    personalSavings: 860000,
    ecdFund: 165000,
    socialFund: 75000,
    targetSavings: 0,
    totalSavings: 1100000,
    totalContributions: 1100000,
    
    // Performance metrics
    attendanceRate: 95,
    meetingsAttended: 19,
    totalMeetings: 20,
    finesUnpaid: 0,
    loanEligibilityScore: 92,
    
    // Recent transactions
    recentTransactions: [
      { date: '2024-12-07', type: 'PERSONAL', amount: 135000, method: 'MTN', status: 'VERIFIED' },
      { date: '2024-12-01', type: 'ECD', amount: 55000, method: 'AIRTEL', status: 'VERIFIED' },
      { date: '2024-11-24', type: 'SOCIAL', amount: 30000, method: 'CASH', status: 'VERIFIED' },
      { date: '2024-11-17', type: 'PERSONAL', amount: 125000, method: 'MTN', status: 'VERIFIED' },
    ],
    
    // Campaign participation
    activeCampaigns: [
      {
        name: 'Women\'s Empowerment 2025',
        targetAmount: 500000,
        currentAmount: 200000,
        progress: 40,
        deadline: '2025-12-31',
        status: 'ACTIVE'
      }
    ],
    
    // Loan information
    loanAssessment: {
      score: 92,
      riskLevel: 'LOW',
      maxLoanAmount: 550000,
      recommendedRate: 12,
      validUntil: '2025-03-07'
    }
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'CHAIR': return 'error';
      case 'TREASURER': return 'warning';
      case 'SECRETARY': return 'info';
      default: return 'primary';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'VERIFIED': return 'success';
      case 'PENDING': return 'warning';
      case 'REJECTED': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Profile Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar 
                sx={{ 
                  bgcolor: 'primary.main', 
                  width: 80, 
                  height: 80, 
                  fontSize: '2rem' 
                }}
              >
                {memberData.name.charAt(0)}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" gutterBottom>
                {memberData.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {memberData.groupName}
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                <Chip 
                  icon={<Star />}
                  label={memberData.role} 
                  color={getRoleColor(memberData.role)} 
                />
                <Chip 
                  label={memberData.isActive ? 'Active Member' : 'Inactive'} 
                  color={memberData.isActive ? 'success' : 'default'} 
                />
                <Chip 
                  label={`${memberData.attendanceRate}% Attendance`} 
                  color="info" 
                />
              </Box>
            </Grid>
            <Grid item>
              <Box textAlign="center">
                <Typography variant="h4" color="primary" fontWeight="bold">
                  UGX {memberData.totalSavings.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Savings
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AccountBalance sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">
                UGX {memberData.personalSavings.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Personal Savings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">{memberData.loanEligibilityScore}/100</Typography>
              <Typography variant="body2" color="text.secondary">
                Loan Eligibility Score
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CalendarToday sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">
                {memberData.meetingsAttended}/{memberData.totalMeetings}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Meetings Attended
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Campaign sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6">{memberData.activeCampaigns.length}</Typography>
              <Typography variant="body2" color="text.secondary">
                Active Campaigns
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Information Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={handleTabChange} aria-label="profile tabs">
            <Tab label="Personal Info" />
            <Tab label="Savings Breakdown" />
            <Tab label="Recent Transactions" />
            <Tab label="Campaign Progress" />
            <Tab label="Loan Eligibility" />
          </Tabs>
        </Box>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemIcon><Person /></ListItemIcon>
                  <ListItemText
                    primary="Full Name"
                    secondary={memberData.name}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon><Email /></ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={memberData.email}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon><Phone /></ListItemIcon>
                  <ListItemText
                    primary="Phone Number"
                    secondary={memberData.phone}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon><LocationOn /></ListItemIcon>
                  <ListItemText
                    primary="Location"
                    secondary={`${memberData.village}, ${memberData.parish}, ${memberData.district}`}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemIcon><Group /></ListItemIcon>
                  <ListItemText
                    primary="Savings Group"
                    secondary={memberData.groupName}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon><Star /></ListItemIcon>
                  <ListItemText
                    primary="Role"
                    secondary={memberData.role}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemIcon><CalendarToday /></ListItemIcon>
                  <ListItemText
                    primary="Member Since"
                    secondary={new Date(memberData.joinDate).toLocaleDateString()}
                  />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary="Gender"
                    secondary={memberData.gender === 'F' ? 'Female' : 'Male'}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    UGX {memberData.personalSavings.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Personal Savings
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(memberData.personalSavings / memberData.totalSavings) * 100} 
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="success.main">
                    UGX {memberData.ecdFund.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ECD Fund
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(memberData.ecdFund / memberData.totalSavings) * 100} 
                    sx={{ mt: 1 }}
                    color="success"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="info.main">
                    UGX {memberData.socialFund.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Social Fund
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(memberData.socialFund / memberData.totalSavings) * 100} 
                    sx={{ mt: 1 }}
                    color="info"
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="secondary.main">
                    UGX {memberData.targetSavings.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Target Savings
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={memberData.targetSavings > 0 ? (memberData.targetSavings / memberData.totalSavings) * 100 : 0} 
                    sx={{ mt: 1 }}
                    color="secondary"
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Saving Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {memberData.recentTransactions.map((transaction, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip label={transaction.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        UGX {transaction.amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>{transaction.method}</TableCell>
                    <TableCell>
                      <Chip 
                        label={transaction.status} 
                        size="small" 
                        color={getStatusColor(transaction.status)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          {memberData.activeCampaigns.map((campaign, index) => (
            <Card key={index} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">{campaign.name}</Typography>
                  <Chip label={campaign.status} color="success" />
                </Box>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={8}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Progress: UGX {campaign.currentAmount.toLocaleString()} / UGX {campaign.targetAmount.toLocaleString()}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={campaign.progress} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {campaign.progress}% complete
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary">
                      Deadline: {new Date(campaign.deadline).toLocaleDateString()}
                    </Typography>
                    <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                      Make Contribution
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Loan Eligibility
                  </Typography>
                  
                  <Box display="flex" alignItems="center" mb={2}>
                    <Assessment sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="body1">
                      Score: {memberData.loanAssessment.score}/100
                    </Typography>
                  </Box>
                  
                  <LinearProgress 
                    variant="determinate" 
                    value={memberData.loanAssessment.score} 
                    sx={{ mb: 2, height: 8, borderRadius: 4 }}
                  />
                  
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Risk Level"
                        secondary={
                          <Chip 
                            label={memberData.loanAssessment.riskLevel} 
                            color="success" 
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Maximum Loan Amount"
                        secondary={`UGX ${memberData.loanAssessment.maxLoanAmount.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Recommended Interest Rate"
                        secondary={`${memberData.loanAssessment.recommendedRate}% per annum`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Assessment Valid Until"
                        secondary={new Date(memberData.loanAssessment.validUntil).toLocaleDateString()}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Congratulations! You are eligible for a loan up to UGX {memberData.loanAssessment.maxLoanAmount.toLocaleString()} 
                  at {memberData.loanAssessment.recommendedRate}% annual interest rate.
                </Typography>
              </Alert>
              
              <Button variant="contained" fullWidth size="large" sx={{ mb: 2 }}>
                Apply for Loan
              </Button>
              
              <Typography variant="body2" color="text.secondary">
                Your loan eligibility is based on your consistent savings history, 
                excellent meeting attendance, and good payment record.
              </Typography>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </Box>
  );
}