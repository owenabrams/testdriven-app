import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  LinearProgress,
  Grid,
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
  Alert,
  Collapse
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  CheckCircle,
  Schedule,
  People,
  AttachMoney,
  AttachFile,
  ExpandMore,
  ExpandLess,
  Upload
} from '@mui/icons-material';
import { apiClient } from '../../services/api';

const ACTIVITY_TYPES = {
  'PERSONAL_SAVINGS': { label: 'Personal Savings Collection', icon: <AttachMoney />, color: 'primary' },
  'ECD_FUND': { label: 'ECD Fund Collection', icon: <AttachMoney />, color: 'secondary' },
  'SOCIAL_FUND': { label: 'Social Fund Collection', icon: <AttachMoney />, color: 'info' },
  'TARGET_SAVINGS': { label: 'Target Savings Collection', icon: <AttachMoney />, color: 'success' },
  'LOAN_APPLICATION': { label: 'Loan Applications Review', icon: <People />, color: 'warning' },
  'LOAN_DISBURSEMENT': { label: 'Loan Disbursement', icon: <AttachMoney />, color: 'warning' },
  'LOAN_REPAYMENT': { label: 'Loan Repayments', icon: <AttachMoney />, color: 'success' },
  'FINES': { label: 'Fines & Penalties', icon: <AttachMoney />, color: 'error' },
  'ATTENDANCE': { label: 'Attendance Recording', icon: <People />, color: 'info' },
  'MINUTES_REVIEW': { label: 'Previous Minutes Review', icon: <Schedule />, color: 'default' },
  'AOB': { label: 'Any Other Business', icon: <Schedule />, color: 'default' }
};

