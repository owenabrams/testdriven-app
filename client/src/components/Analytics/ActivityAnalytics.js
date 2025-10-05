import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  DatePicker,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  People,
  Schedule,
  CheckCircle,
  Assessment
} from '@mui/icons-material';
import { apiClient } from '../../services/api';

const ACTIVITY_TYPE_LABELS = {
  'PERSONAL_SAVINGS': 'Personal Savings',
  'ECD_FUND': 'ECD Fund',
  'SOCIAL_FUND': 'Social Fund',
  'TARGET_SAVINGS': 'Target Savings',
  'LOAN_APPLICATION': 'Loan Applications',
  'LOAN_DISBURSEMENT': 'Loan Disbursement',
  'LOAN_REPAYMENT': 'Loan Repayments',
  'FINES': 'Fines & Penalties',
  'ATTENDANCE': 'Attendance',
  'MINUTES_REVIEW': 'Minutes Review',
  'AOB': 'Any Other Business'
};

export default function ActivityAnalytics({ groupId, timeRange = '3months' }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  useEffect(() => {
    if (groupId) {
      fetchAnalytics();
    }
  }, [groupId, selectedTimeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(`/groups/${groupId}/activities/analytics`, {
        params: { time_range: selectedTimeRange }
      });
      if (response.data.status === 'success') {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompletionRateColor = (rate) => {
    if (rate >= 90) return 'success';
    if (rate >= 70) return 'warning';
    return 'error';
  };

  const getTrendIcon = (trend) => {
    return trend > 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Activity Analytics</Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Alert severity="info">
        No activity data available for the selected time period.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Time Range Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Activity Analytics Dashboard</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                label="Time Range"
              >
                <MenuItem value="1month">Last Month</MenuItem>
                <MenuItem value="3months">Last 3 Months</MenuItem>
                <MenuItem value="6months">Last 6 Months</MenuItem>
                <MenuItem value="1year">Last Year</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Meetings
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {analytics.overview.total_meetings}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTrendIcon(analytics.overview.meetings_trend)}
                    <Typography variant="body2" color="text.secondary">
                      {Math.abs(analytics.overview.meetings_trend)}% vs prev period
                    </Typography>
                  </Box>
                </Box>
                <Assessment color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Activities
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {analytics.overview.total_activities}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTrendIcon(analytics.overview.activities_trend)}
                    <Typography variant="body2" color="text.secondary">
                      {Math.abs(analytics.overview.activities_trend)}% vs prev period
                    </Typography>
                  </Box>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Completion Rate
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    {analytics.overview.completion_rate.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={analytics.overview.completion_rate} 
                    color={getCompletionRateColor(analytics.overview.completion_rate)}
                    sx={{ mt: 1 }}
                  />
                </Box>
                <TrendingUp color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="body2">
                    Total Amount
                  </Typography>
                  <Typography variant="h4" component="div" fontWeight="bold">
                    UGX {(analytics.overview.total_amount / 1000000).toFixed(1)}M
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTrendIcon(analytics.overview.amount_trend)}
                    <Typography variant="body2" color="text.secondary">
                      {Math.abs(analytics.overview.amount_trend)}% vs prev period
                    </Typography>
                  </Box>
                </Box>
                <AttachMoney color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Activity Type Performance */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Activity Type Performance
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Activity Type</TableCell>
                  <TableCell align="right">Total Count</TableCell>
                  <TableCell align="right">Completion Rate</TableCell>
                  <TableCell align="right">Avg Participation</TableCell>
                  <TableCell align="right">Total Amount</TableCell>
                  <TableCell align="right">Avg Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analytics.activity_types.map((activityType) => (
                  <TableRow key={activityType.activity_type}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {ACTIVITY_TYPE_LABELS[activityType.activity_type] || activityType.activity_type}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography variant="body2">
                        {activityType.total_count}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                        <Typography variant="body2">
                          {activityType.completion_rate.toFixed(1)}%
                        </Typography>
                        <Chip 
                          label={activityType.completion_rate >= 80 ? 'Good' : 'Needs Improvement'}
                          color={activityType.completion_rate >= 80 ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography variant="body2">
                        {activityType.avg_participation.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        UGX {activityType.total_amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography variant="body2">
                        {activityType.avg_duration} min
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Member Participation Patterns */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Top Performing Members
          </Typography>
          
          <Grid container spacing={2}>
            {analytics.top_members.slice(0, 6).map((member, index) => (
              <Grid item xs={12} sm={6} md={4} key={member.member_id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: index < 3 ? 'gold' : 'grey.300',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      >
                        #{index + 1}
                      </Box>
                      <Box flex={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {member.member_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {member.participation_rate.toFixed(1)}% participation
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Avg Score: {member.avg_score.toFixed(1)}/10
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Financial Summary by Activity */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Financial Impact by Activity Type
          </Typography>
          
          <Grid container spacing={2}>
            {analytics.financial_summary.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.activity_type}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {ACTIVITY_TYPE_LABELS[item.activity_type] || item.activity_type}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="primary">
                      UGX {item.total_amount.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.transaction_count} transactions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg: UGX {(item.total_amount / item.transaction_count).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
