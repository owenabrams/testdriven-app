import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Snackbar,
  CircularProgress,
  Stack,
  Fab,
} from '@mui/material';
import {
  ArrowBack,
  Event,
  Group,
  LocationOn,
  Schedule,
  CheckCircle,
  Cancel,
  AttachMoney,
  Assignment,
  Description,
  ExpandMore,
  Person,
  Download,
  Visibility,
  Edit,
  Share,
  Print,
  CloudUpload,
  AttachFile,
  PictureAsPdf,
  Image,
  InsertDriveFile,
  AccountBalance,
  TrendingUp,
  TrendingDown,
  MonetizationOn,
  Savings,
  CreditCard,
  Receipt,
  Add,
  Delete,
  Save,
  Close,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingsAPI, apiClient } from '../../services/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { formatCurrency, getCurrencyCode } from '../../utils/currency';

const ACTIVITY_TYPES = {
  OPENING_PRAYER: { icon: '🙏', label: 'Opening Prayer', color: 'primary' },
  ATTENDANCE_CHECK: { icon: '✅', label: 'Attendance Check', color: 'info' },
  INDIVIDUAL_SAVINGS: { icon: '💰', label: 'Individual Savings', color: 'success' },
  LOAN_APPLICATIONS: { icon: '📋', label: 'Loan Applications', color: 'warning' },
  FINANCIAL_REPORT: { icon: '📊', label: 'Financial Report', color: 'secondary' },
  ELECTIONS: { icon: '🗳️', label: 'Elections', color: 'error' },
  TRAINING: { icon: '📚', label: 'Training', color: 'info' },
  AOB: { icon: '💬', label: 'Any Other Business', color: 'default' },
  CLOSING_PRAYER: { icon: '🙏', label: 'Closing Prayer', color: 'primary' },
};

const DOCUMENT_TYPES = {
  MEETING_MINUTES: { icon: '📝', label: 'Meeting Minutes' },
  ATTENDANCE_SHEET: { icon: '📋', label: 'Attendance Sheet' },
  FINANCIAL_RECEIPT: { icon: '🧾', label: 'Financial Receipt' },
  PHOTO_PROOF: { icon: '📸', label: 'Photo Proof' },
  SIGNATURE_SHEET: { icon: '✍️', label: 'Signature Sheet' },
  OTHER: { icon: '📄', label: 'Other Document' },
};