export default function ActivityTracker({ meetingId, activities, onActivityUpdate, userRole }) {
  const [activeStep, setActiveStep] = useState(0);
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [completionData, setCompletionData] = useState({
    outcome_notes: '',
    challenges_faced: '',
    success_factors: ''
  });
  const [loading, setLoading] = useState(false);

  // Find current active activity
  useEffect(() => {
    const inProgressIndex = activities.findIndex(activity => activity.status === 'IN_PROGRESS');
    if (inProgressIndex !== -1) {
      setActiveStep(inProgressIndex);
    } else {
      const nextPendingIndex = activities.findIndex(activity => activity.status === 'PENDING');
      if (nextPendingIndex !== -1) {
        setActiveStep(nextPendingIndex);
      }
    }
  }, [activities]);

  const handleStartActivity = async (activityId) => {
    setLoading(true);
    try {
      const response = await apiClient.post(`/activities/${activityId}/start`);
      if (response.data.status === 'success') {
        onActivityUpdate();
      }
    } catch (error) {
      console.error('Error starting activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActivity = (activity) => {
    setSelectedActivity(activity);
    setCompleteDialogOpen(true);
  };

  const handleCompleteSubmit = async () => {
    if (!selectedActivity) return;
    
    setLoading(true);
    try {
      const response = await apiClient.post(`/activities/${selectedActivity.id}/complete`, completionData);
      if (response.data.status === 'success') {
        setCompleteDialogOpen(false);
        setCompletionData({ outcome_notes: '', challenges_faced: '', success_factors: '' });
        onActivityUpdate();
      }
    } catch (error) {
      console.error('Error completing activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityProgress = (activity) => {
    if (activity.status === 'COMPLETED') return 100;
    if (activity.status === 'IN_PROGRESS') {
      const participationRate = activity.outcomes?.participation_rate || 0;
      return Math.max(10, participationRate); // At least 10% when in progress
    }
    return 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'warning';
      case 'PENDING': return 'default';
      case 'SKIPPED': return 'error';
      default: return 'default';
    }
  };

  const canStartActivity = (activity, index) => {
    if (userRole !== 'chairperson' && userRole !== 'admin') return false;
    if (activity.status !== 'PENDING') return false;
    
    // Can start if it's the first activity or previous activity is completed
    if (index === 0) return true;
    return activities[index - 1]?.status === 'COMPLETED';
  };

  const canCompleteActivity = (activity) => {
    return (userRole === 'chairperson' || userRole === 'admin') && 
           activity.status === 'IN_PROGRESS';
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Meeting Activities Progress
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {activities.filter(a => a.status === 'COMPLETED').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {activities.filter(a => a.status === 'IN_PROGRESS').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="text.secondary">
                    {activities.filter(a => a.status === 'PENDING').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {Math.round((activities.filter(a => a.status === 'COMPLETED').length / activities.length) * 100)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Overall Progress
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Stepper activeStep={activeStep} orientation="vertical">
            {activities.map((activity, index) => {
              const activityType = ACTIVITY_TYPES[activity.activity_type] || ACTIVITY_TYPES['AOB'];
              const progress = getActivityProgress(activity);
              
              return (
                <Step key={activity.id}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: activity.status === 'COMPLETED' ? 'success.main' : 
                                 activity.status === 'IN_PROGRESS' ? 'warning.main' : 'grey.300',
                          color: 'white'
                        }}
                      >
                        {activity.status === 'COMPLETED' ? <CheckCircle /> : activityType.icon}
                      </Box>
                    )}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle1">
                        {activity.activity_name}
                      </Typography>
                      <Chip 
                        label={activity.status} 
                        size="small" 
                        color={getStatusColor(activity.status)}
                      />
                      {activity.has_attachments && (
                        <Chip 
                          icon={<AttachFile />} 
                          label={activity.attachment_count} 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </StepLabel>
                  
                  <StepContent>
                    <Box sx={{ mb: 2 }}>
                      {progress > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={progress} 
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {progress.toFixed(1)}% Complete
                          </Typography>
                        </Box>
                      )}
                      
                      {activity.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {activity.description}
                        </Typography>
                      )}
                      
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {canStartActivity(activity, index) && (
                          <Button
                            variant="contained"
                            startIcon={<PlayArrow />}
                            onClick={() => handleStartActivity(activity.id)}
                            disabled={loading}
                            size="small"
                          >
                            Start Activity
                          </Button>
                        )}
                        
                        {canCompleteActivity(activity) && (
                          <Button
                            variant="contained"
                            color="success"
                            startIcon={<CheckCircle />}
                            onClick={() => handleCompleteActivity(activity)}
                            disabled={loading}
                            size="small"
                          >
                            Complete Activity
                          </Button>
                        )}
                        
                        <Button
                          variant="outlined"
                          startIcon={expandedActivity === activity.id ? <ExpandLess /> : <ExpandMore />}
                          onClick={() => setExpandedActivity(
                            expandedActivity === activity.id ? null : activity.id
                          )}
                          size="small"
                        >
                          {expandedActivity === activity.id ? 'Less' : 'More'} Details
                        </Button>
                      </Box>
                      
                      <Collapse in={expandedActivity === activity.id}>
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                Responsible Member
                              </Typography>
                              <Typography variant="body1">
                                {activity.responsible_member || 'Not assigned'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">
                                Expected Participants
                              </Typography>
                              <Typography variant="body1">
                                {activity.outcomes?.members_expected || 0} members
                              </Typography>
                            </Grid>
                            {activity.outcomes?.total_amount > 0 && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                  Total Amount
                                </Typography>
                                <Typography variant="body1">
                                  UGX {activity.outcomes.total_amount.toLocaleString()}
                                </Typography>
                              </Grid>
                            )}
                            {activity.timing?.duration_minutes && (
                              <Grid item xs={12} sm={6}>
                                <Typography variant="body2" color="text.secondary">
                                  Duration
                                </Typography>
                                <Typography variant="body1">
                                  {activity.timing.duration_minutes} minutes
                                </Typography>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </Collapse>
                    </Box>
                  </StepContent>
                </Step>
              );
            })}
          </Stepper>
        </CardContent>
      </Card>

      {/* Complete Activity Dialog */}
      <Dialog open={completeDialogOpen} onClose={() => setCompleteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Complete Activity: {selectedActivity?.activity_name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Outcome Notes"
              value={completionData.outcome_notes}
              onChange={(e) => setCompletionData(prev => ({ ...prev, outcome_notes: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Challenges Faced (Optional)"
              value={completionData.challenges_faced}
              onChange={(e) => setCompletionData(prev => ({ ...prev, challenges_faced: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Success Factors (Optional)"
              value={completionData.success_factors}
              onChange={(e) => setCompletionData(prev => ({ ...prev, success_factors: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCompleteSubmit} 
            variant="contained" 
            disabled={loading || !completionData.outcome_notes.trim()}
          >
            Complete Activity
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
