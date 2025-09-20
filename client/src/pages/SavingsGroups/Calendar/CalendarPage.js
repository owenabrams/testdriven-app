// client/src/pages/SavingsGroups/Calendar/CalendarPage.js

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Slider,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Badge,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Group as GroupIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay, isSameMonth } from 'date-fns';

import { savingsGroupsAPI } from '../../../services/api';
import EventDetailsModal from '../../../components/Calendar/EventDetailsModal';

const CalendarPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [filterOptions, setFilterOptions] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // day, week, month
  
  // Filter state
  const [filters, setFilters] = useState({
    time_period: 'this_month',
    start_date: null,
    end_date: null,
    region: 'ALL',
    district: 'ALL',
    parish: 'ALL',
    village: 'ALL',
    gender: 'ALL',
    roles: [],
    fund_types: ['PERSONAL', 'ECD', 'SOCIAL', 'TARGET'],
    event_types: ['TRANSACTION', 'MEETING', 'LOAN', 'CAMPAIGN'],
    amount_min: '',
    amount_max: '',
    verification_status: 'ALL',
    group_ids: []
  });
  
  const [filterSummary, setFilterSummary] = useState({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    loadFilterOptions();
    loadEvents();
  }, []);

  useEffect(() => {
    loadEvents();
  }, [filters, currentDate, viewMode]);

  useEffect(() => {
    updateActiveFilterCount();
  }, [filters]);

  const loadFilterOptions = async () => {
    try {
      const response = await savingsGroupsAPI.getFilterOptions();
      setFilterOptions(response.data || response);
    } catch (err) {
      console.log('API not available for filter options, using mock data:', err.message);
      // Fallback to mock data - create basic options
      const mockOptions = {
        time_periods: [
          { label: 'Today', value: 'today' },
          { label: 'This Week', value: 'this_week' },
          { label: 'This Month', value: 'this_month' },
          { label: 'Last Month', value: 'last_month' },
          { label: 'Custom Range', value: 'custom' }
        ],
        event_types: [
          { label: '💰 Transactions', value: 'TRANSACTION' },
          { label: '👥 Meetings', value: 'MEETING' },
          { label: '🏦 Loans', value: 'LOAN' },
          { label: '🎯 Campaigns', value: 'CAMPAIGN' },
          { label: '⚠️ Fines', value: 'FINE' }
        ],
        groups: [],
        regions: [],
        districts: [],
        parishes: [],
        villages: [],
        genders: [
          { label: 'All Genders', value: 'ALL' },
          { label: '👩 Women', value: 'F' },
          { label: '👨 Men', value: 'M' }
        ],
        roles: [
          { label: '👤 Member', value: 'MEMBER' },
          { label: '👤 Officer', value: 'OFFICER' }
        ],
        fund_types: [
          { label: '💰 Personal Savings', value: 'PERSONAL' },
          { label: '👶 ECD Fund', value: 'ECD' },
          { label: '🤝 Social Fund', value: 'SOCIAL' },
          { label: '🎯 Target Savings', value: 'TARGET' }
        ],
        verification_statuses: [
          { label: 'All Statuses', value: 'ALL' },
          { label: '⏳ Pending', value: 'PENDING' },
          { label: '✅ Verified', value: 'VERIFIED' },
          { label: '❌ Rejected', value: 'REJECTED' }
        ]
      };
      setFilterOptions(mockOptions);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Try to load from real API first
      try {
        // Build query parameters
        const params = new URLSearchParams();
        
        // Add date range based on view mode and current date
        if (filters.time_period === 'custom' && filters.start_date && filters.end_date) {
          params.append('start_date', format(filters.start_date, 'yyyy-MM-dd'));
          params.append('end_date', format(filters.end_date, 'yyyy-MM-dd'));
        } else if (filters.time_period !== 'custom') {
          params.append('time_period', filters.time_period);
        } else {
          // Default to current view range
          let startDate, endDate;
          if (viewMode === 'day') {
            startDate = endDate = currentDate;
          } else if (viewMode === 'week') {
            startDate = startOfWeek(currentDate);
            endDate = endOfWeek(currentDate);
          } else {
            startDate = startOfMonth(currentDate);
            endDate = endOfMonth(currentDate);
          }
          params.append('start_date', format(startDate, 'yyyy-MM-dd'));
          params.append('end_date', format(endDate, 'yyyy-MM-dd'));
        }
        
        // Add other filters
        Object.entries(filters).forEach(([key, value]) => {
          if (key === 'start_date' || key === 'end_date' || key === 'time_period') return;
          
          if (Array.isArray(value) && value.length > 0) {
            params.append(key, value.join(','));
          } else if (value && value !== 'ALL' && value !== '') {
            params.append(key, value);
          }
        });

        const response = await savingsGroupsAPI.getCalendarEvents(filters);
        setEvents(response.data?.events || []);
        setFilterSummary(response.data?.summary || {});
        setError(null);
      } catch (apiError) {
        console.error('Error fetching calendar events:', apiError.message);
        setError('Failed to load calendar events. Please try again.');
        setEvents([]);
        setFilterSummary({});
        
        // Apply filters
        if (filters.gender && filters.gender !== 'ALL') {
          filteredEvents = filteredEvents.filter(event => event.member_gender === filters.gender);
        }
        
        if (filters.fund_types && filters.fund_types.length > 0 && filters.fund_types.length < 4) {
          filteredEvents = filteredEvents.filter(event => 
            event.fund_type && filters.fund_types.includes(event.fund_type)
          );
        }
        
        if (filters.region && filters.region !== 'ALL') {
          filteredEvents = filteredEvents.filter(event => event.group_region === filters.region);
        }
        
        if (filters.event_types && filters.event_types.length > 0 && filters.event_types.length < 4) {
          filteredEvents = filteredEvents.filter(event => 
            filters.event_types.includes(event.event_type)
          );
        }
        
        // Apply time filtering
        if (filters.time_period === 'this_month') {
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();
          filteredEvents = filteredEvents.filter(event => {
            const eventDate = new Date(event.event_date);
            return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
          });
        }
        
        setEvents(filteredEvents);
        setFilterSummary({
          total_events: filteredEvents.length,
          total_amount: filteredEvents.reduce((sum, event) => sum + (event.amount || 0), 0),
          event_type_breakdown: filteredEvents.reduce((acc, event) => {
            acc[event.event_type] = (acc[event.event_type] || 0) + 1;
            return acc;
          }, {}),
          fund_type_breakdown: filteredEvents.reduce((acc, event) => {
            if (event.fund_type) {
              acc[event.fund_type] = (acc[event.fund_type] || 0) + 1;
            }
            return acc;
          }, {})
        });
        setError(null);
      }
    } catch (err) {
      setError('Failed to load calendar events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateActiveFilterCount = () => {
    let count = 0;
    
    if (filters.time_period !== 'this_month') count++;
    if (filters.region !== 'ALL') count++;
    if (filters.district !== 'ALL') count++;
    if (filters.parish !== 'ALL') count++;
    if (filters.village !== 'ALL') count++;
    if (filters.gender !== 'ALL') count++;
    if (filters.roles.length > 0) count++;
    if (filters.fund_types.length < 4) count++;
    if (filters.event_types.length < 4) count++;
    if (filters.amount_min || filters.amount_max) count++;
    if (filters.verification_status !== 'ALL') count++;
    if (filters.group_ids.length > 0) count++;
    
    setActiveFilterCount(count);
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const handleArrayFilterChange = (filterKey, value, checked) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: checked 
        ? [...prev[filterKey], value]
        : prev[filterKey].filter(item => item !== value)
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      time_period: 'this_month',
      start_date: null,
      end_date: null,
      region: 'ALL',
      district: 'ALL',
      parish: 'ALL',
      village: 'ALL',
      gender: 'ALL',
      roles: [],
      fund_types: ['PERSONAL', 'ECD', 'SOCIAL', 'TARGET'],
      event_types: ['TRANSACTION', 'MEETING', 'LOAN', 'CAMPAIGN'],
      amount_min: '',
      amount_max: '',
      verification_status: 'ALL',
      group_ids: []
    });
  };

  const handleEventClick = async (event) => {
    try {
      const response = await savingsGroupsAPI.getCalendarEventDetails(event.id);
      setSelectedEvent(response.data);
      setEventDetailsOpen(true);
    } catch (err) {
      console.error('Error loading event details:', err);
    }
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

  const renderCalendarGrid = () => {
    if (viewMode === 'day') {
      return renderDayView();
    } else if (viewMode === 'week') {
      return renderWeekView();
    } else {
      return renderMonthView();
    }
  };

  const renderDayView = () => {
    const dayEvents = events.filter(event => 
      isSameDay(new Date(event.event_date), currentDate)
    );

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </Typography>
        <Grid container spacing={2}>
          {dayEvents.map(event => (
            <Grid item xs={12} sm={6} md={4} key={event.id}>
              <EventCard event={event} onClick={() => handleEventClick(event)} />
            </Grid>
          ))}
          {dayEvents.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">No events for this day</Alert>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Week of {format(weekStart, 'MMMM d, yyyy')}
        </Typography>
        <Grid container spacing={1}>
          {weekDays.map(day => {
            const dayEvents = events.filter(event => 
              isSameDay(new Date(event.event_date), day)
            );
            
            return (
              <Grid item xs={12/7} key={day.toISOString()}>
                <Paper sx={{ p: 1, minHeight: 200 }}>
                  <Typography variant="subtitle2" align="center">
                    {format(day, 'EEE d')}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {dayEvents.slice(0, 3).map(event => (
                      <Chip
                        key={event.id}
                        label={`${getEventIcon(event.event_type)} ${event.amount ? `${event.amount.toLocaleString()} UGX` : event.title}`}
                        size="small"
                        sx={{ 
                          mb: 0.5, 
                          display: 'block',
                          backgroundColor: getEventColor(event.event_type),
                          color: 'white',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleEventClick(event)}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <Typography variant="caption" color="textSecondary">
                        +{dayEvents.length - 3} more
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    
    const days = [];
    let day = startDate;
    
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {format(currentDate, 'MMMM yyyy')}
        </Typography>
        <Grid container spacing={1}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
            <Grid item xs={12/7} key={dayName}>
              <Typography variant="subtitle2" align="center" sx={{ fontWeight: 'bold' }}>
                {dayName}
              </Typography>
            </Grid>
          ))}
          {days.map(day => {
            const dayEvents = events.filter(event => 
              isSameDay(new Date(event.event_date), day)
            );
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <Grid item xs={12/7} key={day.toISOString()}>
                <Paper 
                  sx={{ 
                    p: 1, 
                    minHeight: 100,
                    backgroundColor: isCurrentMonth ? 'background.paper' : 'action.hover',
                    opacity: isCurrentMonth ? 1 : 0.6
                  }}
                >
                  <Typography variant="body2" align="center">
                    {format(day, 'd')}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {dayEvents.slice(0, 2).map(event => (
                      <Chip
                        key={event.id}
                        label={getEventIcon(event.event_type)}
                        size="small"
                        sx={{ 
                          mb: 0.25, 
                          mr: 0.25,
                          minWidth: 'auto',
                          height: 16,
                          backgroundColor: getEventColor(event.event_type),
                          color: 'white',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleEventClick(event)}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <Typography variant="caption" color="textSecondary">
                        +{dayEvents.length - 2}
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  const EventCard = ({ event, onClick }) => (
    <Card sx={{ cursor: 'pointer', '&:hover': { elevation: 4 } }} onClick={onClick}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="h6" component="span">
            {getEventIcon(event.event_type)}
          </Typography>
          <Typography variant="subtitle1" sx={{ ml: 1, flexGrow: 1 }}>
            {event.title}
          </Typography>
          <Chip 
            label={event.verification_status} 
            size="small"
            color={event.verification_status === 'VERIFIED' ? 'success' : 'warning'}
          />
        </Box>
        
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {event.description}
        </Typography>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2">
            {event.group_name}
          </Typography>
          {event.amount && (
            <Typography variant="h6" color="primary">
              {event.amount.toLocaleString()} UGX
            </Typography>
          )}
        </Box>
        
        <Box display="flex" gap={1} mt={1}>
          {event.fund_type && (
            <Chip label={event.fund_type} size="small" variant="outlined" />
          )}
          {event.member_gender && (
            <Chip 
              label={event.member_gender === 'F' ? '👩' : '👨'} 
              size="small" 
              variant="outlined" 
            />
          )}
          {event.member_role && (
            <Chip label={event.member_role} size="small" variant="outlined" />
          )}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            📅 Activity Calendar
          </Typography>
          
          <Box display="flex" gap={2} alignItems="center">
            {/* View Mode Selector */}
            <FormControl size="small">
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
              >
                <MenuItem value="day">Day</MenuItem>
                <MenuItem value="week">Week</MenuItem>
                <MenuItem value="month">Month</MenuItem>
              </Select>
            </FormControl>
            
            {/* Date Navigation */}
            <Button
              onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'day' ? -1 : viewMode === 'week' ? -7 : -30))}
            >
              Previous
            </Button>
            <Button onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
            <Button
              onClick={() => setCurrentDate(addDays(currentDate, viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30))}
            >
              Next
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={2}>
              <FilterIcon />
              <Typography>Advanced Filters</Typography>
              {activeFilterCount > 0 && (
                <Badge badgeContent={activeFilterCount} color="primary">
                  <Chip label={`${activeFilterCount} active`} size="small" />
                </Badge>
              )}
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <Grid container spacing={3}>
              {/* Time Period Filters */}
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>Time Period</Typography>
                
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel>Period</InputLabel>
                  <Select
                    value={filters.time_period}
                    onChange={(e) => handleFilterChange('time_period', e.target.value)}
                  >
                    {filterOptions.time_periods?.map(period => (
                      <MenuItem key={period.value} value={period.value}>
                        {period.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {filters.time_period === 'custom' && (
                  <Box>
                    <DatePicker
                      label="Start Date"
                      value={filters.start_date}
                      onChange={(date) => handleFilterChange('start_date', date)}
                      renderInput={(params) => <TextField {...params} size="small" fullWidth sx={{ mb: 1 }} />}
                    />
                    <DatePicker
                      label="End Date"
                      value={filters.end_date}
                      onChange={(date) => handleFilterChange('end_date', date)}
                      renderInput={(params) => <TextField {...params} size="small" fullWidth />}
                    />
                  </Box>
                )}
              </Grid>

              {/* Groups & Geographic Filters */}
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>Groups & Location</Typography>

                {filterOptions.groups && (
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel>Groups</InputLabel>
                    <Select
                      multiple
                      value={filters.group_ids}
                      onChange={(e) => handleFilterChange('group_ids', e.target.value)}
                    >
                      {filterOptions.groups.map(group => (
                        <MenuItem key={group.value} value={group.value}>
                          {group.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {filterOptions.regions && (
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel>Region</InputLabel>
                    <Select
                      value={filters.region}
                      onChange={(e) => handleFilterChange('region', e.target.value)}
                    >
                      <MenuItem value="ALL">All Regions</MenuItem>
                      {filterOptions.regions.map(region => (
                        <MenuItem key={region.value} value={region.value}>
                          {region.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {filterOptions.districts && (
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel>District</InputLabel>
                    <Select
                      value={filters.district}
                      onChange={(e) => handleFilterChange('district', e.target.value)}
                    >
                      <MenuItem value="ALL">All Districts</MenuItem>
                      {filterOptions.districts.map(district => (
                        <MenuItem key={district.value} value={district.value}>
                          {district.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Grid>

              {/* Demographic Filters */}
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>Demographics</Typography>
                
                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={filters.gender}
                    onChange={(e) => handleFilterChange('gender', e.target.value)}
                  >
                    {filterOptions.genders?.map(gender => (
                      <MenuItem key={gender.value} value={gender.value}>
                        {gender.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth size="small">
                  <InputLabel>Roles</InputLabel>
                  <Select
                    multiple
                    value={filters.roles}
                    onChange={(e) => handleFilterChange('roles', e.target.value)}
                  >
                    {filterOptions.roles?.map(role => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Activity & Financial Filters */}
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>Activities & Financial</Typography>

                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>Event Types</InputLabel>
                  <Select
                    multiple
                    value={filters.event_types}
                    onChange={(e) => handleFilterChange('event_types', e.target.value)}
                  >
                    {filterOptions.event_types?.map(eventType => (
                      <MenuItem key={eventType.value} value={eventType.value}>
                        {eventType.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                  <InputLabel>Fund Types</InputLabel>
                  <Select
                    multiple
                    value={filters.fund_types}
                    onChange={(e) => handleFilterChange('fund_types', e.target.value)}
                  >
                    {filterOptions.fund_types?.map(fund => (
                      <MenuItem key={fund.value} value={fund.value}>
                        {fund.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption">Amount Range (UGX)</Typography>
                  <Box display="flex" gap={1}>
                    <TextField
                      label="Min"
                      type="number"
                      size="small"
                      value={filters.amount_min}
                      onChange={(e) => handleFilterChange('amount_min', e.target.value)}
                    />
                    <TextField
                      label="Max"
                      type="number"
                      size="small"
                      value={filters.amount_max}
                      onChange={(e) => handleFilterChange('amount_max', e.target.value)}
                    />
                  </Box>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={loadEvents} startIcon={<FilterIcon />}>
                Apply Filters
              </Button>
              <Button variant="outlined" onClick={clearAllFilters} startIcon={<ClearIcon />}>
                Clear All
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Summary Stats */}
        {filterSummary.total_events > 0 && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <CalendarIcon color="primary" />
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6">{filterSummary.total_events}</Typography>
                      <Typography variant="body2" color="textSecondary">Total Events</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center">
                    <MoneyIcon color="success" />
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6">
                        {filterSummary.total_amount?.toLocaleString() || 0} UGX
                      </Typography>
                      <Typography variant="body2" color="textSecondary">Total Amount</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="textSecondary" gutterBottom>Event Types</Typography>
                  {Object.entries(filterSummary.event_type_breakdown || {}).map(([type, count]) => (
                    <Chip 
                      key={type} 
                      label={`${getEventIcon(type)} ${count}`} 
                      size="small" 
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="textSecondary" gutterBottom>Fund Types</Typography>
                  {Object.entries(filterSummary.fund_type_breakdown || {}).map(([type, count]) => (
                    <Chip 
                      key={type} 
                      label={`${type}: ${count}`} 
                      size="small" 
                      variant="outlined"
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Calendar Grid */}
        <Paper sx={{ p: 2 }}>
          {renderCalendarGrid()}
        </Paper>

        {/* Enhanced Event Details Modal */}
        <EventDetailsModal
          open={eventDetailsOpen}
          onClose={() => setEventDetailsOpen(false)}
          event={selectedEvent}
          onMemberClick={(memberId) => {
            // Navigate to member details - implement based on your routing
            console.log('Navigate to member:', memberId);
          }}
          onTransactionClick={(transactionId) => {
            // Navigate to transaction details - implement based on your routing
            console.log('Navigate to transaction:', transactionId);
          }}
          onGroupClick={(groupId) => {
            // Navigate to group details - implement based on your routing
            console.log('Navigate to group:', groupId);
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default CalendarPage;