export default function MeetingDetailsPage() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Debug logging
  console.log('🔍 MeetingDetailsPage render - meetingId:', meetingId);

  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    attendance: true,
    activities: true,
    financial: true,
    minutes: false,
    documents: false,
  });

  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadData, setUploadData] = useState({
    file: null,
    document_type: 'MEETING_MINUTES',
    description: '',
    access_level: 'GROUP'
  });
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Activity CRUD state
  const [activityDialog, setActivityDialog] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityFormData, setActivityFormData] = useState({
    activity_type: 'savings_collection',
    activity_name: '',
    description: '',
    amount: '',
    status: 'COMPLETED',
    facilitator_name: '',
    duration_minutes: '',
    responsible_member_id: '',
    notes: ''
  });

  // Member participation state
  const [memberParticipations, setMemberParticipations] = useState([]);

  // Fetch comprehensive meeting details
  const { data: meetingData, isLoading, error } = useQuery({
    queryKey: ['meeting-details', meetingId],
    queryFn: () => meetingsAPI.getMeeting(meetingId),
    select: (response) => response.data || null,
    enabled: !!meetingId && meetingId !== 'undefined' && meetingId !== 'null', // Only run query if meetingId is valid
  });

  // Fetch group members for participation tracking
  const { data: groupMembersData } = useQuery({
    queryKey: ['group-members', meetingData?.meeting?.group_id],
    queryFn: async () => {
      if (!meetingData?.meeting?.group_id) return [];
      const response = await apiClient.get(`/groups/${meetingData.meeting.group_id}/members`);
      return response.data.members || [];
    },
    enabled: !!meetingData?.meeting?.group_id,
  });

  // Activity CRUD mutations
  const createActivityMutation = useMutation({
    mutationFn: async (activityData) => {
      console.log('Creating activity with data:', activityData);

      // Ensure required fields are present
      const payload = {
        activity_type: activityData.activity_type,
        activity_name: activityData.activity_name || activityData.description || 'New Activity',
        description: activityData.description,
        responsible_member_id: activityData.responsible_member_id || groupMembersData?.[0]?.id,
        member_participations: memberParticipations.length > 0 ? memberParticipations : undefined
      };

      console.log('Final payload:', payload);

      const response = await apiClient.post(`/meeting-activities/meetings/${meetingId}/activities`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['meeting-details', meetingId]);
      setActivityDialog(false);
      setEditingActivity(null);
      setMemberParticipations([]);
      setNotification({
        open: true,
        message: 'Activity created successfully with member participation records!',
        severity: 'success'
      });
    },
    onError: (error) => {
      console.error('Activity creation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create activity. Please try again.';
      setNotification({
        open: true,
        message: `Failed to create activity: ${errorMessage}`,
        severity: 'error'
      });
    }
  });

  // Note: Backend doesn't support activity update/delete yet - only create
  // Keeping these as placeholders for future implementation
  const updateActivityMutation = useMutation({
    mutationFn: async ({ activityId, activityData }) => {
      console.log('Update not supported yet:', activityId, activityData);
      throw new Error('Activity updates are not supported yet');
    },
    onError: (error) => {
      setNotification({
        open: true,
        message: 'Activity updates are not supported yet',
        severity: 'warning'
      });
    }
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId) => {
      console.log('Delete not supported yet:', activityId);
      throw new Error('Activity deletion is not supported yet');
    },
    onError: (error) => {
      setNotification({
        open: true,
        message: 'Activity deletion is not supported yet',
        severity: 'warning'
      });
    }
  });

  const meeting = meetingData?.meeting || null;
  const financialSummary = meetingData?.financial_summary || {};
  const activities = meetingData?.activities || [];
  const attendance = meetingData?.attendance || [];
  const documents = meetingData?.documents || [];
  const participation = meetingData?.participation || [];
  const loansSummary = meetingData?.loans_summary || {};
  const summary = meetingData?.summary || {};

  // Debug logging
  console.log('MeetingDetailsPage - meetingData:', meetingData);
  console.log('MeetingDetailsPage - activities:', activities);
  console.log('MeetingDetailsPage - activities.length:', activities.length);

  // Process attendance data
  const attendees = attendance.filter(member => member.status === 'PRESENT' || member.present === true) || [];
  const absentees = attendance.filter(member => member.status === 'ABSENT' || member.present === false) || [];

  const handleSectionToggle = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleMemberClick = (memberId) => {
    navigate(`/members/${memberId}`);
  };

  const handleActivityClick = (activityId) => {
    // Navigate to activity details - circular navigation
    console.log('Navigate to activity:', activityId);
  };

  const handleAddActivity = () => {
    setEditingActivity(null);
    setActivityFormData({
      activity_type: 'savings_collection',
      activity_name: '',
      description: '',
      amount: '',
      status: 'COMPLETED',
      facilitator_name: '',
      duration_minutes: '',
      responsible_member_id: groupMembersData?.[0]?.id || '',
      notes: ''
    });

    // Initialize member participations with all group members
    if (groupMembersData && groupMembersData.length > 0) {
      const initialParticipations = groupMembersData.map(member => ({
        member_id: member.id,
        member_name: member.name,
        participation_type: 'contributor',
        amount_contributed: 0,
        notes: ''
      }));
      setMemberParticipations(initialParticipations);
    }

    setActivityDialog(true);
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setActivityFormData({
      activity_type: activity.activity_type || 'savings_collection',
      activity_name: activity.activity_name || activity.name || '',
      description: activity.description || '',
      amount: activity.amount || '',
      status: activity.status || 'COMPLETED',
      facilitator_name: activity.facilitator_name || '',
      duration_minutes: activity.duration_minutes || '',
      responsible_member_id: activity.responsible_member_id || groupMembersData?.[0]?.id || '',
      notes: activity.notes || ''
    });
    setActivityDialog(true);
  };

  const handleDeleteActivity = (activityId) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      deleteActivityMutation.mutate(activityId);
    }
  };

  const handleActivityFormSubmit = () => {
    // Validate required fields
    if (!activityFormData.activity_name?.trim()) {
      setNotification({
        open: true,
        message: 'Activity name is required',
        severity: 'error'
      });
      return;
    }

    if (!activityFormData.responsible_member_id) {
      setNotification({
        open: true,
        message: 'Please select a responsible member',
        severity: 'error'
      });
      return;
    }

    if (editingActivity) {
      setNotification({
        open: true,
        message: 'Activity editing is not supported yet. You can only create new activities.',
        severity: 'warning'
      });
      return;
    } else {
      createActivityMutation.mutate(activityFormData);
    }
  };

  const handleDocumentView = (documentId) => {
    // Open document viewer
    console.log('View document:', documentId);
  };

  const handleDocumentDownload = async (documentId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/documents/${documentId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document-${documentId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      setNotification({ open: true, message: 'Failed to download document', severity: 'error' });
    }
  };

  const handleFileUpload = () => {
    setUploadDialog(true);
  };

  const handleUploadSubmit = async () => {
    if (!uploadData.file) {
      setNotification({ open: true, message: 'Please select a file', severity: 'error' });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('document_type', uploadData.document_type);
    formData.append('description', uploadData.description);
    formData.append('access_level', uploadData.access_level);
    formData.append('uploaded_by', 1); // TODO: Get from auth context

    try {
      const response = await fetch(`http://localhost:5001/api/meetings/${meetingId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setNotification({ open: true, message: 'Document uploaded successfully', severity: 'success' });
        setUploadDialog(false);
        setUploadData({ file: null, document_type: 'MEETING_MINUTES', description: '', access_level: 'GROUP' });
        // Refetch meeting data
        window.location.reload(); // Simple refresh for now
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setNotification({ open: true, message: 'Failed to upload document', severity: 'error' });
    } finally {
      setUploading(false);
    }
  };

  // Currency formatting is now handled by the centralized utility
  // const formatCurrency is imported from '../../utils/currency'

  // Check if meetingId is missing or invalid
  if (!meetingId || meetingId === 'undefined' || meetingId === 'null') {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Invalid meeting ID. Please navigate to a valid meeting.
      </Alert>
    );
  }

  if (isLoading) return <LoadingSpinner />;

  if (error || !meeting) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load meeting details. Please try again.
      </Alert>
    );
  }

  // Data already extracted above from meetingData

  return (
    <Box>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Box flex={1}>
          <Typography variant="h4" gutterBottom>
            {meeting.scheduler_title || meeting.agenda || 'Meeting Details'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {meeting.group_name}
          </Typography>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <Chip
              icon={<Event />}
              label={meeting.meeting_date ? format(parseISO(meeting.meeting_date), 'PPP') : 'Date TBD'}
              variant="outlined"
            />
            <Chip
              icon={<Schedule />}
              label={meeting.meeting_time || 'Time TBD'}
              variant="outlined"
            />
            <Chip
              icon={<LocationOn />}
              label={meeting.location || meeting.group_location || 'Location TBD'}
              variant="outlined"
            />
            <Chip
              label={meeting.status || 'SCHEDULED'}
              color={meeting.status === 'COMPLETED' ? 'success' : 'primary'}
            />
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<Edit />}>
            Edit
          </Button>
          <Button variant="outlined" startIcon={<Share />}>
            Share
          </Button>
          <Button variant="outlined" startIcon={<Print />}>
            Print
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Meeting Overview */}
        <Grid item xs={12}>
          <Accordion 
            expanded={expandedSections.overview} 
            onChange={() => handleSectionToggle('overview')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">📋 Meeting Overview</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="success.main">
                        {attendees.length}
                      </Typography>
                      <Typography variant="body2">Present</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="warning.main">
                        {absentees.length}
                      </Typography>
                      <Typography variant="body2">Absent</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="primary.main">
                        {attendees.length + absentees.length > 0
                          ? Math.round((attendees.length / (attendees.length + absentees.length)) * 100)
                          : 0}%
                      </Typography>
                      <Typography variant="body2">Attendance Rate</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary">
                    {meeting.description}
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Attendance Details */}
        <Grid item xs={12}>
          <Accordion 
            expanded={expandedSections.attendance} 
            onChange={() => handleSectionToggle('attendance')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">
                👥 Attendance ({attendees.length + absentees.length} members)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" color="success.main" gutterBottom>
                    ✅ Present ({attendees.length})
                  </Typography>
                  <List dense>
                    {attendees.map((member) => (
                      <ListItemButton 
                        key={member.id}
                        onClick={() => handleMemberClick(member.id)}
                      >
                        <ListItemIcon>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.light' }}>
                            {member.gender === 'F' ? '👩' : '👨'}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={member.name}
                          secondary={`${member.role} • Arrived: ${member.arrival_time || 'On time'}`}
                        />
                        {member.contribution && (
                          <Chip
                            size="small"
                            label={`${member.contribution} UGX`}
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </ListItemButton>
                    ))}
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" color="warning.main" gutterBottom>
                    ❌ Absent ({absentees.length})
                  </Typography>
                  <List dense>
                    {absentees.map((member) => (
                      <ListItemButton 
                        key={member.id}
                        onClick={() => handleMemberClick(member.id)}
                      >
                        <ListItemIcon>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.light' }}>
                            {member.gender === 'F' ? '👩' : '👨'}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={member.name}
                          secondary={`${member.role} • Reason: ${member.excuse_reason || 'No excuse'}`}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Meeting Activities & Training */}
        <Grid item xs={12}>
          <Accordion
            expanded={expandedSections.activities}
            onChange={() => handleSectionToggle('activities')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Box display="flex" alignItems="center" gap={1}>
                  <Assignment color="primary" />
                  <Typography variant="h6">Meeting Activities & Training ({activities.length})</Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<Add />}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent accordion toggle
                    handleAddActivity();
                  }}
                  sx={{ mr: 2 }}
                >
                  Add Activity
                </Button>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {activities.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Activity</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Expected Amount</TableCell>
                        <TableCell>Actual Amount</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Duration</TableCell>
                        <TableCell>Facilitator</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                    {activities.map((activity) => {
                      const activityType = ACTIVITY_TYPES[activity.activity_type] || ACTIVITY_TYPES.AOB;
                      return (
                        <TableRow key={activity.id} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2">{activityType.icon}</Typography>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {activity.activity_name || activity.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {activity.description}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={activityType.label}
                              color={activityType.color}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {activity.expected_amount ? formatCurrency(activity.expected_amount) : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium" color="success.main">
                              {activity.actual_amount ? formatCurrency(activity.actual_amount) : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={activity.status || 'PENDING'}
                              color={activity.status === 'COMPLETED' ? 'success' :
                                     activity.status === 'IN_PROGRESS' ? 'warning' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {activity.duration_minutes ? `${activity.duration_minutes} min` : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {activity.facilitator_name || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Box display="flex" gap={1}>
                              <Tooltip title="View Activity Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleActivityClick(activity.id)}
                                >
                                  <Visibility />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Edit Activity (Not Available)">
                                <IconButton
                                  size="small"
                                  disabled
                                  onClick={() => setNotification({
                                    open: true,
                                    message: 'Activity editing is not supported yet',
                                    severity: 'info'
                                  })}
                                >
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete Activity (Not Available)">
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled
                                  onClick={() => setNotification({
                                    open: true,
                                    message: 'Activity deletion is not supported yet',
                                    severity: 'info'
                                  })}
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                              {activity.notes && (
                                <Tooltip title={activity.notes}>
                                  <IconButton size="small">
                                    <Description />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              ) : (
                <Alert severity="info">
                  No activities recorded for this meeting yet. Activities will appear here once the meeting is conducted.
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Comprehensive Financial Summary */}
        <Grid item xs={12}>
          <Accordion
            expanded={expandedSections.financial}
            onChange={() => handleSectionToggle('financial')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <MonetizationOn color="primary" />
                <Typography variant="h6">Financial Summary & Activities</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {/* Financial Overview Cards */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                💰 Financial Overview
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ bgcolor: 'success.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Savings color="success" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h5" color="success.main">
                        {formatCurrency(financialSummary.total_savings)}
                      </Typography>
                      <Typography variant="body2">Total Savings Collected</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ bgcolor: 'warning.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <CreditCard color="warning" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h5" color="warning.main">
                        {formatCurrency(financialSummary.loans_disbursed)}
                      </Typography>
                      <Typography variant="body2">Loans Disbursed</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ bgcolor: 'error.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Receipt color="error" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h5" color="error.main">
                        {formatCurrency(financialSummary.fines_collected)}
                      </Typography>
                      <Typography variant="body2">Fines Collected</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined" sx={{ bgcolor: 'info.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <AccountBalance color="info" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography variant="h5" color="info.main">
                        {formatCurrency(loansSummary.outstanding_loans || 0)}
                      </Typography>
                      <Typography variant="body2">Outstanding Loans</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Fund Breakdown */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                🏦 Fund Breakdown
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>ECD Fund</Typography>
                      <Typography variant="h6" color="primary.main">
                        {formatCurrency(meeting.ecd_fund_collected || 0)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>Social Fund</Typography>
                      <Typography variant="h6" color="secondary.main">
                        {formatCurrency(meeting.social_fund_collected || 0)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>Emergency Fund</Typography>
                      <Typography variant="h6" color="warning.main">
                        {formatCurrency(meeting.emergency_fund_collected || 0)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Attendance Summary */}
              <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
                👥 Attendance Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ bgcolor: 'success.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {financialSummary.members_present || attendance.length || 0}
                      </Typography>
                      <Typography variant="body1">Members Present</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined" sx={{ bgcolor: 'error.50' }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {financialSummary.members_absent || 0}
                      </Typography>
                      <Typography variant="body1">Members Absent</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Meeting Minutes */}
        <Grid item xs={12}>
          <Accordion
            expanded={expandedSections.minutes}
            onChange={() => handleSectionToggle('minutes')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">📝 Meeting Minutes & Notes</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                {meeting.minutes ? (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Secretary Notes
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {meeting.minutes}
                    </Typography>
                  </Paper>
                ) : (
                  <Alert severity="info">
                    No meeting minutes recorded yet.
                  </Alert>
                )}

                {meeting.key_decisions && meeting.key_decisions.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Key Decisions
                    </Typography>
                    <List dense>
                      {meeting.key_decisions.map((decision, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircle color="success" />
                          </ListItemIcon>
                          <ListItemText primary={decision} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}

                {meeting.action_items && meeting.action_items.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Action Items
                    </Typography>
                    <List dense>
                      {meeting.action_items.map((item, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Assignment color="primary" />
                          </ListItemIcon>
                          <ListItemText
                            primary={item.task}
                            secondary={`Assigned to: ${item.assignee} • Due: ${item.due_date}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Documents & Attachments */}
        <Grid item xs={12}>
          <Accordion
            expanded={expandedSections.documents}
            onChange={() => handleSectionToggle('documents')}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                <Box display="flex" alignItems="center" gap={1}>
                  <AttachFile color="primary" />
                  <Typography variant="h6">Documents & Physical Proof ({documents.length})</Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CloudUpload />}
                  onClick={handleFileUpload}
                  sx={{ mr: 2 }}
                >
                  Upload Document
                </Button>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {documents.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Document</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Size</TableCell>
                        <TableCell>Uploaded By</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {documents.map((doc) => {
                        const docType = DOCUMENT_TYPES[doc.type] || DOCUMENT_TYPES.OTHER;
                        return (
                          <TableRow key={doc.id} hover>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2">{docType.icon}</Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {doc.filename}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={docType.label}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {doc.uploaded_by || 'System'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {doc.upload_date ? format(parseISO(doc.upload_date), 'PP') : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Box display="flex" gap={1}>
                                <Tooltip title="View Document">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDocumentView(doc.id)}
                                  >
                                    <Visibility />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Download Document">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDocumentDownload(doc.id)}
                                  >
                                    <Download />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">
                  No documents attached to this meeting.
                </Alert>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      {/* Document Upload Dialog */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <CloudUpload color="primary" />
            Upload Meeting Document
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<AttachFile />}
              fullWidth
              sx={{ height: 60 }}
            >
              {uploadData.file ? uploadData.file.name : 'Select File (PDF, Word, Excel, Images)'}
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                onChange={(e) => setUploadData(prev => ({ ...prev, file: e.target.files[0] }))}
              />
            </Button>

            <FormControl fullWidth>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={uploadData.document_type}
                label="Document Type"
                onChange={(e) => setUploadData(prev => ({ ...prev, document_type: e.target.value }))}
              >
                <MenuItem value="MEETING_MINUTES">📝 Meeting Minutes</MenuItem>
                <MenuItem value="ATTENDANCE_SHEET">📋 Attendance Sheet</MenuItem>
                <MenuItem value="FINANCIAL_RECEIPT">🧾 Financial Receipt</MenuItem>
                <MenuItem value="PHOTO_PROOF">📸 Photo Proof</MenuItem>
                <MenuItem value="SIGNATURE_SHEET">✍️ Signature Sheet</MenuItem>
                <MenuItem value="OTHER">📄 Other Document</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              value={uploadData.description}
              onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this document..."
            />

            <FormControl fullWidth>
              <InputLabel>Access Level</InputLabel>
              <Select
                value={uploadData.access_level}
                label="Access Level"
                onChange={(e) => setUploadData(prev => ({ ...prev, access_level: e.target.value }))}
              >
                <MenuItem value="GROUP">👥 Group Members</MenuItem>
                <MenuItem value="LEADERS">👑 Leaders Only</MenuItem>
                <MenuItem value="PUBLIC">🌍 Public</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUploadSubmit}
            disabled={!uploadData.file || uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : <CloudUpload />}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity CRUD Dialog */}
      <Dialog open={activityDialog} onClose={() => setActivityDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingActivity ? 'Edit Activity' : 'Add New Activity'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Activity Type</InputLabel>
                  <Select
                    value={activityFormData.activity_type}
                    label="Activity Type"
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, activity_type: e.target.value }))}
                  >
                    <MenuItem value="savings_collection">💰 Savings Collection</MenuItem>
                    <MenuItem value="loan_disbursement">💸 Loan Disbursement</MenuItem>
                    <MenuItem value="loan_repayment">💳 Loan Repayment</MenuItem>
                    <MenuItem value="fine_collection">⚖️ Fine Collection</MenuItem>
                    <MenuItem value="emergency_fund_contribution">🚨 Emergency Fund</MenuItem>
                    <MenuItem value="social_fund_collection">🤝 Social Fund</MenuItem>
                    <MenuItem value="training_session">🎓 Training Session</MenuItem>
                    <MenuItem value="ecd_fund_contribution">👶 ECD Fund</MenuItem>
                    <MenuItem value="target_fund_contribution">🎯 Target Fund</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={activityFormData.status}
                    label="Status"
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <MenuItem value="COMPLETED">✅ Completed</MenuItem>
                    <MenuItem value="IN_PROGRESS">🔄 In Progress</MenuItem>
                    <MenuItem value="PENDING">⏳ Pending</MenuItem>
                    <MenuItem value="CANCELLED">❌ Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Activity Name *"
                  value={activityFormData.activity_name}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, activity_name: e.target.value }))}
                  placeholder="Enter activity name..."
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={2}
                  value={activityFormData.description}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what happened in this activity..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Responsible Member *</InputLabel>
                  <Select
                    value={activityFormData.responsible_member_id}
                    label="Responsible Member *"
                    onChange={(e) => setActivityFormData(prev => ({ ...prev, responsible_member_id: e.target.value }))}
                    required
                  >
                    {groupMembersData?.map((member) => (
                      <MenuItem key={member.id} value={member.id}>
                        {member.name} ({member.role})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Amount (UGX)"
                  type="number"
                  value={activityFormData.amount}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={activityFormData.duration_minutes}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  placeholder="30"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Facilitator Name"
                  value={activityFormData.facilitator_name}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, facilitator_name: e.target.value }))}
                  placeholder="Who facilitated this activity?"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={activityFormData.notes}
                  onChange={(e) => setActivityFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or observations..."
                />
              </Grid>

              {/* Member Participation Section */}
              {memberParticipations.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    👥 Member Participation ({memberParticipations.length} members)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Record individual member contributions and participation details
                  </Typography>

                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Member</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Amount (UGX)</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {memberParticipations.map((participation, index) => (
                          <TableRow key={participation.member_id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {participation.member_name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Select
                                size="small"
                                value={participation.participation_type}
                                onChange={(e) => {
                                  const updated = [...memberParticipations];
                                  updated[index].participation_type = e.target.value;
                                  setMemberParticipations(updated);
                                }}
                              >
                                <MenuItem value="contributor">💰 Contributor</MenuItem>
                                <MenuItem value="borrower">🎯 Borrower</MenuItem>
                                <MenuItem value="observer">👥 Observer</MenuItem>
                                <MenuItem value="facilitator">🎓 Facilitator</MenuItem>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                type="number"
                                value={participation.amount_contributed}
                                onChange={(e) => {
                                  const updated = [...memberParticipations];
                                  updated[index].amount_contributed = parseFloat(e.target.value) || 0;
                                  setMemberParticipations(updated);
                                }}
                                placeholder="0"
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                size="small"
                                value={participation.notes}
                                onChange={(e) => {
                                  const updated = [...memberParticipations];
                                  updated[index].notes = e.target.value;
                                  setMemberParticipations(updated);
                                }}
                                placeholder="Notes..."
                                sx={{ width: 120 }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount: UGX {memberParticipations.reduce((sum, p) => sum + (p.amount_contributed || 0), 0).toLocaleString()}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        const updated = memberParticipations.map(p => ({
                          ...p,
                          amount_contributed: 0,
                          participation_type: 'contributor',
                          notes: ''
                        }));
                        setMemberParticipations(updated);
                      }}
                    >
                      Clear All
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActivityDialog(false)} startIcon={<Close />}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleActivityFormSubmit}
            startIcon={<Save />}
            disabled={createActivityMutation.isPending || updateActivityMutation.isPending}
          >
            {editingActivity ? 'Update Activity' : 'Create Activity'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Floating Action Button for Quick Upload */}
      <Fab
        color="primary"
        aria-label="upload document"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleFileUpload}
      >
        <CloudUpload />
      </Fab>
    </Box>
  );
}
