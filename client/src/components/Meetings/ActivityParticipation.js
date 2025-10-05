import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Avatar,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress
} from '@mui/material';
import {
  Edit,
  CheckCircle,
  Cancel,
  Schedule,
  AttachMoney,
  Person,
  Star,
  Upload
} from '@mui/icons-material';
import { apiClient } from '../../services/api';

const PARTICIPATION_TYPES = {
  'CONTRIBUTED': { label: 'Contributed', color: 'success', icon: <AttachMoney /> },
  'RECEIVED': { label: 'Received', color: 'info', icon: <AttachMoney /> },
  'VOTED': { label: 'Voted', color: 'primary', icon: <CheckCircle /> },
  'DISCUSSED': { label: 'Discussed', color: 'secondary', icon: <Person /> },
  'ATTENDED': { label: 'Attended', color: 'success', icon: <CheckCircle /> },
  'LATE': { label: 'Late', color: 'warning', icon: <Schedule /> },
  'ABSENT': { label: 'Absent', color: 'error', icon: <Cancel /> }
};

const STATUS_COLORS = {
  'COMPLETED': 'success',
  'PENDING': 'warning',
  'PARTIAL': 'info',
  'SKIPPED': 'error'
};

export default function ActivityParticipation({ activityId, activityType, userRole, onUpdate }) {
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedParticipation, setSelectedParticipation] = useState(null);
  const [editData, setEditData] = useState({
    participation_type: '',
    amount: '',
    status: '',
    notes: '',
    challenges: ''
  });
  const [summary, setSummary] = useState({
    total_members: 0,
    completed: 0,
    pending: 0,
    total_amount: 0
  });

  useEffect(() => {
    if (activityId) {
      fetchParticipations();
    }
  }, [activityId]);

  const fetchParticipations = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/activities/${activityId}/participation`);
      if (response.data.status === 'success') {
        setParticipations(response.data.data.participations);
        setSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error('Error fetching participations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditParticipation = (participation) => {
    setSelectedParticipation(participation);
    setEditData({
      participation_type: participation.participation_type,
      amount: participation.amount.toString(),
      status: participation.status,
      notes: participation.notes || '',
      challenges: participation.challenges || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveParticipation = async () => {
    if (!selectedParticipation) return;

    try {
      const response = await apiClient.put(
        `/activities/${activityId}/participation/${selectedParticipation.member.id}`,
        {
          ...editData,
          amount: parseFloat(editData.amount) || 0
        }
      );
      
      if (response.data.status === 'success') {
        setEditDialogOpen(false);
        fetchParticipations();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Error updating participation:', error);
    }
  };

  const getEngagementColor = (level) => {
    switch (level) {
      case 'EXCELLENT': return 'success';
      case 'HIGH': return 'info';
      case 'MODERATE': return 'warning';
      case 'LOW': return 'error';
      default: return 'default';
    }
  };

  const getParticipationRate = () => {
    if (summary.total_members === 0) return 0;
    return (summary.completed / summary.total_members) * 100;
  };

  const canEditParticipation = () => {
    return userRole === 'chairperson' || userRole === 'secretary' || userRole === 'admin';
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Member Participation</Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Member Participation Summary
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {summary.total_members}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Members
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {summary.completed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Participated
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning.main">
                  {summary.pending}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="text.primary">
                  {getParticipationRate().toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Participation Rate
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {summary.total_amount > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Total Amount Collected: UGX {summary.total_amount.toLocaleString()}
            </Alert>
          )}

          <LinearProgress 
            variant="determinate" 
            value={getParticipationRate()} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Individual Member Participation
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Participation Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Engagement</TableCell>
                  <TableCell>Score</TableCell>
                  {canEditParticipation() && <TableCell align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {participations.map((participation) => {
                  const participationType = PARTICIPATION_TYPES[participation.participation_type] || 
                                          PARTICIPATION_TYPES['ATTENDED'];
                  
                  return (
                    <TableRow key={participation.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ width: 32, height: 32 }}>
                            {participation.member.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2">
                            {participation.member.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          icon={participationType.icon}
                          label={participationType.label}
                          color={participationType.color}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell align="right">
                        {participation.amount > 0 ? (
                          <Typography variant="body2" fontWeight="bold">
                            UGX {participation.amount.toLocaleString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={participation.status}
                          color={STATUS_COLORS[participation.status]}
                          size="small"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={participation.quality_metrics.engagement_level}
                          color={getEngagementColor(participation.quality_metrics.engagement_level)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Star 
                            sx={{ 
                              color: participation.quality_metrics.participation_score >= 7 ? 'gold' : 'grey.400',
                              fontSize: 16 
                            }} 
                          />
                          <Typography variant="body2">
                            {participation.quality_metrics.participation_score.toFixed(1)}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      {canEditParticipation() && (
                        <TableCell align="right">
                          <Tooltip title="Edit Participation">
                            <IconButton 
                              size="small" 
                              onClick={() => handleEditParticipation(participation)}
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Edit Participation Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Participation: {selectedParticipation?.member.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Participation Type</InputLabel>
              <Select
                value={editData.participation_type}
                onChange={(e) => setEditData(prev => ({ ...prev, participation_type: e.target.value }))}
                label="Participation Type"
              >
                {Object.entries(PARTICIPATION_TYPES).map(([key, value]) => (
                  <MenuItem key={key} value={key}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {value.icon}
                      {value.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label="Amount (UGX)"
              value={editData.amount}
              onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
              sx={{ mb: 2 }}
              inputProps={{ min: 0, step: 100 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={editData.status}
                onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                <MenuItem value="PENDING">Pending</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="PARTIAL">Partial</MenuItem>
                <MenuItem value="SKIPPED">Skipped</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Notes"
              value={editData.notes}
              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Challenges"
              value={editData.challenges}
              onChange={(e) => setEditData(prev => ({ ...prev, challenges: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveParticipation} 
            variant="contained"
            disabled={!editData.participation_type}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
