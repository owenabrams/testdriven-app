import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  AccountBalance as AccountBalanceIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';

const EventDetailsModal = ({ open, onClose, event, onMemberClick, onTransactionClick, onGroupClick }) => {
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    members: false,
    transactions: false,
    context: false
  });

  if (!event) return null;

  const handleSectionToggle = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getEventIcon = (eventType) => {
    const icons = {
      TRANSACTION: '💰',
      MEETING: '👥',
      LOAN: '🏦',
      CAMPAIGN: '🎯',
      FINE: '⚠️'
    };
    return icons[eventType] || '📅';
  };

  const getEventColor = (eventType) => {
    const colors = {
      TRANSACTION: '#4caf50',
      MEETING: '#2196f3',
      LOAN: '#ff9800',
      CAMPAIGN: '#9c27b0',
      FINE: '#f44336'
    };
    return colors[eventType] || '#757575';
  };

  const renderTransactionDetails = () => {
    if (event.event_type !== 'TRANSACTION' || !event.additional_details?.member_details) return null;

    const { member_details, transaction_type, fund_type, balance_before, balance_after } = event.additional_details;

    return (
      <Accordion expanded={expandedSections.details} onChange={() => handleSectionToggle('details')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">💰 Transaction Details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ bgcolor: getEventColor(event.event_type), mr: 2 }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" 
                        sx={{ cursor: 'pointer', color: 'primary.main' }}
                        onClick={() => onMemberClick && onMemberClick(member_details.id)}
                      >
                        {member_details.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {member_details.role} • {member_details.gender === 'F' ? '👩' : '👨'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography><strong>Phone:</strong> {member_details.phone}</Typography>
                  <Typography><strong>Total Savings:</strong> {member_details.total_savings?.toLocaleString()} UGX</Typography>
                  <Typography><strong>Transaction Type:</strong> {transaction_type}</Typography>
                  <Typography><strong>Fund Type:</strong> {fund_type}</Typography>
                  
                  {balance_before !== null && (
                    <Typography><strong>Balance Before:</strong> {balance_before?.toLocaleString()} UGX</Typography>
                  )}
                  {balance_after !== null && (
                    <Typography><strong>Balance After:</strong> {balance_after?.toLocaleString()} UGX</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Recent Transactions</Typography>
              <List dense>
                {member_details.recent_transactions?.slice(0, 3).map((transaction, index) => (
                  <ListItem 
                    key={transaction.id}
                    button
                    onClick={() => onTransactionClick && onTransactionClick(transaction.id)}
                  >
                    <ListItemIcon>
                      <TrendingUpIcon color={transaction.transaction_type === 'DEPOSIT' ? 'success' : 'warning'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${transaction.amount.toLocaleString()} UGX`}
                      secondary={`${transaction.transaction_type} • ${transaction.transaction_date}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderMeetingDetails = () => {
    if (event.event_type !== 'MEETING' || !event.additional_details?.attendees) return null;

    const { attendees, absentees, attendance_rate, meeting_transactions, total_collected } = event.additional_details;

    return (
      <>
        <Accordion expanded={expandedSections.details} onChange={() => handleSectionToggle('details')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">👥 Meeting Overview</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" color="success.main">{attendees.length}</Typography>
                    <Typography variant="body2">Present</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" color="warning.main">{absentees.length}</Typography>
                    <Typography variant="body2">Absent</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" color="primary.main">{attendance_rate.toFixed(1)}%</Typography>
                    <Typography variant="body2">Attendance Rate</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedSections.members} onChange={() => handleSectionToggle('members')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">👥 Attendance ({attendees.length + absentees.length} members)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" color="success.main" gutterBottom>
                  ✅ Present ({attendees.length})
                </Typography>
                <List dense>
                  {attendees.map((member) => (
                    <ListItem 
                      key={member.id}
                      button
                      onClick={() => onMemberClick && onMemberClick(member.id)}
                    >
                      <ListItemIcon>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'success.light' }}>
                          {member.gender === 'F' ? '👩' : '👨'}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={member.name}
                        secondary={`${member.role} • ${member.attendance_time || 'On time'}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" color="warning.main" gutterBottom>
                  ❌ Absent ({absentees.length})
                </Typography>
                <List dense>
                  {absentees.map((member) => (
                    <ListItem 
                      key={member.id}
                      button
                      onClick={() => onMemberClick && onMemberClick(member.id)}
                    >
                      <ListItemIcon>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.light' }}>
                          {member.gender === 'F' ? '👩' : '👨'}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={member.name}
                        secondary={member.excuse_reason || 'No excuse provided'}
                      />
                    </ListItem>
                  ))}
                </List>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion expanded={expandedSections.transactions} onChange={() => handleSectionToggle('transactions')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">💰 Meeting Transactions ({meeting_transactions?.length || 0})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box mb={2}>
              <Typography variant="h6" color="success.main">
                Total Collected: {total_collected?.toLocaleString()} UGX
              </Typography>
            </Box>
            <List>
              {meeting_transactions?.map((transaction) => (
                <ListItem 
                  key={transaction.id}
                  button
                  onClick={() => onTransactionClick && onTransactionClick(transaction.id)}
                >
                  <ListItemIcon>
                    <AccountBalanceIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${transaction.member_name} - ${transaction.amount.toLocaleString()} UGX`}
                    secondary={`${transaction.transaction_type} • ${transaction.fund_type}`}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      </>
    );
  };

  const renderGroupContext = () => {
    if (!event.additional_details?.group_context) return null;

    const { group_context } = event.additional_details;

    return (
      <Accordion expanded={expandedSections.context} onChange={() => handleSectionToggle('context')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">🏘️ Group Context</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <GroupIcon />
                </Avatar>
                <Box>
                  <Typography 
                    variant="h6"
                    sx={{ cursor: 'pointer', color: 'primary.main' }}
                    onClick={() => onGroupClick && onGroupClick(group_context.id)}
                  >
                    {group_context.name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <LocationIcon fontSize="small" /> {group_context.location}
                  </Typography>
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography><strong>Total Members:</strong> {group_context.total_members}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography><strong>Total Savings:</strong> {group_context.total_savings?.toLocaleString()} UGX</Typography>
                </Grid>
                {group_context.formation_date && (
                  <Grid item xs={12}>
                    <Typography><strong>Formed:</strong> {new Date(group_context.formation_date).toLocaleDateString()}</Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h5">
              {getEventIcon(event.event_type)} {event.title}
            </Typography>
            <Chip 
              label={event.verification_status} 
              color={event.verification_status === 'VERIFIED' ? 'success' : 'warning'}
              size="small"
            />
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Box mt={1}>
          <Typography variant="body2" color="textSecondary">
            📅 {new Date(event.event_date).toLocaleDateString()} • 
            🏘️ {event.group_name} • 
            📍 {event.location || 'Location not specified'}
          </Typography>
          {event.amount && (
            <Typography variant="h6" color="primary.main" mt={1}>
              💰 {event.amount.toLocaleString()} UGX
            </Typography>
          )}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box mb={2}>
          <Typography variant="body1" color="textSecondary">
            {event.description}
          </Typography>
        </Box>

        {renderTransactionDetails()}
        {renderMeetingDetails()}
        {renderGroupContext()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventDetailsModal;
