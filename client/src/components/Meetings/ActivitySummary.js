import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert
} from '@mui/material';
import {
  AttachMoney,
  People,
  Schedule,
  CheckCircle,
  TrendingUp,
  AttachFile
} from '@mui/icons-material';

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

export default function ActivitySummary({ activities, meetingData }) {
  const getOverallStats = () => {
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.status === 'COMPLETED').length;
    const inProgressActivities = activities.filter(a => a.status === 'IN_PROGRESS').length;
    const totalAmount = activities.reduce((sum, a) => sum + (a.outcomes?.total_amount || 0), 0);
    const totalParticipants = activities.reduce((sum, a) => sum + (a.outcomes?.members_participated || 0), 0);
    const totalDuration = activities.reduce((sum, a) => sum + (a.timing?.duration_minutes || 0), 0);
    const documentsCount = activities.reduce((sum, a) => sum + (a.attachments?.attachment_count || 0), 0);

    return {
      totalActivities,
      completedActivities,
      inProgressActivities,
      completionRate: totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0,
      totalAmount,
      averageParticipation: totalActivities > 0 ? totalParticipants / totalActivities : 0,
      totalDuration,
      documentsCount
    };
  };

  const getFinancialSummary = () => {
    const savingsActivities = activities.filter(a => 
      ['PERSONAL_SAVINGS', 'ECD_FUND', 'SOCIAL_FUND', 'TARGET_SAVINGS'].includes(a.activity_type)
    );
    const loanActivities = activities.filter(a => 
      ['LOAN_DISBURSEMENT', 'LOAN_REPAYMENT'].includes(a.activity_type)
    );
    const fineActivities = activities.filter(a => a.activity_type === 'FINES');

    const totalSavings = savingsActivities.reduce((sum, a) => sum + (a.outcomes?.total_amount || 0), 0);
    const totalLoans = loanActivities.reduce((sum, a) => sum + (a.outcomes?.total_amount || 0), 0);
    const totalFines = fineActivities.reduce((sum, a) => sum + (a.outcomes?.total_amount || 0), 0);

    return { totalSavings, totalLoans, totalFines };
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

  const stats = getOverallStats();
  const financialSummary = getFinancialSummary();

  return (
    <Box>
      {/* Overall Statistics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Meeting Activity Summary
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {stats.totalActivities}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Activities
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="success.main">
                  {stats.completedActivities}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="warning.main">
                  {stats.inProgressActivities}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  In Progress
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="text.primary">
                  {stats.completionRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completion Rate
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Overall Progress
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={stats.completionRate} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <AttachMoney color="success" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    UGX {stats.totalAmount.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <Schedule color="info" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Duration
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {stats.totalDuration} min
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <People color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Participation
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {stats.averageParticipation.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box display="flex" alignItems="center" gap={1}>
                <AttachFile color="secondary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Documents
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {stats.documentsCount}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      {(financialSummary.totalSavings > 0 || financialSummary.totalLoans > 0 || financialSummary.totalFines > 0) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Financial Summary
            </Typography>
            
            <Grid container spacing={2}>
              {financialSummary.totalSavings > 0 && (
                <Grid item xs={12} sm={4}>
                  <Alert severity="success" sx={{ height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Savings Collected
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      UGX {financialSummary.totalSavings.toLocaleString()}
                    </Typography>
                  </Alert>
                </Grid>
              )}
              
              {financialSummary.totalLoans > 0 && (
                <Grid item xs={12} sm={4}>
                  <Alert severity="warning" sx={{ height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Loan Activity
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      UGX {financialSummary.totalLoans.toLocaleString()}
                    </Typography>
                  </Alert>
                </Grid>
              )}
              
              {financialSummary.totalFines > 0 && (
                <Grid item xs={12} sm={4}>
                  <Alert severity="error" sx={{ height: '100%' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Fines Collected
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      UGX {financialSummary.totalFines.toLocaleString()}
                    </Typography>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Activity Details Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Activity Details
          </Typography>
          
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Activity</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Participants</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Duration</TableCell>
                  <TableCell align="center">Documents</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {activity.activity_name}
                      </Typography>
                      {activity.responsible_member && (
                        <Typography variant="caption" color="text.secondary">
                          Led by: {activity.responsible_member}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Chip 
                        label={activity.status}
                        color={getStatusColor(activity.status)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell align="right">
                      {activity.outcomes?.members_participated || 0} / {activity.outcomes?.members_expected || 0}
                      {activity.outcomes?.participation_rate && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          ({activity.outcomes.participation_rate.toFixed(1)}%)
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell align="right">
                      {activity.outcomes?.total_amount > 0 ? (
                        <Typography variant="body2" fontWeight="bold">
                          UGX {activity.outcomes.total_amount.toLocaleString()}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell align="right">
                      {activity.timing?.duration_minutes ? (
                        <Typography variant="body2">
                          {activity.timing.duration_minutes} min
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell align="center">
                      {activity.attachments?.has_attachments ? (
                        <Chip 
                          icon={<AttachFile />}
                          label={activity.attachments.attachment_count}
                          size="small"
                          color="secondary"
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
