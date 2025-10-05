import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api';
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
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormGroup,
  CircularProgress,
  Alert,
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
  Add,
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
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  // Dialog states for CRUD operations
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [constitutionDialogOpen, setConstitutionDialogOpen] = useState(false);
  const [votingDialogOpen, setVotingDialogOpen] = useState(false);
  const [trainingDialogOpen, setTrainingDialogOpen] = useState(false);
  const [savingCycleDialogOpen, setSavingCycleDialogOpen] = useState(false);
  const [igaDialogOpen, setIgaDialogOpen] = useState(false);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);

  // Edit states
  const [editingItem, setEditingItem] = useState(null);
  const [editMode, setEditMode] = useState(false);

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
  const queryClient = useQueryClient();

  // Real API calls using React Query
  const { data: groupData, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/groups/${groupId}`);
      const rawGroup = response.data.group;

      // Transform API data to match component expectations
      return {
        ...rawGroup,
        // Add missing nested structures that component expects
        settings: {
          meeting_frequency: `${rawGroup.meeting_frequency || 'WEEKLY'} on ${rawGroup.meeting_day || 'SATURDAY'}`,
          cycle_period_months: rawGroup.cycle_duration_months || 12,
          max_members: rawGroup.max_members || 25,
          loan_interest_rate: 5, // Default rate
          fine_amount: 5000, // Default fine
          ecd_fund_enabled: true,
          target_fund_enabled: true,
        },
        // Add empty arrays for data that might not exist yet
        members: [],
        votes: [],
        saving_cycles: [],
        iga_activities: [],
        financial_records: {
          outstanding_loans: rawGroup.loan_fund_balance || 0,
          total_fines: 0,
          ecd_fund: 0,
          recent_transactions: []
        },
        registration: {
          registration_date: rawGroup.registration_date || rawGroup.created_date,
          registration_number: rawGroup.registration_number || 'N/A',
          registration_authority: rawGroup.registration_authority || 'N/A',
          documents: []
        },
        // Map existing fields
        current_cycle: rawGroup.current_cycle_number || 1,
        cycle_period_months: rawGroup.cycle_duration_months || 12,
        total_savings: rawGroup.savings_balance || 0,
        total_loans: rawGroup.loan_fund_balance || 0,
        status: rawGroup.state || 'ACTIVE'
      };
    },
    enabled: !!groupId, // Only run query when groupId is available
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/members/?group_id=${groupId}`);
      return response.data.members;
    },
    enabled: !!groupId,
  });

  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/meeting-activities/?group_id=${groupId}`);
      return response.data.activities || [];
    },
    enabled: !!groupId,
  });

  // Fetch additional tab data
  const { data: constitutionData } = useQuery({
    queryKey: ['constitution', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/groups/${groupId}/constitution`);
      return response.data.constitution_documents || [];
    },
    enabled: !!groupId,
  });

  const { data: votingData } = useQuery({
    queryKey: ['voting', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/groups/${groupId}/voting-sessions`);
      return response.data.voting_sessions || [];
    },
    enabled: !!groupId,
  });

  const { data: trainingsData } = useQuery({
    queryKey: ['trainings', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/groups/${groupId}/trainings`);
      return response.data.trainings || [];
    },
    enabled: !!groupId,
  });

  const { data: savingCyclesData } = useQuery({
    queryKey: ['saving-cycles', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/groups/${groupId}/saving-cycles`);
      return response.data.saving_cycles || [];
    },
    enabled: !!groupId,
  });

  const { data: igaActivitiesData } = useQuery({
    queryKey: ['iga-activities', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/groups/${groupId}/iga-activities`);
      return response.data.iga_activities || [];
    },
    enabled: !!groupId,
  });

  // React Query mutations for CRUD operations
  // Member CRUD mutations
  const createMemberMutation = useMutation({
    mutationFn: async (memberData) => {
      console.log('Creating member with data:', memberData); // Debug log
      const response = await apiClient.post('/members/', { ...memberData, group_id: groupId });
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Member created successfully:', data); // Debug log
      // Invalidate all relevant queries to refresh the data
      queryClient.invalidateQueries(['members', groupId]);
      queryClient.invalidateQueries(['group', groupId]);
      queryClient.invalidateQueries(['activities', groupId]);
      setMemberDialogOpen(false);
      setEditingItem(null);
      // Show success message
      alert('Member added successfully!');
    },
    onError: (error) => {
      console.error('Error creating member:', error); // Debug log
      alert(`Failed to add member: ${error.response?.data?.error || error.message}`);
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, memberData }) => {
      console.log('Updating member with data:', { memberId, memberData }); // Debug log
      const response = await apiClient.put(`/members/${memberId}`, memberData);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Member updated successfully:', data); // Debug log
      // Invalidate all relevant queries to refresh the data
      queryClient.invalidateQueries(['members', groupId]);
      queryClient.invalidateQueries(['group', groupId]);
      queryClient.invalidateQueries(['activities', groupId]);
      setMemberDialogOpen(false);
      setEditingItem(null);
      // Show success message
      alert('Member updated successfully!');
    },
    onError: (error) => {
      console.error('Error updating member:', error); // Debug log
      alert(`Failed to update member: ${error.response?.data?.error || error.message}`);
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      const response = await apiClient.delete(`/members/${memberId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['members', groupId]);
      queryClient.invalidateQueries(['group', groupId]);
    },
  });

  // Meeting CRUD mutations
  const createMeetingMutation = useMutation({
    mutationFn: async (meetingData) => {
      const response = await apiClient.post('/meetings/', { ...meetingData, group_id: groupId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activities', groupId]);
      setMeetingDialogOpen(false);
      setEditingItem(null);
    },
  });

  // Activity CRUD mutations
  const createActivityMutation = useMutation({
    mutationFn: async (activityData) => {
      const response = await apiClient.post('/meeting-activities/', { ...activityData, group_id: groupId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activities', groupId]);
      setActivityDialogOpen(false);
      setEditingItem(null);
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityId, activityData }) => {
      const response = await apiClient.put(`/meeting-activities/${activityId}`, activityData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activities', groupId]);
      setActivityDialogOpen(false);
      setEditingItem(null);
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId) => {
      const response = await apiClient.delete(`/meeting-activities/${activityId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['activities', groupId]);
    },
  });

  // Loading state
  if (groupLoading || membersLoading || activitiesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (groupError) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Failed to load group data: {groupError.message}
        </Alert>
      </Box>
    );
  }

  // Use real data or fallback to mock structure
  const displayGroupData = groupData || {
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
    const activities = activitiesData || [];
    return activities
      .map(activity => ({
        // Transform backend data to frontend format
        id: activity.id,
        title: activity.description || `${activity.activity_type.replace('_', ' ')} Activity`,
        description: activity.description || '',
        date: activity.meeting_date || activity.created_date,
        time: '14:00', // Default time since backend doesn't provide it
        location: activity.location || 'Community Center',
        attendees: 15, // Default since backend doesn't provide it
        status: activity.status || 'completed',
        activity_type: activity.activity_type,
        amount: activity.amount
      }))
      .filter(activity => {
        // Transform activity types to match filter structure
        const activityType = activity.activity_type === 'savings_collection' ? 'meeting' : 'meeting';
        const typeMatch = calendarFilters.activityTypes[activityType] || true;
        const statusMatch = calendarFilters.statuses[activity.status] || true;
        return typeMatch && statusMatch;
      });
  };

  // Transform members data for display
  const displayMembers = membersData || [];

  // Calculate financial summaries from real data
  const calculateFinancialSummary = () => {
    if (!activitiesData) return { total_savings: 0, total_loans: 0 };

    const savings = activitiesData
      .filter(a => a.activity_type === 'savings_collection')
      .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

    const loans = activitiesData
      .filter(a => a.activity_type === 'loan_disbursement')
      .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

    return { total_savings: savings, total_loans: loans };
  };

  const financialSummary = calculateFinancialSummary();

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
                {displayGroupData.name}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {displayGroupData.district || displayGroupData.location} • {displayGroupData.parish} • {displayGroupData.village}
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
                      label={displayGroupData.state || displayGroupData.status}
                      color={(displayGroupData.state || displayGroupData.status) === 'ACTIVE' ? 'success' : 'default'}
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
                      {displayMembers.length}/{displayGroupData.max_members}
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
                      {formatCurrency(displayGroupData.savings_balance || financialSummary.total_savings)}
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
                        {displayGroupData.credit_score || 85}%
                      </Typography>
                      <Chip
                        label={displayGroupData.risk_level || 'LOW'}
                        color={getRiskColor(displayGroupData.risk_level || 'LOW')}
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
            <Tab label="Activities" icon={<TrendingUp />} />
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
                Group Members ({displayMembers.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<Person />}
                onClick={() => {
                  setEditingItem(null);
                  setEditMode(false);
                  setMemberDialogOpen(true);
                }}
              >
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
                  {displayMembers.map((member) => (
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
                      <TableCell>{member.gender === 'FEMALE' ? 'Female' : 'Male'}</TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell align="right">{formatCurrency(member.share_balance || 0)}</TableCell>
                      <TableCell align="right">{formatCurrency(member.loans)}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/members/${member.id}`)}
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingItem(member);
                            setEditMode(true);
                            setMemberDialogOpen(true);
                          }}
                        >
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
          {/* Activities - Meeting Activities with Individual Member Tracking */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                📊 Meeting Activities ({activitiesData?.length || 0})
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  // Navigate to create activity - could be enhanced
                  console.log('Add activity clicked');
                  alert('Navigate to a meeting to add activities with member participation tracking');
                }}
              >
                Add Activity
              </Button>
            </Box>

            {activitiesLoading ? (
              <CircularProgress />
            ) : activitiesData && activitiesData.length > 0 ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Activity Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activitiesData.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="body2">
                              {activity.activity_type?.replace('_', ' ').toUpperCase() || 'Activity'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{activity.description}</TableCell>
                        <TableCell align="right">
                          UGX {parseFloat(activity.amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={activity.status || 'completed'}
                            color={activity.status === 'completed' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {activity.meeting_date || activity.created_date ?
                            new Date(activity.meeting_date || activity.created_date).toLocaleDateString() :
                            'N/A'
                          }
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            onClick={() => {
                              console.log('View activity details:', activity.id);
                              alert(`Activity: ${activity.description}\nAmount: UGX ${parseFloat(activity.amount || 0).toLocaleString()}\nType: ${activity.activity_type}`);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Alert severity="info">
                No activities found for this group. Activities are created during meetings with individual member participation tracking.
              </Alert>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Constitution & Governance */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Constitution Documents ({constitutionData?.length || 0})
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<Upload />}
                      size="small"
                      onClick={() => {
                        setEditingItem(null);
                        setEditMode(false);
                        setConstitutionDialogOpen(true);
                      }}
                    >
                      Upload New Version
                    </Button>
                  </Box>

                  {constitutionData && constitutionData.length > 0 ? (
                    <List>
                      {constitutionData.slice(0, 3).map((doc) => (
                        <ListItem key={doc.id}>
                          <ListItemIcon>
                            <MenuBook />
                          </ListItemIcon>
                          <ListItemText
                            primary={doc.title}
                            secondary={`Version ${doc.version_number} • ${new Date(doc.upload_date).toLocaleDateString()}`}
                          />
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Alert severity="info">
                      No constitution documents uploaded yet.
                    </Alert>
                  )}

                  <Button variant="outlined" startIcon={<MenuBook />} sx={{ mt: 2 }} fullWidth>
                    View All Documents
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

        <TabPanel value={tabValue} index={5}>
          {/* Trainings & Capacity Building */}
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Training History ({trainingsData?.length || 0})
              </Typography>
              <Button
                variant="contained"
                startIcon={<School />}
                onClick={() => {
                  setEditingItem(null);
                  setEditMode(false);
                  setTrainingDialogOpen(true);
                }}
              >
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
                  {trainingsData && trainingsData.length > 0 ? (
                    trainingsData.map((training) => (
                      <TableRow key={training.id}>
                        <TableCell>{training.topic}</TableCell>
                        <TableCell>{new Date(training.training_date).toLocaleDateString()}</TableCell>
                        <TableCell>{training.attended_count || 0} / {training.total_participants || 0} members</TableCell>
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No trainings scheduled yet
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={6}>
          {/* Voting History */}
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Voting & Decision History ({groupData.votes.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<HowToVote />}
                onClick={() => {
                  setEditingItem(null);
                  setEditMode(false);
                  setVotingDialogOpen(true);
                }}
              >
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

        <TabPanel value={tabValue} index={7}>
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

        <TabPanel value={tabValue} index={8}>
          {/* Saving Cycles Management */}
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Saving Cycles History ({groupData.saving_cycles.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<CalendarToday />}
                onClick={() => {
                  setEditingItem(null);
                  setEditMode(false);
                  setSavingCycleDialogOpen(true);
                }}
              >
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

        <TabPanel value={tabValue} index={9}>
          {/* Income Generating Activities */}
          <Box>
            <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Income Generating Activities ({groupData.iga_activities.length})
              </Typography>
              <Button
                variant="contained"
                startIcon={<Business />}
                onClick={() => {
                  setEditingItem(null);
                  setEditMode(false);
                  setIgaDialogOpen(true);
                }}
              >
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

        <TabPanel value={tabValue} index={10}>
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
                <Button
                  variant="contained"
                  startIcon={<Event />}
                  onClick={() => {
                    setEditingItem(null);
                    setEditMode(false);
                    setCalendarDialogOpen(true);
                  }}
                >
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

        <TabPanel value={tabValue} index={11}>
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

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editMode ? 'Edit Member' : 'Add New Member'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Full Name"
              margin="normal"
              defaultValue={editingItem?.name || ''}
              id="member-name"
            />
            <TextField
              fullWidth
              label="Phone Number"
              margin="normal"
              defaultValue={editingItem?.phone || ''}
              id="member-phone"
            />
            <TextField
              fullWidth
              label="Email"
              margin="normal"
              type="email"
              defaultValue={editingItem?.email || ''}
              id="member-email"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Gender</InputLabel>
              <Select
                defaultValue={editingItem?.gender || 'FEMALE'}
                label="Gender"
                id="member-gender"
              >
                <MenuItem value="FEMALE">Female</MenuItem>
                <MenuItem value="MALE">Male</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Role</InputLabel>
              <Select
                defaultValue={editingItem?.role || 'MEMBER'}
                label="Role"
                id="member-role"
              >
                <MenuItem value="MEMBER">Member</MenuItem>
                <MenuItem value="CHAIRPERSON">Chairperson</MenuItem>
                <MenuItem value="SECRETARY">Secretary</MenuItem>
                <MenuItem value="TREASURER">Treasurer</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const phoneValue = document.getElementById('member-phone').value;
              const memberData = {
                name: document.getElementById('member-name').value,
                phone: phoneValue && !phoneValue.startsWith('+') ? `+256${phoneValue}` : phoneValue,
                email: document.getElementById('member-email').value,
                gender: document.getElementById('member-gender').value,
                role: document.getElementById('member-role').value,
              };

              console.log('Submitting member data:', memberData); // Debug log

              if (editMode && editingItem) {
                updateMemberMutation.mutate({ memberId: editingItem.id, memberData });
              } else {
                createMemberMutation.mutate(memberData);
              }
            }}
          >
            {editMode ? 'Update' : 'Add'} Member
          </Button>
        </DialogActions>
      </Dialog>

      {/* Constitution Dialog */}
      <Dialog open={constitutionDialogOpen} onClose={() => setConstitutionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload New Constitution</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Document Title"
              margin="normal"
              id="constitution-title"
            />
            <TextField
              fullWidth
              label="Version"
              margin="normal"
              id="constitution-version"
            />
            <TextField
              fullWidth
              label="Description"
              margin="normal"
              multiline
              rows={3}
              id="constitution-description"
            />
            <Button
              variant="outlined"
              component="label"
              fullWidth
              sx={{ mt: 2 }}
            >
              Choose File
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx"
                id="constitution-file"
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConstitutionDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              // TODO: Implement file upload
              console.log('Constitution upload clicked');
              setConstitutionDialogOpen(false);
            }}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Training Dialog */}
      <Dialog open={trainingDialogOpen} onClose={() => setTrainingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Training Session</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Training Title"
              margin="normal"
              id="training-title"
            />
            <TextField
              fullWidth
              label="Trainer Name"
              margin="normal"
              id="training-trainer"
            />
            <TextField
              fullWidth
              label="Date"
              margin="normal"
              type="date"
              InputLabelProps={{ shrink: true }}
              id="training-date"
            />
            <TextField
              fullWidth
              label="Time"
              margin="normal"
              type="time"
              InputLabelProps={{ shrink: true }}
              id="training-time"
            />
            <TextField
              fullWidth
              label="Duration (hours)"
              margin="normal"
              type="number"
              id="training-duration"
            />
            <TextField
              fullWidth
              label="Description"
              margin="normal"
              multiline
              rows={3}
              id="training-description"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrainingDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const trainingData = {
                title: document.getElementById('training-title').value,
                trainer: document.getElementById('training-trainer').value,
                date: document.getElementById('training-date').value,
                time: document.getElementById('training-time').value,
                duration: document.getElementById('training-duration').value,
                description: document.getElementById('training-description').value,
              };
              console.log('Training data:', trainingData);
              // TODO: Implement training creation API call
              setTrainingDialogOpen(false);
            }}
          >
            Schedule Training
          </Button>
        </DialogActions>
      </Dialog>

      {/* Voting Dialog */}
      <Dialog open={votingDialogOpen} onClose={() => setVotingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Vote</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Vote Title"
              margin="normal"
              id="vote-title"
            />
            <TextField
              fullWidth
              label="Description"
              margin="normal"
              multiline
              rows={3}
              id="vote-description"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Vote Type</InputLabel>
              <Select
                defaultValue="simple"
                label="Vote Type"
                id="vote-type"
              >
                <MenuItem value="simple">Simple Majority</MenuItem>
                <MenuItem value="unanimous">Unanimous</MenuItem>
                <MenuItem value="two-thirds">Two-Thirds Majority</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="End Date"
              margin="normal"
              type="date"
              InputLabelProps={{ shrink: true }}
              id="vote-end-date"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVotingDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const voteData = {
                title: document.getElementById('vote-title').value,
                description: document.getElementById('vote-description').value,
                type: document.getElementById('vote-type').value,
                end_date: document.getElementById('vote-end-date').value,
              };
              console.log('Vote data:', voteData);
              // TODO: Implement vote creation API call
              setVotingDialogOpen(false);
            }}
          >
            Create Vote
          </Button>
        </DialogActions>
      </Dialog>

      {/* Savings Cycle Dialog */}
      <Dialog open={savingCycleDialogOpen} onClose={() => setSavingCycleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Savings Cycle</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Cycle Name"
              margin="normal"
              id="cycle-name"
            />
            <TextField
              fullWidth
              label="Start Date"
              margin="normal"
              type="date"
              InputLabelProps={{ shrink: true }}
              id="cycle-start-date"
            />
            <TextField
              fullWidth
              label="End Date"
              margin="normal"
              type="date"
              InputLabelProps={{ shrink: true }}
              id="cycle-end-date"
            />
            <TextField
              fullWidth
              label="Target Amount"
              margin="normal"
              type="number"
              id="cycle-target-amount"
            />
            <TextField
              fullWidth
              label="Minimum Contribution"
              margin="normal"
              type="number"
              id="cycle-min-contribution"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSavingCycleDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const cycleData = {
                name: document.getElementById('cycle-name').value,
                start_date: document.getElementById('cycle-start-date').value,
                end_date: document.getElementById('cycle-end-date').value,
                target_amount: document.getElementById('cycle-target-amount').value,
                min_contribution: document.getElementById('cycle-min-contribution').value,
              };
              console.log('Cycle data:', cycleData);
              // TODO: Implement savings cycle creation API call
              setSavingCycleDialogOpen(false);
            }}
          >
            Start Cycle
          </Button>
        </DialogActions>
      </Dialog>

      {/* IGA Activities Dialog */}
      <Dialog open={igaDialogOpen} onClose={() => setIgaDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New IGA Activity</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Activity Name"
              margin="normal"
              id="iga-name"
            />
            <TextField
              fullWidth
              label="Description"
              margin="normal"
              multiline
              rows={3}
              id="iga-description"
            />
            <TextField
              fullWidth
              label="Initial Investment"
              margin="normal"
              type="number"
              id="iga-investment"
            />
            <TextField
              fullWidth
              label="Expected Monthly Return"
              margin="normal"
              type="number"
              id="iga-return"
            />
            <TextField
              fullWidth
              label="Start Date"
              margin="normal"
              type="date"
              InputLabelProps={{ shrink: true }}
              id="iga-start-date"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                defaultValue="planned"
                label="Status"
                id="iga-status"
              >
                <MenuItem value="planned">Planned</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIgaDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const igaData = {
                name: document.getElementById('iga-name').value,
                description: document.getElementById('iga-description').value,
                investment: document.getElementById('iga-investment').value,
                expected_return: document.getElementById('iga-return').value,
                start_date: document.getElementById('iga-start-date').value,
                status: document.getElementById('iga-status').value,
              };
              console.log('IGA data:', igaData);
              // TODO: Implement IGA creation API call
              setIgaDialogOpen(false);
            }}
          >
            Add IGA Activity
          </Button>
        </DialogActions>
      </Dialog>

      {/* Calendar Event Dialog */}
      <Dialog open={calendarDialogOpen} onClose={() => setCalendarDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Calendar Event</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Event Title"
              margin="normal"
              id="event-title"
            />
            <TextField
              fullWidth
              label="Description"
              margin="normal"
              multiline
              rows={3}
              id="event-description"
            />
            <TextField
              fullWidth
              label="Date"
              margin="normal"
              type="date"
              InputLabelProps={{ shrink: true }}
              id="event-date"
            />
            <TextField
              fullWidth
              label="Start Time"
              margin="normal"
              type="time"
              InputLabelProps={{ shrink: true }}
              id="event-start-time"
            />
            <TextField
              fullWidth
              label="End Time"
              margin="normal"
              type="time"
              InputLabelProps={{ shrink: true }}
              id="event-end-time"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Event Type</InputLabel>
              <Select
                defaultValue="meeting"
                label="Event Type"
                id="event-type"
              >
                <MenuItem value="meeting">Meeting</MenuItem>
                <MenuItem value="training">Training</MenuItem>
                <MenuItem value="social">Social Event</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalendarDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const eventData = {
                title: document.getElementById('event-title').value,
                description: document.getElementById('event-description').value,
                date: document.getElementById('event-date').value,
                start_time: document.getElementById('event-start-time').value,
                end_time: document.getElementById('event-end-time').value,
                type: document.getElementById('event-type').value,
              };
              console.log('Event data:', eventData);
              // TODO: Implement calendar event creation API call
              setCalendarDialogOpen(false);
            }}
          >
            Add Event
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
