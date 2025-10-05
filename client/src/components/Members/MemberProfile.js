import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Button,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import { savingsGroupsAPI, apiClient } from '../../services/api';
import LoanApplicationForm from '../Loans/LoanApplicationForm';
import {
  Person,
  AccountBalance,
  TrendingUp,
  Business,
  CalendarToday,
  Assessment,
  Payment,
  History,
  Settings,
  Edit,
  Phone,
  Email,
  LocationOn,
  Star,
  CheckCircle,
  Cancel,
  AttachMoney,
  Savings,
  AccountBalanceWallet,
  EventAvailable,
  EventBusy,
  School,
  Work,
  Timeline,
  BarChart,
} from '@mui/icons-material';

// TabPanel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`member-tabpanel-${index}`}
      aria-labelledby={`member-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MemberProfile() {
  const { memberId } = useParams();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loanApplicationOpen, setLoanApplicationOpen] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch member data from API
  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get member data using the correct API endpoint
        const response = await apiClient.get(`/members/${memberId}`);

        if (response.data.member) {
          const member = response.data.member;
          setMemberData({
            id: parseInt(memberId),
            name: member.name || 'N/A',
            email: member.user_email || 'N/A',
            phone: member.phone || 'N/A',
            gender: member.gender || 'N/A',
            role: member.role || 'MEMBER',
            group: { name: member.group_name, id: member.group_id },
            savings: [],
            recent_transactions: [],
            attendance_rate: 0,
            total_savings: member.share_balance || 0,
            location: member.location || 'N/A',
            joinDate: member.join_date || 'N/A',
            isActive: member.is_active !== false,
            groupName: member.group_name || 'Unknown Group',
            groupId: member.group_id,

            // Personal Information (using available data, rest will be mock until API provides)
            personalInfo: {
              dateOfBirth: member.date_of_birth || "N/A",
              nationalId: member.national_id || "N/A",
              maritalStatus: member.marital_status || "N/A",
              occupation: member.occupation || "N/A",
              education: member.education || "N/A",
              nextOfKin: member.next_of_kin || "N/A",
              nextOfKinPhone: member.next_of_kin_phone || "N/A",
              address: {
                district: member.district || "N/A",
                parish: member.parish || "N/A",
                village: member.village || "N/A",
                landmark: member.landmark || "N/A"
              }
            },

            // Financial Summary (using available data)
            financialSummary: {
              totalSavings: member.share_balance || 0,
              personalSavings: 0,
              ecdFund: 0,
              socialFund: 0,
              targetSavings: 0,
              totalLoans: member.loan_balance || 0,
              outstandingLoans: member.loan_balance || 0,
              totalRepaid: 0,
              creditScore: 85, // Mock for now
              loanEligibilityAmount: (member.share_balance || 0) * 5 // 5x savings rule
            },

            // Savings History (empty for now, will be loaded separately if needed)
            savingsHistory: [],

            // Mock data for features not yet in API
            loanHistory: [
              {
                id: 1,
                amount: 500000,
                purpose: "Business Expansion",
                dateIssued: "2024-10-01",
                dueDate: "2025-04-01",
                interestRate: 12,
                monthlyPayment: 45000,
                totalRepaid: 200000,
                outstanding: 300000,
                status: "ACTIVE",
                paymentsHistory: [
                  { date: "2024-12-01", amount: 45000, status: "PAID" },
                  { date: "2024-11-01", amount: 45000, status: "PAID" },
                  { date: "2024-10-01", amount: 45000, status: "PAID" },
                ]
              }
            ],

            // Income Generating Activities
            igaActivities: [
              {
                id: 1,
                name: "Tailoring Business",
                type: "Manufacturing",
                startDate: "2023-06-01",
                status: "ACTIVE",
                monthlyIncome: 300000,
                initialCapital: 800000,
                currentValue: 1200000,
                description: "Custom clothing and alterations",
                location: "Local Market",
                employees: 2
              }
            ],

            // Attendance History
            attendanceHistory: [
              { id: 1, date: "2024-12-15", meetingType: "Regular Meeting", status: "PRESENT", arrivalTime: "14:00" },
              { id: 2, date: "2024-12-08", meetingType: "Training Session", status: "PRESENT", arrivalTime: "13:55" },
              { id: 3, date: "2024-12-01", meetingType: "Regular Meeting", status: "LATE", arrivalTime: "14:15" },
              { id: 4, date: "2024-11-24", meetingType: "Committee Meeting", status: "PRESENT", arrivalTime: "14:00" },
            ],

            // Performance Metrics
            performanceMetrics: {
              attendanceRate: data.attendance_rate || 0,
              savingsConsistency: 92,
              meetingAttendance: data.attendance_rate || 0,
              loanRepayment: 100,
              loanRepaymentRate: 100,
              groupParticipation: 88,
              leadershipScore: 85,
              overallRating: 88,
              meetingsAttended: Math.round((data.attendance_rate || 0) * 12 / 100), // Estimate based on attendance rate
              totalMeetings: 12, // Assume monthly meetings
              averageParticipation: 8.8 // Out of 10
            },

            // Training History
            trainingHistory: [
              { id: 1, title: "Financial Literacy", date: "2024-11-01", status: "COMPLETED", score: 85 },
              { id: 2, title: "Business Management", date: "2024-09-15", status: "COMPLETED", score: 92 },
              { id: 3, title: "Leadership Skills", date: "2024-07-20", status: "COMPLETED", score: 88 },
              { id: 4, title: "Digital Banking", date: "2024-12-20", status: "ONGOING", score: null },
            ],

            // Additional mock data for features not yet in API
            loanHistory: [
              {
                id: 1,
                amount: 500000,
                purpose: "Business Expansion",
                dateIssued: "2024-10-01",
                dueDate: "2025-04-01",
                interestRate: 12,
                monthlyPayment: 45000,
                totalRepaid: 200000,
                outstanding: 300000,
                status: "ACTIVE",
                paymentsHistory: [
                  { date: "2024-12-01", amount: 45000, status: "PAID" },
                  { date: "2024-11-01", amount: 45000, status: "PAID" },
                  { date: "2024-10-01", amount: 45000, status: "PAID" },
                ]
              }
            ],

            // Income Generating Activities
            igaActivities: [
              {
                id: 1,
                name: "Tailoring Business",
                type: "Manufacturing",
                startDate: "2023-06-01",
                status: "ACTIVE",
                monthlyIncome: 300000,
                initialCapital: 800000,
                currentValue: 1200000,
                description: "Custom clothing and alterations",
                location: "Local Market",
                employees: 2
              }
            ],

            // Attendance History
            attendanceHistory: [
              { id: 1, date: "2024-12-15", meetingType: "Regular Meeting", status: "PRESENT", arrivalTime: "14:00" },
              { id: 2, date: "2024-12-08", meetingType: "Training Session", status: "PRESENT", arrivalTime: "13:55" },
              { id: 3, date: "2024-12-01", meetingType: "Regular Meeting", status: "LATE", arrivalTime: "14:15" },
              { id: 4, date: "2024-11-24", meetingType: "Committee Meeting", status: "PRESENT", arrivalTime: "14:00" },
            ],

            // Training data (alias for trainingHistory)
            trainings: [
              { id: 1, title: "Financial Literacy", date: "2024-11-01", status: "COMPLETED", score: 85 },
              { id: 2, title: "Business Management", date: "2024-09-15", status: "COMPLETED", score: 92 },
              { id: 3, title: "Leadership Skills", date: "2024-07-20", status: "COMPLETED", score: 88 },
              { id: 4, title: "Digital Banking", date: "2024-12-20", status: "ONGOING", score: null },
            ]
          });
        } else {
          setError('Failed to load member data');
        }
      } catch (err) {
        console.error('Error fetching member data:', err);
        setError('Failed to load member data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (memberId) {
      fetchMemberData();
    }
  }, [memberId]);

  // Show loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading member profile...</Typography>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }

  // Show message if no member data
  if (!memberData) {
    return (
      <Box p={3}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Member not found
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Box>
    );
  }



  const getRoleColor = (role) => {
    switch (role) {
      case 'CHAIRPERSON': return 'error';
      case 'SECRETARY': return 'warning';
      case 'TREASURER': return 'info';
      default: return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'LATE': return 'warning';
      case 'ABSENT': return 'error';
      case 'EXCUSED': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={3}>
        <Button 
          onClick={() => navigate(-1)} 
          sx={{ mb: 2 }}
        >
          ← Back to Group
        </Button>
        
        <Card>
          <CardContent>
            <Grid container spacing={3} alignItems="center">
              <Grid item>
                <Avatar
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: 'primary.main',
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
                    label={`${memberData.performanceMetrics.attendanceRate}% Attendance`} 
                    color="info" 
                  />
                  <Chip 
                    label={`Credit Score: ${memberData.financialSummary.creditScore}`} 
                    color="primary" 
                  />
                </Box>
              </Grid>
              <Grid item>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    UGX {memberData.financialSummary.totalSavings.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Savings
                  </Typography>
                </Box>
              </Grid>
              <Grid item>
                <IconButton color="primary">
                  <Edit />
                </IconButton>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Card>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="member profile tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" icon={<Person />} />
          <Tab label="Personal Info" icon={<Person />} />
          <Tab label="Savings" icon={<Savings />} />
          <Tab label="Loans" icon={<AccountBalance />} />
          <Tab label="Loan Payments" icon={<Payment />} />
          <Tab label="IGA Activities" icon={<Business />} />
          <Tab label="Attendance" icon={<EventAvailable />} />
          <Tab label="Performance" icon={<Assessment />} />
          <Tab label="Training" icon={<School />} />
          <Tab label="Settings" icon={<Settings />} />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Quick Stats */}
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <AccountBalanceWallet color="primary" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" color="primary">
                        UGX {memberData.financialSummary.totalSavings.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Savings
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <TrendingUp color="success" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" color="success.main">
                        UGX {memberData.financialSummary.outstandingLoans.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Outstanding Loans
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <EventAvailable color="info" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" color="info.main">
                        {memberData.performanceMetrics.attendanceRate}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Attendance Rate
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Business color="warning" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h6" color="warning.main">
                        {memberData.igaActivities.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active IGAs
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* Performance Summary */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Summary
                  </Typography>
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Overall Rating</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {memberData.performanceMetrics.overallRating}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={memberData.performanceMetrics.overallRating}
                      color="primary"
                    />
                  </Box>
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Savings Consistency</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {memberData.performanceMetrics.savingsConsistency}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={memberData.performanceMetrics.savingsConsistency}
                      color="success"
                    />
                  </Box>
                  <Box mb={2}>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Leadership Score</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {memberData.performanceMetrics.leadershipScore}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={memberData.performanceMetrics.leadershipScore}
                      color="info"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Activity */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Activity
                  </Typography>
                  <List>
                    {memberData.savingsHistory && memberData.savingsHistory.length > 0 && (
                      <ListItem>
                        <ListItemIcon>
                          <Savings color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Personal Savings Contribution"
                          secondary={`UGX ${memberData.savingsHistory[0].amount?.toLocaleString() || '0'} on ${memberData.savingsHistory[0].date || 'N/A'}`}
                        />
                      </ListItem>
                    )}
                    {memberData.attendanceHistory && memberData.attendanceHistory.length > 0 && (
                      <ListItem>
                        <ListItemIcon>
                          <EventAvailable color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Meeting Attendance"
                          secondary={`Present at Regular Meeting on ${memberData.attendanceHistory[0].date}`}
                        />
                      </ListItem>
                    )}
                    {memberData.loanHistory && memberData.loanHistory.length > 0 && memberData.loanHistory[0].paymentsHistory && memberData.loanHistory[0].paymentsHistory.length > 0 && (
                      <ListItem>
                        <ListItemIcon>
                          <Payment color="info" />
                        </ListItemIcon>
                        <ListItemText
                          primary="Loan Payment"
                          secondary={`UGX ${memberData.loanHistory[0].paymentsHistory[0].amount?.toLocaleString() || '0'} payment on ${memberData.loanHistory[0].paymentsHistory[0].date}`}
                        />
                      </ListItem>
                    )}
                    {(!memberData.savingsHistory || memberData.savingsHistory.length === 0) &&
                     (!memberData.attendanceHistory || memberData.attendanceHistory.length === 0) &&
                     (!memberData.loanHistory || memberData.loanHistory.length === 0) && (
                      <ListItem>
                        <ListItemText
                          primary="No recent activity"
                          secondary="Activity will appear here as the member participates in group activities"
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Personal Information Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText
                        primary="Full Name"
                        secondary={memberData.name}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><CalendarToday /></ListItemIcon>
                      <ListItemText
                        primary="Date of Birth"
                        secondary={new Date(memberData.personalInfo.dateOfBirth).toLocaleDateString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText
                        primary="Gender"
                        secondary={memberData.gender === 'F' ? 'Female' : 'Male'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText
                        primary="Marital Status"
                        secondary={memberData.personalInfo.maritalStatus}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Work /></ListItemIcon>
                      <ListItemText
                        primary="Occupation"
                        secondary={memberData.personalInfo.occupation}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><School /></ListItemIcon>
                      <ListItemText
                        primary="Education Level"
                        secondary={memberData.personalInfo.education}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Contact Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><Phone /></ListItemIcon>
                      <ListItemText
                        primary="Phone Number"
                        secondary={memberData.phone}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Email /></ListItemIcon>
                      <ListItemText
                        primary="Email Address"
                        secondary={memberData.email}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LocationOn /></ListItemIcon>
                      <ListItemText
                        primary="Address"
                        secondary={`${memberData.personalInfo.address.village}, ${memberData.personalInfo.address.parish}, ${memberData.personalInfo.address.district}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><LocationOn /></ListItemIcon>
                      <ListItemText
                        primary="Landmark"
                        secondary={memberData.personalInfo.address.landmark}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>

              <Card sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Emergency Contact
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon><Person /></ListItemIcon>
                      <ListItemText
                        primary="Next of Kin"
                        secondary={memberData.personalInfo.nextOfKin}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Phone /></ListItemIcon>
                      <ListItemText
                        primary="Emergency Phone"
                        secondary={memberData.personalInfo.nextOfKinPhone}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Savings Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {/* Savings Summary */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Savings Breakdown
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Personal Savings"
                        secondary={`UGX ${memberData.financialSummary.personalSavings.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="ECD Fund"
                        secondary={`UGX ${memberData.financialSummary.ecdFund.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Social Fund"
                        secondary={`UGX ${memberData.financialSummary.socialFund.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Target Savings"
                        secondary={`UGX ${memberData.financialSummary.targetSavings.toLocaleString()}`}
                      />
                    </ListItem>
                    <Divider />
                    <ListItem>
                      <ListItemText
                        primary={<Typography variant="h6">Total Savings</Typography>}
                        secondary={<Typography variant="h6" color="primary">UGX {memberData.financialSummary.totalSavings.toLocaleString()}</Typography>}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Savings History */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Savings Transactions
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Savings Type</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell align="right">Balance</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {memberData.savingsHistory.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {new Date(transaction.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{transaction.type}</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                              +UGX {transaction.amount.toLocaleString()}
                            </TableCell>
                            <TableCell align="right">
                              UGX {transaction.balance.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Loans Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            {/* Loan Summary */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Loan Summary
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setLoanApplicationOpen(true)}
                      startIcon={<AccountBalance />}
                    >
                      Apply for Loan
                    </Button>
                  </Box>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Total Loans Taken"
                        secondary={`UGX ${memberData.financialSummary.totalLoans.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Repaid"
                        secondary={`UGX ${memberData.financialSummary.totalRepaid.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Outstanding Balance"
                        secondary={`UGX ${memberData.financialSummary.outstandingLoans.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Credit Score"
                        secondary={`${memberData.financialSummary.creditScore}/100`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Loan Eligibility"
                        secondary={`UGX ${memberData.financialSummary.loanEligibilityAmount.toLocaleString()}`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Active Loans */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Active Loans
                  </Typography>
                  {memberData.loanHistory.map((loan) => (
                    <Card key={loan.id} variant="outlined" sx={{ mb: 2 }}>
                      <CardContent>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              {loan.purpose}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Loan Amount: UGX {loan.amount.toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Interest Rate: {loan.interestRate}% per annum
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Monthly Payment: UGX {loan.monthlyPayment.toLocaleString()}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2">
                              Date Issued: {new Date(loan.dateIssued).toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2">
                              Due Date: {new Date(loan.dueDate).toLocaleDateString()}
                            </Typography>
                            <Typography variant="body2">
                              Total Repaid: UGX {loan.totalRepaid.toLocaleString()}
                            </Typography>
                            <Typography variant="body2" color="error.main" fontWeight="bold">
                              Outstanding: UGX {loan.outstanding.toLocaleString()}
                            </Typography>
                            <Chip
                              label={loan.status}
                              color={loan.status === 'ACTIVE' ? 'success' : 'default'}
                              size="small"
                              sx={{ mt: 1 }}
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Loan Payments Tab */}
        <TabPanel value={tabValue} index={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Loan Payment History
              </Typography>
              {memberData.loanHistory.map((loan) => (
                <Box key={loan.id} mb={3}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {loan.purpose} - Payment Schedule
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Payment Date</TableCell>
                          <TableCell align="right">Amount</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loan.paymentsHistory.map((payment, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(payment.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell align="right">
                              UGX {payment.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={payment.status}
                                color={payment.status === 'PAID' ? 'success' : 'error'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Button size="small" variant="outlined">
                                View Receipt
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </CardContent>
          </Card>
        </TabPanel>

        {/* IGA Activities Tab */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            {memberData.igaActivities.map((iga) => (
              <Grid item xs={12} md={6} key={iga.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                      <Typography variant="h6">
                        {iga.name}
                      </Typography>
                      <Chip
                        label={iga.status}
                        color={iga.status === 'ACTIVE' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {iga.description}
                    </Typography>

                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Business Type"
                          secondary={iga.type}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Start Date"
                          secondary={new Date(iga.startDate).toLocaleDateString()}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Location"
                          secondary={iga.location}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Monthly Income"
                          secondary={`UGX ${iga.monthlyIncome.toLocaleString()}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Initial Capital"
                          secondary={`UGX ${iga.initialCapital.toLocaleString()}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Current Value"
                          secondary={`UGX ${iga.currentValue.toLocaleString()}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Employees"
                          secondary={`${iga.employees} ${iga.employees === 1 ? 'person' : 'people'}`}
                        />
                      </ListItem>
                    </List>

                    <Box mt={2}>
                      <Button variant="outlined" size="small" sx={{ mr: 1 }}>
                        View Details
                      </Button>
                      <Button variant="outlined" size="small">
                        Edit
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Business sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Add New IGA Activity
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Track additional income generating activities
                  </Typography>
                  <Button variant="contained" startIcon={<Business />}>
                    Add IGA Activity
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Attendance Tab */}
        <TabPanel value={tabValue} index={6}>
          <Grid container spacing={3}>
            {/* Attendance Summary */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Attendance Summary
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Attendance Rate"
                        secondary={`${memberData.performanceMetrics.attendanceRate}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Meetings Attended"
                        secondary={`${memberData.performanceMetrics.meetingsAttended} of ${memberData.performanceMetrics.totalMeetings}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Average Participation"
                        secondary={`${memberData.performanceMetrics.averageParticipation}/10`}
                      />
                    </ListItem>
                  </List>

                  <Box mt={2}>
                    <Typography variant="body2" gutterBottom>
                      Attendance Rate Progress
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={memberData.performanceMetrics.attendanceRate}
                      color={memberData.performanceMetrics.attendanceRate >= 80 ? 'success' : 'warning'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Attendance History */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Attendance History
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Meeting Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Check-in Time</TableCell>
                          <TableCell align="right">Participation</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {memberData.attendanceHistory.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(record.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{record.meetingType}</TableCell>
                            <TableCell>
                              <Chip
                                label={record.status}
                                color={getStatusColor(record.status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {record.checkInTime || '-'}
                            </TableCell>
                            <TableCell align="right">
                              {record.participation ? `${record.participation}/10` : '-'}
                            </TableCell>
                            <TableCell>
                              {record.excuse || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={tabValue} index={7}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Metrics
                  </Typography>

                  {Object.entries({
                    'Overall Rating': memberData.performanceMetrics.overallRating,
                    'Attendance Rate': memberData.performanceMetrics.attendanceRate,
                    'Savings Consistency': memberData.performanceMetrics.savingsConsistency,
                    'Loan Repayment Rate': memberData.performanceMetrics.loanRepaymentRate,
                    'Leadership Score': memberData.performanceMetrics.leadershipScore,
                    'Average Participation': (memberData.performanceMetrics.averageParticipation * 10)
                  }).map(([metric, value]) => (
                    <Box key={metric} mb={3}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">{metric}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {metric === 'Average Participation' ? `${value/10}/10` : `${value}%`}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={value}
                        color={value >= 80 ? 'success' : value >= 60 ? 'warning' : 'error'}
                      />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Insights
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Excellent Savings Consistency"
                        secondary="Maintains regular savings contributions"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Perfect Loan Repayment"
                        secondary="Never missed a loan payment"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Strong Leadership"
                        secondary="Demonstrates excellent leadership qualities"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Cancel color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Attendance Improvement Needed"
                        secondary="Consider improving meeting attendance"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Training Tab */}
        <TabPanel value={tabValue} index={8}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Training & Development History
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Training Title</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {memberData.trainings.map((training) => (
                          <TableRow key={training.id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {training.title}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {new Date(training.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={training.status}
                                color={training.status === 'COMPLETED' ? 'success' : 'info'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              {training.score ? `${training.score}%` : '-'}
                            </TableCell>
                            <TableCell>
                              <Button size="small" variant="outlined">
                                {training.status === 'COMPLETED' ? 'View Certificate' : 'Continue'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Training Summary */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Training Summary
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Completed Trainings"
                        secondary={`${memberData.trainings.filter(t => t.status === 'COMPLETED').length} of ${memberData.trainings.length}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Average Score"
                        secondary={`${Math.round(memberData.trainings.filter(t => t.score).reduce((acc, t) => acc + t.score, 0) / memberData.trainings.filter(t => t.score).length)}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Ongoing Trainings"
                        secondary={`${memberData.trainings.filter(t => t.status === 'ONGOING').length}`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Recommended Trainings */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recommended Trainings
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <School color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Advanced Financial Planning"
                        secondary="Based on your leadership role"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Business color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Business Growth Strategies"
                        secondary="For your IGA activities"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Timeline color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Group Management"
                        secondary="Enhance leadership skills"
                      />
                    </ListItem>
                  </List>
                  <Button variant="contained" fullWidth sx={{ mt: 2 }}>
                    Enroll in Training
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={tabValue} index={9}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Member Settings
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Member Status"
                        secondary={memberData.isActive ? 'Active' : 'Inactive'}
                      />
                      <Button variant="outlined" size="small">
                        {memberData.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Role in Group"
                        secondary={memberData.role}
                      />
                      <Button variant="outlined" size="small">
                        Change Role
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Notification Preferences"
                        secondary="SMS and Email enabled"
                      />
                      <Button variant="outlined" size="small">
                        Configure
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Privacy Settings"
                        secondary="Profile visible to group members"
                      />
                      <Button variant="outlined" size="small">
                        Manage
                      </Button>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Account Actions
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Export Member Data"
                        secondary="Download all member information"
                      />
                      <Button variant="outlined" size="small">
                        Export
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Reset Password"
                        secondary="Send password reset link"
                      />
                      <Button variant="outlined" size="small">
                        Reset
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Transfer to Another Group"
                        secondary="Move member to different group"
                      />
                      <Button variant="outlined" size="small" color="warning">
                        Transfer
                      </Button>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Remove from Group"
                        secondary="Permanently remove member"
                      />
                      <Button variant="outlined" size="small" color="error">
                        Remove
                      </Button>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Loan Application Form */}
      <LoanApplicationForm
        open={loanApplicationOpen}
        onClose={() => setLoanApplicationOpen(false)}
        memberId={memberId}
        groupId={memberData?.groupId}
        memberData={memberData}
      />
    </Box>
  );
}
