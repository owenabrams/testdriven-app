import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Pagination,
  Stack,
} from '@mui/material';
import {
  FilterList,
  ViewList,
  ViewModule,
  Event,
  AttachMoney,
  Assignment,
  Campaign,
} from '@mui/icons-material';
import CalendarEventCard from './CalendarEventCard';
import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';

const EVENT_TYPES = {
  MEETING: { color: 'primary', icon: Event, label: 'Meeting' },
  TRANSACTION: { color: 'success', icon: AttachMoney, label: 'Transaction' },
  LOAN: { color: 'warning', icon: Assignment, label: 'Loan' },
  CAMPAIGN: { color: 'secondary', icon: Campaign, label: 'Campaign' },
};

export default function CalendarEventList({
  events = [],
  onEventClick,
  onMemberClick,
  onGroupClick,
  loading = false,
  title = "Calendar Events",
  showFilters = true,
  itemsPerPage = 12,
}) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'type', 'group'
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and sort events
  const filteredEvents = events.filter(event => {
    if (filterType === 'all') return true;
    return event.event_type === filterType;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.event_date) - new Date(a.event_date);
      case 'type':
        return a.event_type.localeCompare(b.event_type);
      case 'group':
        return (a.group_name || '').localeCompare(b.group_name || '');
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEvents = sortedEvents.slice(startIndex, startIndex + itemsPerPage);

  // Group events by date for better organization
  const eventsByDate = paginatedEvents.reduce((acc, event) => {
    const dateKey = format(parseISO(event.event_date), 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  const getDateLabel = (dateString) => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading events...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Alert severity="info">
        No calendar events found. Events will appear here when meetings are scheduled or activities are recorded.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">{title}</Typography>
        
        {showFilters && (
          <Box display="flex" gap={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                label="Filter"
              >
                <MenuItem value="all">All Events</MenuItem>
                {Object.entries(EVENT_TYPES).map(([type, config]) => (
                  <MenuItem key={type} value={type}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <config.icon fontSize="small" />
                      {config.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="type">Type</MenuItem>
                <MenuItem value="group">Group</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant={viewMode === 'grid' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setViewMode('grid')}
            >
              <ViewModule />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setViewMode('list')}
            >
              <ViewList />
            </Button>
          </Box>
        )}
      </Box>

      {/* Events Display */}
      {Object.entries(eventsByDate).map(([dateKey, dayEvents]) => (
        <Box key={dateKey} mb={4}>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            {getDateLabel(dateKey)} ({dayEvents.length} events)
          </Typography>
          
          <Grid container spacing={2}>
            {dayEvents.map((event) => (
              <Grid 
                item 
                xs={12} 
                sm={viewMode === 'grid' ? 6 : 12} 
                md={viewMode === 'grid' ? 4 : 12} 
                lg={viewMode === 'grid' ? 3 : 12}
                key={event.id}
              >
                <CalendarEventCard
                  event={event}
                  onClick={onEventClick}
                  onMemberClick={onMemberClick}
                  onGroupClick={onGroupClick}
                  compact={viewMode === 'list'}
                  showDetails={viewMode === 'grid'}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Stack spacing={2}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(event, value) => setCurrentPage(value)}
              color="primary"
              size="large"
            />
            <Typography variant="caption" align="center" color="text.secondary">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedEvents.length)} of {sortedEvents.length} events
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Summary */}
      <Box mt={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Event Summary
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap">
              {Object.entries(EVENT_TYPES).map(([type, config]) => {
                const count = events.filter(e => e.event_type === type).length;
                return count > 0 ? (
                  <Chip
                    key={type}
                    icon={<config.icon />}
                    label={`${count} ${config.label}${count !== 1 ? 's' : ''}`}
                    color={config.color}
                    variant="outlined"
                    size="small"
                  />
                ) : null;
              })}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
