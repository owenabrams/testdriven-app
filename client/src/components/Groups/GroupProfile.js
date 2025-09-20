import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Avatar,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  Groups,
  AccountBalance,
  TrendingUp,
  School,
  HowToVote,
  MenuBook,
  AccountBalanceWallet,
  Business,
  Settings,
  Edit,
  Visibility,
  Person,
  CalendarToday,
  AttachMoney,
  Assessment,
  Description,
  Event,
  Upload,
  Download,
  Attachment,
  DateRange,
  FilterList,
  Today,
  ViewList,
  ViewModule,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`group-tabpanel-${index}`}
      aria-labelledby={`group-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function GroupProfile() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  // Calendar state management
  const [calendarFilters, setCalendarFilters] = useState({
    activityTypes: {
      meeting: true,
      training: true,
      committee: true,
      audit: true,
      planning: true
    },
    statuses: {
      scheduled: true,
      confirmed: true,
      completed: true,
      cancelled: true
    }
  });
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Mock group data - replace with real API call
  const groupData = {
    id: groupId || 1,
    name: "Kampala Women's Cooperative",
    district: "Kampala",
    parish: "Central",
    village: "Nakasero",
    status: "ACTIVE",
    formation_date: "2023-01-15",
    registration_number: "KWC-2023-001",
    members_count: 25,
    max_members: 30,
    current_cycle: 3,
    cycle_period_months: 12,
    total_savings: 15750000,
    total_loans: 8500000,
    health_score: 85,
    risk_level: "LOW",
    
    // Registration Documents
    registration: {
      registration_date: "2023-01-15",
      registration_number: "SG/2023/001",
      registration_authority: "Ministry of Gender, Labour and Social Development",
      documents: [
        {
          id: 1,
          name: "Certificate of Registration",
          type: "certificate",
          file_name: "registration_certificate.pdf",
          upload_date: "2023-01-15",
          file_size: "2.3 MB",
          status: "verified"
        },
        {
          id: 2,
          name: "Articles of Association",
          type: "articles",
          file_name: "articles_of_association.pdf",
          upload_date: "2023-01-15",
          file_size: "1.8 MB",
          status: "verified"
        },
        {
          id: 3,
          name: "Memorandum of Understanding",
          type: "memorandum",
          file_name: "group_memorandum.pdf",
          upload_date: "2023-02-01",
          file_size: "1.2 MB",
          status: "pending_review"
        },
        {
          id: 4,
          name: "Tax Exemption Certificate",
          type: "tax_document",
          file_name: "tax_exemption.pdf",
          upload_date: "2023-03-10",
          file_size: "0.8 MB",
          status: "verified"
        }
      ]
    },

    // Calendar Activities
    calendar_activities: [
      {
        id: 1,
        title: "Weekly Savings Meeting",
        type: "meeting",
        date: "2024-12-20",
        time: "14:00",
        location: "Community Center",
        attendees: 25,
        status: "scheduled",
        description: "Regular weekly savings collection and group discussions"
      },
      {
        id: 2,
        title: "Leadership Training",
        type: "training",
        date: "2024-12-22",
        time: "09:00",
        location: "District Hall",
        attendees: 8,
        status: "confirmed",
        description: "Leadership skills development for group officers"
      },
      {
        id: 3,
        title: "Loan Committee Review",
        type: "committee",
        date: "2024-12-25",
        time: "10:00",
        location: "Group Office",
        attendees: 5,
        status: "scheduled",
        description: "Review pending loan applications"
      },
      {
        id: 4,
        title: "Financial Audit",
        type: "audit",
        date: "2024-12-28",
        time: "08:00",
        location: "Community Center",
        attendees: 12,
        status: "confirmed",
        description: "Quarterly financial records audit"
      },
      {
        id: 5,
        title: "IGA Planning Session",
        type: "planning",
        date: "2025-01-05",
        time: "13:00",
        location: "Community Center",
        attendees: 18,
        status: "scheduled",
        description: "Plan new income generating activities for 2025"
      }
    ],

    // Group Settings
    settings: {
      ecd_fund_enabled: true,
      target_fund_enabled: true,
      cycle_period_months: 12,
      max_members: 30,
      meeting_frequency: "WEEKLY",
      loan_interest_rate: 2.5,
      fine_amount: 5000,
    },

    // Members
    members: [
      { id: 1, name: "Sarah Nakato", role: "CHAIRPERSON", gender: "F", phone: "+256701234567", savings: 850000, loans: 500000 },
      { id: 2, name: "Mary Nambi", role: "SECRETARY", gender: "F", phone: "+256701234568", savings: 750000, loans: 300000 },
      { id: 3, name: "Grace Nalwoga", role: "TREASURER", gender: "F", phone: "+256701234569", savings: 920000, loans: 0 },
      // ... more members
    ],

    // Constitution & Governance
    constitution: {
      adopted_date: "2023-02-01",
      last_updated: "2024-01-15",
      version: "2.1",
      articles_count: 15,
    },

    // Training & Capacity Building
    trainings: [
      { id: 1, title: "Financial Literacy", date: "2023-03-15", participants: 23, status: "COMPLETED" },
      { id: 2, title: "Business Skills", date: "2023-06-20", participants: 20, status: "COMPLETED" },
      { id: 3, title: "Leadership Training", date: "2024-01-10", participants: 25, status: "COMPLETED" },
    ],

    // Voting History
    votes: [
      { id: 1, title: "Election of Chairperson", date: "2024-01-05", type: "LEADERSHIP", result: "Sarah Nakato elected" },
      { id: 2, title: "Loan Policy Amendment", date: "2023-11-20", type: "POLICY", result: "Approved" },
      { id: 3, title: "Meeting Frequency Change", date: "2023-09-15", type: "OPERATIONAL", result: "Weekly meetings approved" },
    ],

    // Financial Records
    financial_records: {
      outstanding_loans: 8500000,
      total_fines: 450000,
      ecd_fund: 2100000,
      recent_transactions: [
        { id: 1, date: "2024-03-15", type: "SAVINGS", member_name: "Sarah Nakato", amount: 50000 },
        { id: 2, date: "2024-03-15", type: "LOAN", member_name: "Mary Nambi", amount: 200000 },
        { id: 3, date: "2024-03-14", type: "FINE", member_name: "Grace Nalwoga", amount: 5000 },
        { id: 4, date: "2024-03-13", type: "SAVINGS", member_name: "Agnes Namutebi", amount: 75000 },
        { id: 5, date: "2024-03-12", type: "LOAN_REPAYMENT", member_name: "Betty Nakimuli", amount: 150000 },
      ]
    },

    // Saving Cycles
    saving_cycles: [
      { id: 1, cycle_number: 1, start_date: "2023-01-15", end_date: "2024-01-14", status: "COMPLETED", total_savings: 12000000, participants: 25 },
      { id: 2, cycle_number: 2, start_date: "2024-01-15", end_date: "2025-01-14", status: "COMPLETED", total_savings: 14500000, participants: 25 },
      { id: 3, cycle_number: 3, start_date: "2025-01-15", end_date: "2026-01-14", status: "ACTIVE", total_savings: 15750000, participants: 25 },
    ],

    // Income Generating Activities
    iga_activities: [
      {
        id: 1,
        name: "Tailoring Business",
        description: "Community tailoring shop with shared equipment and profits",
        investment: 2000000,
        monthly_income: 450000,
        participants: 8,
        start_date: "2023-06-01",
        status: "ACTIVE"
      },
      {
        id: 2,
        name: "Vegetable Farming",
        description: "Collective vegetable farming for local market sales",
        investment: 500000,
        monthly_income: 150000,
        participants: 5,
        start_date: "2024-01-15",
        status: "ACTIVE"
      },
      {
        id: 3,
        name: "Small Shop",
        description: "Group retail shop selling household items and groceries",
        investment: 1500000,
        monthly_income: 300000,
        participants: 12,
        start_date: "2023-11-01",
        status: "ACTIVE"
      },
    ],
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Calendar functionality
  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
    setActivityDetailOpen(true);
  };

  const handleFilterChange = (category, key) => {
    setCalendarFilters(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key]
      }
    }));
  };

  const getFilteredActivities = () => {
    return groupData.calendar_activities.filter(activity => {
      const typeMatch = calendarFilters.activityTypes[activity.type];
      const statusMatch = calendarFilters.statuses[activity.status];
      return typeMatch && statusMatch;
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
              <Groups />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1">
                {groupData.name}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {groupData.district} • {groupData.parish} • {groupData.village}
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={() => setTabValue(10)} // Settings tab
            >
              Group Settings
            </Button>
            <Button
              variant="contained"
              startIcon={<Edit />}
            >
              Edit Group
            </Button>
          </Box>
        </Box>

        {/* Status Cards */}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Chip 
                      label={groupData.status} 
                      color={groupData.status === 'ACTIVE' ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <Assessment color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Members
                    </Typography>
                    <Typography variant="h6">
                      {groupData.members_count}/{groupData.max_members}
                    </Typography>
                  </Box>
                  <Person color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Savings
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(groupData.total_savings)}
                    </Typography>
                  </Box>
                  <AccountBalance color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Health Score
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Typography variant="h6" sx={{ mr: 1 }}>
                        {groupData.health_score}%
                      </Typography>
                      <Chip 
                        label={groupData.risk_level} 
                        color={getRiskColor(groupData.risk_level)}
                        size="small"
                      />
                    </Box>
                  </Box>
                  <TrendingUp color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="group profile tabs" variant="scrollable" scrollButtons="auto">
            <Tab label="Overview" icon={<Visibility />} />
            <Tab label="Members" icon={<Groups />} />
            <Tab label="Constitution" icon={<MenuBook />} />
            <Tab label="Registration" icon={<Description />} />
            <Tab label="Trainings" icon={<School />} />
            <Tab label="Voting History" icon={<HowToVote />} />
            <Tab label="Financial Records" icon={<AccountBalanceWallet />} />
            <Tab label="Saving Cycles" icon={<CalendarToday />} />
            <Tab label="IGA Activities" icon={<Business />} />
            <Tab label="Calendar" icon={<Event />} />
            <Tab label="Settings" icon={<Settings />} />
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          {/* Overview */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Group Information
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Formation Date"
                        secondary={new Date(groupData.formation_date).toLocaleDateString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Registration Number"
                        secondary={groupData.registration_number}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Current Cycle"
                        secondary={`Cycle ${groupData.current_cycle} (${groupData.cycle_period_months} months)`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Meeting Frequency"
                        secondary={groupData.settings.meeting_frequency}
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
                    Financial Summary
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Total Savings"
                        secondary={formatCurrency(groupData.total_savings)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Outstanding Loans"
                        secondary={formatCurrency(groupData.total_loans)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Loan Interest Rate"
                        secondary={`${groupData.settings.loan_interest_rate}% per month`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Fine Amount"
                        secondary={formatCurrency(groupData.settings.fine_amount)}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Members */}
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Group Members ({groupData.members_count})
              </Typography>
              <Button variant="contained" startIcon={<Person />}>
                Add Member
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell align="right">Total Savings</TableCell>
                    <TableCell align="right">Outstanding Loans</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupData.members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                            {member.name.charAt(0)}
                          </Avatar>
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{
                              cursor: 'pointer',
                              color: 'primary.main',
                              textDecoration: 'none',
                              '&:hover': {
                                textDecoration: 'underline',
                                color: 'primary.dark'
                              }
                            }}
                            onClick={() => navigate(`/members/${member.id}`)}
                          >
                            {member.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.role}
                          size="small"
                          color={member.role === 'CHAIRPERSON' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{member.gender === 'F' ? 'Female' : 'Male'}</TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell align="right">{formatCurrency(member.savings)}</TableCell>
                      <TableCell align="right">{formatCurrency(member.loans)}</TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                        <IconButton size="small">
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Constitution & Governance */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Constitution Details
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Adopted Date"
                        secondary={new Date(groupData.constitution.adopted_date).toLocaleDateString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Last Updated"
                        secondary={new Date(groupData.constitution.last_updated).toLocaleDateString()}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Version"
                        secondary={groupData.constitution.version}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Articles Count"
                        secondary={`${groupData.constitution.articles_count} articles`}
                      />
                    </ListItem>
                  </List>
                  <Button variant="outlined" startIcon={<MenuBook />} sx={{ mt: 2 }}>
                    View Full Constitution
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Leadership Structure
                  </Typography>
                  <List>
                    {groupData.members.filter(m => m.role !== 'MEMBER').map((leader) => (
                      <ListItem key={leader.id}>
                        <ListItemIcon>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {leader.name.charAt(0)}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={leader.name}
                          secondary={leader.role}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Registration Documents */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Registration Documents
              </Typography>
              <Button variant="contained" startIcon={<Upload />}>
                Upload Document
              </Button>
            </Box>

            <Grid container spacing={3}>
              {/* Registration Information */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Registration Details
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Registration Date"
                          secondary={new Date(groupData.registration.registration_date).toLocaleDateString()}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Registration Number"
                          secondary={groupData.registration.registration_number}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Registration Authority"
                          secondary={groupData.registration.registration_authority}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Total Documents"
                          secondary={`${groupData.registration.documents.length} documents`}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Documents List */}
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Document Repository
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Document Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Upload Date</TableCell>
                            <TableCell>Size</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {groupData.registration.documents.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell>
                                <Box display="flex" alignItems="center">
                                  <Attachment sx={{ mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2" fontWeight="medium">
                                    {doc.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={doc.type.replace('_', ' ').toUpperCase()}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                {new Date(doc.upload_date).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{doc.file_size}</TableCell>
                              <TableCell>
                                <Chip
                                  label={doc.status.replace('_', ' ').toUpperCase()}
                                  size="small"
                                  color={doc.status === 'verified' ? 'success' : 'warning'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <IconButton size="small" sx={{ mr: 1 }}>
                                  <Download />
                                </IconButton>
                                <IconButton size="small">
                                  <Edit />
                                </IconButton>
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
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          {/* Trainings & Capacity Building */}
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Training History ({groupData.trainings.length})
              </Typography>
              <Button variant="contained" startIcon={<School />}>
                Schedule Training
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Training Title</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Participants</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupData.trainings.map((training) => (
                    <TableRow key={training.id}>
                      <TableCell>{training.title}</TableCell>
                      <TableCell>{new Date(training.date).toLocaleDateString()}</TableCell>
                      <TableCell>{training.participants} members</TableCell>
                      <TableCell>
                        <Chip
                          label={training.status}
                          color={training.status === 'COMPLETED' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={5}>
          {/* Voting History */}
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Voting & Decision History ({groupData.votes.length})
              </Typography>
              <Button variant="contained" startIcon={<HowToVote />}>
                New Vote
              </Button>
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vote Title</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupData.votes.map((vote) => (
                    <TableRow key={vote.id}>
                      <TableCell>{vote.title}</TableCell>
                      <TableCell>{new Date(vote.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={vote.type}
                          color={vote.type === 'LEADERSHIP' ? 'primary' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{vote.result}</TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          {/* Financial Records - Cashbook & Ledgers */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Financial Summary
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Total Savings"
                        secondary={`UGX ${groupData.total_savings.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Outstanding Loans"
                        secondary={`UGX ${groupData.financial_records.outstanding_loans.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Total Fines Collected"
                        secondary={`UGX ${groupData.financial_records.total_fines.toLocaleString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="ECD Fund"
                        secondary={`UGX ${groupData.financial_records.ecd_fund.toLocaleString()}`}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Transactions
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Member</TableCell>
                          <TableCell>Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupData.financial_records.recent_transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Chip
                                label={transaction.type}
                                color={transaction.type === 'SAVINGS' ? 'success' : 'warning'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{transaction.member_name}</TableCell>
                            <TableCell>UGX {transaction.amount.toLocaleString()}</TableCell>
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

        <TabPanel value={tabValue} index={7}>
          {/* Saving Cycles Management */}
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Saving Cycles History ({groupData.saving_cycles.length})
              </Typography>
              <Button variant="contained" startIcon={<CalendarToday />}>
                Start New Cycle
              </Button>
            </Box>
            <Grid container spacing={3}>
              {groupData.saving_cycles.map((cycle) => (
                <Grid item xs={12} md={6} key={cycle.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          Cycle {cycle.cycle_number}
                        </Typography>
                        <Chip
                          label={cycle.status}
                          color={cycle.status === 'ACTIVE' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Start Date"
                            secondary={new Date(cycle.start_date).toLocaleDateString()}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="End Date"
                            secondary={new Date(cycle.end_date).toLocaleDateString()}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Total Savings"
                            secondary={`UGX ${cycle.total_savings.toLocaleString()}`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Participants"
                            secondary={`${cycle.participants} members`}
                          />
                        </ListItem>
                      </List>
                      <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={8}>
          {/* Income Generating Activities */}
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Income Generating Activities ({groupData.iga_activities.length})
              </Typography>
              <Button variant="contained" startIcon={<Business />}>
                Add New IGA
              </Button>
            </Box>
            <Grid container spacing={3}>
              {groupData.iga_activities.map((iga) => (
                <Grid item xs={12} md={6} key={iga.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          {iga.name}
                        </Typography>
                        <Chip
                          label={iga.status}
                          color={iga.status === 'ACTIVE' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {iga.description}
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="Investment"
                            secondary={`UGX ${iga.investment.toLocaleString()}`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Monthly Income"
                            secondary={`UGX ${iga.monthly_income.toLocaleString()}`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Participants"
                            secondary={`${iga.participants} members`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Started"
                            secondary={new Date(iga.start_date).toLocaleDateString()}
                          />
                        </ListItem>
                      </List>
                      <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={9}>
          {/* Calendar - Group Activities */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Group Activities Calendar
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  size="small"
                  onClick={() => setFilterDialogOpen(true)}
                >
                  Filters
                </Button>
                <Button variant="outlined" startIcon={<ViewModule />} size="small">
                  Month
                </Button>
                <Button variant="outlined" startIcon={<ViewList />} size="small">
                  Week
                </Button>
                <Button variant="contained" startIcon={<Event />}>
                  Add Event
                </Button>
              </Box>
            </Box>

            <Grid container spacing={3}>
              {/* Calendar Filters */}
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Activity Filters
                    </Typography>
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Activity Type
                      </Typography>
                      {['meeting', 'training', 'committee', 'audit', 'planning'].map((type) => (
                        <Box key={type} display="flex" alignItems="center">
                          <Checkbox
                            checked={calendarFilters.activityTypes[type]}
                            onChange={() => handleFilterChange('activityTypes', type)}
                            size="small"
                          />
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {type}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box mb={2}>
                      <Typography variant="subtitle2" gutterBottom>
                        Status
                      </Typography>
                      {['scheduled', 'confirmed', 'completed', 'cancelled'].map((status) => (
                        <Box key={status} display="flex" alignItems="center">
                          <Checkbox
                            checked={calendarFilters.statuses[status]}
                            onChange={() => handleFilterChange('statuses', status)}
                            size="small"
                          />
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {status}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Date Range
                      </Typography>
                      <Button variant="outlined" startIcon={<DateRange />} fullWidth size="small">
                        Select Range
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Activities List/Calendar View */}
              <Grid item xs={12} md={9}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Upcoming Activities
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Activity</TableCell>
                            <TableCell>Date & Time</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Attendees</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {getFilteredActivities().map((activity) => (
                            <TableRow
                              key={activity.id}
                              sx={{
                                cursor: 'pointer',
                                '&:hover': { backgroundColor: 'action.hover' }
                              }}
                              onClick={() => handleActivityClick(activity)}
                            >
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {activity.title}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {activity.description}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2">
                                    {new Date(activity.date).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {activity.time}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>{activity.location}</TableCell>
                              <TableCell>
                                <Chip
                                  label={`${activity.attendees} members`}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={activity.status.replace('_', ' ').toUpperCase()}
                                  size="small"
                                  color={
                                    activity.status === 'confirmed' ? 'success' :
                                    activity.status === 'scheduled' ? 'primary' :
                                    activity.status === 'completed' ? 'default' : 'error'
                                  }
                                />
                              </TableCell>
                              <TableCell align="right">
                                <IconButton size="small" sx={{ mr: 1 }}>
                                  <Visibility />
                                </IconButton>
                                <IconButton size="small">
                                  <Edit />
                                </IconButton>
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
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={10}>
          {/* Group Settings */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Group Configuration Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Basic Settings
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Cycle Period"
                          secondary={`${groupData.settings.cycle_period_months} months`}
                        />
                        <IconButton>
                          <Edit />
                        </IconButton>
                      </ListItem>
                      <Divider />
                      <ListItem>
                        <ListItemText
                          primary="Maximum Members"
                          secondary={`${groupData.settings.max_members} members`}
                        />
                        <IconButton>
                          <Edit />
                        </IconButton>
                      </ListItem>
                      <Divider />
                      <ListItem>
                        <ListItemText
                          primary="Meeting Frequency"
                          secondary={groupData.settings.meeting_frequency}
                        />
                        <IconButton>
                          <Edit />
                        </IconButton>
                      </ListItem>
                      <Divider />
                      <ListItem>
                        <ListItemText
                          primary="Loan Interest Rate"
                          secondary={`${groupData.settings.loan_interest_rate}% per month`}
                        />
                        <IconButton>
                          <Edit />
                        </IconButton>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Fund Settings
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="ECD Fund"
                          secondary={groupData.settings.ecd_fund_enabled ? "Enabled" : "Disabled"}
                        />
                        <Chip
                          label={groupData.settings.ecd_fund_enabled ? "ON" : "OFF"}
                          color={groupData.settings.ecd_fund_enabled ? "success" : "default"}
                          size="small"
                        />
                        <IconButton>
                          <Edit />
                        </IconButton>
                      </ListItem>
                      <Divider />
                      <ListItem>
                        <ListItemText
                          primary="Target Savings Fund"
                          secondary={groupData.settings.target_fund_enabled ? "Enabled" : "Disabled"}
                        />
                        <Chip
                          label={groupData.settings.target_fund_enabled ? "ON" : "OFF"}
                          color={groupData.settings.target_fund_enabled ? "success" : "default"}
                          size="small"
                        />
                        <IconButton>
                          <Edit />
                        </IconButton>
                      </ListItem>
                      <Divider />
                      <ListItem>
                        <ListItemText
                          primary="Fine Amount"
                          secondary={formatCurrency(groupData.settings.fine_amount)}
                        />
                        <IconButton>
                          <Edit />
                        </IconButton>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Card>

      {/* Activity Detail Modal */}
      <Dialog
        open={activityDetailOpen}
        onClose={() => setActivityDetailOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedActivity?.title}
            </Typography>
            <Chip
              label={selectedActivity?.status?.replace('_', ' ').toUpperCase()}
              size="small"
              color={
                selectedActivity?.status === 'confirmed' ? 'success' :
                selectedActivity?.status === 'scheduled' ? 'primary' :
                selectedActivity?.status === 'completed' ? 'default' : 'error'
              }
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedActivity && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Activity Details
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <Event />
                        </ListItemIcon>
                        <ListItemText
                          primary="Date & Time"
                          secondary={`${new Date(selectedActivity.date).toLocaleDateString()} at ${selectedActivity.time}`}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Person />
                        </ListItemIcon>
                        <ListItemText
                          primary="Location"
                          secondary={selectedActivity.location}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Groups />
                        </ListItemIcon>
                        <ListItemText
                          primary="Expected Attendees"
                          secondary={`${selectedActivity.attendees} members`}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {selectedActivity.description}
                    </Typography>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Activity Type
                    </Typography>
                    <Chip
                      label={selectedActivity.type.toUpperCase()}
                      variant="outlined"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDetailOpen(false)}>
            Close
          </Button>
          <Button variant="contained" startIcon={<Edit />}>
            Edit Activity
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Calendar Filters
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Activity Types
              </Typography>
              <FormGroup>
                {Object.entries(calendarFilters.activityTypes).map(([type, checked]) => (
                  <FormControlLabel
                    key={type}
                    control={
                      <Checkbox
                        checked={checked}
                        onChange={() => handleFilterChange('activityTypes', type)}
                      />
                    }
                    label={type.charAt(0).toUpperCase() + type.slice(1)}
                  />
                ))}
              </FormGroup>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Status
              </Typography>
              <FormGroup>
                {Object.entries(calendarFilters.statuses).map(([status, checked]) => (
                  <FormControlLabel
                    key={status}
                    control={
                      <Checkbox
                        checked={checked}
                        onChange={() => handleFilterChange('statuses', status)}
                      />
                    }
                    label={status.charAt(0).toUpperCase() + status.slice(1)}
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              // Reset all filters to true
              setCalendarFilters({
                activityTypes: {
                  meeting: true,
                  training: true,
                  committee: true,
                  audit: true,
                  planning: true
                },
                statuses: {
                  scheduled: true,
                  confirmed: true,
                  completed: true,
                  cancelled: true
                }
              });
            }}
          >
            Reset Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
