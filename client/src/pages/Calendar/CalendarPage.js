import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  ViewModule,
  ViewWeek,
  FilterList,
  Event,
  Group,
  AttachMoney,
  Assignment,
  Campaign,
  Close,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { calendarAPI } from '../../services/api';
import EventDetailsModal from '../../components/Calendar/EventDetailsModal';
import CalendarEventCard from '../../components/Calendar/CalendarEventCard';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from 'date-fns';

const EVENT_TYPES = {
  MEETING: { color: 'primary', icon: Event, label: 'Meeting' },
  TRANSACTION: { color: 'success', icon: AttachMoney, label: 'Transaction' },
  LOAN: { color: 'warning', icon: Assignment, label: 'Loan' },
  CAMPAIGN: { color: 'secondary', icon: Campaign, label: 'Campaign' },
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    eventTypes: {
      MEETING: true,
      TRANSACTION: true,
      LOAN: true,
      CAMPAIGN: true,
    },
    groups: 'all',
    dateRange: 'current',
  });

  // Fetch calendar events
  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['calendar-events', currentDate, filters],
    queryFn: () => calendarAPI.getEvents({
      start_date: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
      end_date: format(endOfMonth(currentDate), 'yyyy-MM-dd'),
      event_types: Object.keys(filters.eventTypes).filter(type => filters.eventTypes[type]).join(','),
      group_id: filters.groups !== 'all' ? filters.groups : undefined,
    }),
    select: (response) => response.data?.events || [],
  });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = viewMode === 'month' 
      ? startOfWeek(startOfMonth(currentDate))
      : startOfWeek(currentDate);
    const end = viewMode === 'month'
      ? endOfWeek(endOfMonth(currentDate))
      : endOfWeek(currentDate);
    
    return eachDayOfInterval({ start, end });
  }, [currentDate, viewMode]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    if (!eventsData) return {};
    
    return eventsData.reduce((acc, event) => {
      const dateKey = format(parseISO(event.event_date), 'yyyy-MM-dd');
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    }, {});
  }, [eventsData]);

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEventDetailsOpen(true);
  };

  // Circular Navigation Handlers
  const handleMemberClick = (memberId) => {
    navigate(`/members/${memberId}`);
  };

  const handleGroupClick = (groupId) => {
    navigate(`/groups/${groupId}`);
  };

  const handleMeetingClick = (meetingId) => {
    console.log('🔍 CalendarPage handleMeetingClick called with meetingId:', meetingId);
    if (meetingId && meetingId !== 'undefined' && meetingId !== 'null') {
      navigate(`/meetings/${meetingId}`);
    } else {
      console.warn('⚠️ Invalid meetingId provided to handleMeetingClick:', meetingId);
    }
  };

  const handleTransactionClick = (transactionId) => {
    // Navigate to transaction details - could be in loans or transactions page
    console.log('Navigate to transaction:', transactionId);
  };

  const handleActivityClick = (activityId) => {
    // Navigate to activity details
    console.log('Navigate to activity:', activityId);
  };

  const handleDocumentClick = (documentId) => {
    // Open document viewer
    console.log('View document:', documentId);
  };

  const handleDateNavigation = (direction) => {
    if (direction === 'prev') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (direction === 'next') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(new Date());
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const getEventsForDay = (day) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  };

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load calendar events. Please try again.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            📅 Calendar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage all group activities and events
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => setFiltersOpen(true)}
          >
            Filters
          </Button>
          <Button
            variant={viewMode === 'month' ? 'contained' : 'outlined'}
            startIcon={<ViewModule />}
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
          <Button
            variant={viewMode === 'week' ? 'contained' : 'outlined'}
            startIcon={<ViewWeek />}
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
        </Box>
      </Box>

      {/* Navigation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => handleDateNavigation('prev')}>
                <ChevronLeft />
              </IconButton>
              <Typography variant="h5">
                {format(currentDate, 'MMMM yyyy')}
              </Typography>
              <IconButton onClick={() => handleDateNavigation('next')}>
                <ChevronRight />
              </IconButton>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Today />}
              onClick={() => handleDateNavigation('today')}
            >
              Today
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent>
          <Grid container spacing={1}>
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Grid item xs={12/7} key={day}>
                <Typography
                  variant="subtitle2"
                  align="center"
                  sx={{ py: 1, fontWeight: 'bold', color: 'text.secondary' }}
                >
                  {day}
                </Typography>
              </Grid>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              
              return (
                <Grid item xs={12/7} key={day.toString()}>
                  <Box
                    sx={{
                      minHeight: 120,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      backgroundColor: isCurrentMonth ? 'background.paper' : 'action.hover',
                      position: 'relative',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isToday ? 'bold' : 'normal',
                        color: isToday ? 'primary.main' : isCurrentMonth ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      {format(day, 'd')}
                    </Typography>
                    
                    {/* Events for this day */}
                    <Box sx={{ mt: 1 }}>
                      {dayEvents.slice(0, 3).map((event) => (
                        <Tooltip key={event.id} title={event.title}>
                          <Box sx={{ mb: 0.5 }}>
                            <CalendarEventCard
                              event={event}
                              onClick={handleEventClick}
                              onMemberClick={handleMemberClick}
                              onGroupClick={handleGroupClick}
                              compact={true}
                            />
                          </Box>
                        </Tooltip>
                      ))}

                      {dayEvents.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{dayEvents.length - 3} more
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <EventDetailsModal
        open={eventDetailsOpen}
        onClose={() => setEventDetailsOpen(false)}
        event={selectedEvent}
        onMemberClick={handleMemberClick}
        onGroupClick={handleGroupClick}
        onMeetingClick={handleMeetingClick}
        onTransactionClick={handleTransactionClick}
        onActivityClick={handleActivityClick}
        onDocumentClick={handleDocumentClick}
      />

      {/* Filters Dialog */}
      <Dialog open={filtersOpen} onClose={() => setFiltersOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Calendar Filters
          <IconButton
            onClick={() => setFiltersOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Event Types
            </Typography>
            {Object.entries(EVENT_TYPES).map(([type, config]) => (
              <FormControlLabel
                key={type}
                control={
                  <Switch
                    checked={filters.eventTypes[type]}
                    onChange={(e) => handleFilterChange('eventTypes', {
                      ...filters.eventTypes,
                      [type]: e.target.checked,
                    })}
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <config.icon fontSize="small" />
                    {config.label}
                  </Box>
                }
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFiltersOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
