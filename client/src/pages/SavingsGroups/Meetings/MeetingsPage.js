import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import {
  EventAvailable,
  Person,
  Schedule,
  QrCode,
  LocationOn,
  Add,
  Visibility,
  CheckCircle,
  Warning
} from '@mui/icons-material';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`meetings-tabpanel-${index}`}
      aria-labelledby={`meetings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function MeetingsPage({ membershipData, userRole }) {
  const [tabValue, setTabValue] = useState(0);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const mockMeetings = [
    {
      id: 1,
      date: '2024-12-15',
      type: 'Regular',
      attended: null,
      status: 'Upcoming',
      hasAttendanceSession: false,
      location: 'Community Center'
    },
    {
      id: 2,
      date: '2024-12-08',
      type: 'Regular',
      attended: true,
      status: 'Completed',
      hasAttendanceSession: true,
      location: 'Community Center',
      attendanceRate: 92
    },
    {
      id: 3,
      date: '2024-12-01',
      type: 'Regular',
      attended: true,
      status: 'Completed',
      hasAttendanceSession: true,
      location: 'Community Center',
      attendanceRate: 88
    },
    {
      id: 4,
      date: '2024-11-24',
      type: 'Regular',
      attended: false,
      status: 'Completed',
      hasAttendanceSession: true,
      location: 'Community Center',
      attendanceRate: 96
    },
  ];

  // Mock attendance data for current session
  const mockAttendanceData = {
    currentSession: {
      id: 1,
      meetingId: 1,
      sessionCode: "ABC123",
      isActive: true,
      totalExpected: 25,
      totalCheckedIn: 18,
      checkInOpens: "2024-12-20T13:30:00",
      checkInCloses: "2024-12-20T14:15:00",
      requiresLocation: true,
      requiresPhoto: true,
    },
    attendanceRecords: [
      {
        id: 1,
        memberName: "Sarah Nakato",
        memberId: 1,
        checkInTime: "2024-12-20T14:02:00",
        status: "PRESENT",
        method: "QR_CODE",
        participationScore: 8.5,
        avatar: "/api/placeholder/40/40"
      },
      {
        id: 2,
        memberName: "John Mukasa",
        memberId: 2,
        checkInTime: "2024-12-20T14:05:00",
        status: "LATE",
        method: "MANUAL",
        participationScore: 7.2,
        avatar: "/api/placeholder/40/40"
      },
      {
        id: 3,
        memberName: "Grace Namuli",
        memberId: 3,
        checkInTime: null,
        status: "ABSENT",
        method: null,
        participationScore: 0,
        avatar: "/api/placeholder/40/40"
      },
    ]
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCreateSession = () => {
    setSessionDialogOpen(true);
  };

  const handleCheckInMember = (member) => {
    setSelectedMember(member);
    setCheckInDialogOpen(true);
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

  const getMethodIcon = (method) => {
    switch (method) {
      case 'QR_CODE': return <QrCode />;
      case 'GPS_AUTO': return <LocationOn />;
      case 'PHOTO': return <Person />;
      case 'MANUAL': return <Person />;
      default: return <Person />;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          Meetings & Attendance
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateSession}
        >
          Create Attendance Session
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Meeting History" icon={<Schedule />} />
        <Tab label="Current Session" icon={<EventAvailable />} />
        <Tab label="Attendance Records" icon={<Person />} />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        {/* Meeting History */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Meeting History</Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Your Attendance</TableCell>
                    <TableCell>Attendance Rate</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockMeetings.map((meeting) => (
                    <TableRow key={meeting.id}>
                      <TableCell>
                        {new Date(meeting.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip label={meeting.type} size="small" />
                      </TableCell>
                      <TableCell>{meeting.location}</TableCell>
                      <TableCell>
                        <Chip
                          label={meeting.status}
                          color={meeting.status === 'Upcoming' ? 'info' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            meeting.status === 'Upcoming'
                              ? 'Upcoming'
                              : meeting.attended
                                ? 'Attended'
                                : 'Absent'
                          }
                          color={
                            meeting.status === 'Upcoming'
                              ? 'info'
                              : meeting.attended
                                ? 'success'
                                : 'error'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {meeting.attendanceRate && (
                          <Typography variant="body2">
                            {meeting.attendanceRate}%
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                        {meeting.status === 'Upcoming' && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={handleCreateSession}
                            sx={{ ml: 1 }}
                          >
                            Manage Attendance
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Current Session */}
        {mockAttendanceData.currentSession ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Session Details
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText
                        primary="Session Code"
                        secondary={mockAttendanceData.currentSession.sessionCode}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Status"
                        secondary={
                          <Chip
                            label={mockAttendanceData.currentSession.isActive ? "Active" : "Closed"}
                            color={mockAttendanceData.currentSession.isActive ? "success" : "default"}
                            size="small"
                          />
                        }
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Check-in Window"
                        secondary={`${new Date(mockAttendanceData.currentSession.checkInOpens).toLocaleTimeString()} - ${new Date(mockAttendanceData.currentSession.checkInCloses).toLocaleTimeString()}`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Attendance Rate"
                        secondary={`${mockAttendanceData.currentSession.totalCheckedIn}/${mockAttendanceData.currentSession.totalExpected} (${Math.round((mockAttendanceData.currentSession.totalCheckedIn / mockAttendanceData.currentSession.totalExpected) * 100)}%)`}
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
                    Quick Check-In
                  </Typography>
                  <Grid container spacing={2}>
                    {mockAttendanceData.attendanceRecords
                      .filter(record => record.status === 'ABSENT')
                      .map((member) => (
                        <Grid item xs={12} sm={6} md={4} key={member.id}>
                          <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                              <Avatar
                                src={member.avatar}
                                sx={{ width: 48, height: 48, mx: 'auto', mb: 1 }}
                              >
                                {member.memberName.charAt(0)}
                              </Avatar>
                              <Typography variant="body2" gutterBottom>
                                {member.memberName}
                              </Typography>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => handleCheckInMember(member)}
                              >
                                Check In
                              </Button>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Alert severity="info">
            No active attendance session. Create a new session to start tracking attendance.
          </Alert>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Attendance Records */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Attendance
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Member</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Check-in Time</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Participation</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockAttendanceData.attendanceRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar src={record.avatar} sx={{ width: 32, height: 32 }}>
                            {record.memberName.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {record.memberName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={record.status}
                          color={getStatusColor(record.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {record.checkInTime
                          ? new Date(record.checkInTime).toLocaleTimeString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {record.method && (
                          <Box display="flex" alignItems="center" gap={1}>
                            {getMethodIcon(record.method)}
                            <Typography variant="caption">
                              {record.method.replace('_', ' ')}
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.participationScore > 0 && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">
                              {record.participationScore}/10
                            </Typography>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Create Session Dialog */}
      <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Attendance Session</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Meeting Location"
                placeholder="Community Center, Main Hall"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Check-in Opens"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Check-in Closes"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Verification Requirements</InputLabel>
                <Select multiple label="Verification Requirements">
                  <MenuItem value="location">Location Verification</MenuItem>
                  <MenuItem value="photo">Photo Verification</MenuItem>
                  <MenuItem value="qr">QR Code</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Create Session</Button>
        </DialogActions>
      </Dialog>

      {/* Check-in Dialog */}
      <Dialog open={checkInDialogOpen} onClose={() => setCheckInDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manual Check-in</DialogTitle>
        <DialogContent>
          {selectedMember && (
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar src={selectedMember.avatar} sx={{ width: 48, height: 48 }}>
                  {selectedMember.memberName.charAt(0)}
                </Avatar>
                <Typography variant="h6">
                  {selectedMember.memberName}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Attendance Status</InputLabel>
                    <Select label="Attendance Status" defaultValue="PRESENT">
                      <MenuItem value="PRESENT">Present</MenuItem>
                      <MenuItem value="LATE">Late</MenuItem>
                      <MenuItem value="EXCUSED">Excused</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes (Optional)"
                    multiline
                    rows={3}
                    placeholder="Any additional notes about attendance..."
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckInDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Check In</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}