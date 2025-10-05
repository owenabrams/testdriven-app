import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Add,
  Event,
  Group,
  Schedule,
  Close,
  CheckCircle,
  Cancel,
  Pending,
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingsAPI, savingsGroupsAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function MeetingScheduler() {
  const [open, setOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date());
  const [meetingTime, setMeetingTime] = useState(new Date());
  const [title, setTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  const queryClient = useQueryClient();

  // Fetch groups for selection
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => savingsGroupsAPI.getGroups(),
    select: (response) => response.data?.groups || [],
  });

  // Fetch meeting templates
  const { data: templates = [] } = useQuery({
    queryKey: ['meeting-templates'],
    queryFn: () => meetingsAPI.getMeetingTemplates(),
    select: (response) => response.data?.meeting_templates || [],
  });

  // Fetch upcoming meetings
  const { data: upcomingMeetings = [] } = useQuery({
    queryKey: ['upcoming-meetings'],
    queryFn: () => meetingsAPI.getCalendar(),
    select: (response) => response.data?.meetings || [],
  });

  // Schedule meeting mutation
  const scheduleMeetingMutation = useMutation({
    mutationFn: (meetingData) => {
      console.log('🔧 MeetingScheduler: Calling API with data:', meetingData);
      return meetingsAPI.scheduleMeeting(meetingData);
    },
    onSuccess: (response) => {
      console.log('✅ MeetingScheduler: Meeting scheduled successfully!', response);
      toast.success('Meeting scheduled successfully!');
      queryClient.invalidateQueries(['upcoming-meetings']);
      queryClient.invalidateQueries(['groups']);
      handleClose();
    },
    onError: (error) => {
      console.error('❌ MeetingScheduler: Error scheduling meeting:', {
        error: error,
        message: error.message,
        response: error.response,
        data: error.response?.data
      });
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to schedule meeting';
      toast.error(`Meeting scheduling failed: ${errorMessage}`);
    },
  });

  const handleClose = () => {
    setOpen(false);
    setSelectedGroup('');
    setMeetingDate(new Date());
    setMeetingTime(new Date());
    setTitle('');
    setSelectedTemplate('');
  };

  const handleSchedule = () => {
    if (!selectedGroup || !title) {
      toast.error('Please fill in all required fields');
      return;
    }

    console.log('🔧 MeetingScheduler: Preparing meeting data...');
    console.log('🔧 Selected Group:', selectedGroup);
    console.log('🔧 Meeting Date:', meetingDate);
    console.log('🔧 Meeting Time:', meetingTime);

    const meetingData = {
      group_id: parseInt(selectedGroup), // Ensure it's a number
      meeting_date: meetingDate.toISOString().split('T')[0],
      meeting_time: meetingTime.toTimeString().split(' ')[0].substring(0, 5),
      title,
      description: `Meeting scheduled via dashboard for ${title}`,
      location: 'TBD', // Default location
      meeting_type: 'REGULAR',
      template_id: selectedTemplate || null,
      scheduled_by: 1, // Current user ID - should come from auth context
    };

    console.log('🔧 Final meeting data:', meetingData);
    scheduleMeetingMutation.mutate(meetingData);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SCHEDULED':
        return <Schedule color="primary" />;
      case 'COMPLETED':
        return <CheckCircle color="success" />;
      case 'CANCELLED':
        return <Cancel color="error" />;
      default:
        return <Pending color="warning" />;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" display="flex" alignItems="center" gap={1}>
              <Event color="primary" />
              Meeting Scheduler
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpen(true)}
              size="small"
            >
              Schedule Meeting
            </Button>
          </Box>

          {/* Upcoming Meetings */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Upcoming Meetings
          </Typography>
          
          {upcomingMeetings.length > 0 ? (
            <List dense>
              {upcomingMeetings.slice(0, 3).map((meeting) => (
                <ListItem key={meeting.id} divider>
                  <ListItemIcon>
                    {getStatusIcon(meeting.status)}
                  </ListItemIcon>
                  <ListItemText
                    primary={meeting.title}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          {meeting.group_name} • {meeting.meeting_date} at {meeting.meeting_time}
                        </Typography>
                        <Chip
                          label={meeting.status}
                          size="small"
                          color={meeting.status === 'SCHEDULED' ? 'primary' : 'default'}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              No upcoming meetings scheduled
            </Alert>
          )}

          {/* Schedule Meeting Dialog */}
          <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                Schedule New Meeting
                <IconButton onClick={handleClose} size="small">
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Meeting Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Select Group</InputLabel>
                    <Select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      label="Select Group"
                    >
                      {groups.map((group) => (
                        <MenuItem key={group.id} value={group.id}>
                          <Box>
                            <Typography variant="body2">{group.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {group.members_count} members • {group.region}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6}>
                  <DatePicker
                    label="Meeting Date"
                    value={meetingDate}
                    onChange={setMeetingDate}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                    minDate={new Date()}
                  />
                </Grid>

                <Grid item xs={6}>
                  <TimePicker
                    label="Meeting Time"
                    value={meetingTime}
                    onChange={setMeetingTime}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Meeting Template (Optional)</InputLabel>
                    <Select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      label="Meeting Template (Optional)"
                    >
                      <MenuItem value="">
                        <em>No template</em>
                      </MenuItem>
                      {templates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>
                          <Box>
                            <Typography variant="body2">{template.template_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {template.default_duration_minutes} min • {template.meeting_type}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {selectedGroup && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      All group members will be automatically invited to this meeting.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </DialogContent>

            <DialogActions>
              <Button onClick={handleClose}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleSchedule}
                disabled={scheduleMeetingMutation.isLoading}
                startIcon={<Event />}
              >
                {scheduleMeetingMutation.isLoading ? 'Scheduling...' : 'Schedule Meeting'}
              </Button>
            </DialogActions>
          </Dialog>
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
}
