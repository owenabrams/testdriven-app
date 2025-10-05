import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Event,
  AttachMoney,
  Assignment,
  Campaign,
  Group,
  Person,
  Schedule,
  LocationOn,
  MoreVert,
} from '@mui/icons-material';

const EVENT_TYPES = {
  MEETING: { 
    color: 'primary', 
    icon: Event, 
    label: 'Meeting',
    bgColor: '#e3f2fd',
    borderColor: '#2196f3'
  },
  TRANSACTION: { 
    color: 'success', 
    icon: AttachMoney, 
    label: 'Transaction',
    bgColor: '#e8f5e8',
    borderColor: '#4caf50'
  },
  LOAN: { 
    color: 'warning', 
    icon: Assignment, 
    label: 'Loan',
    bgColor: '#fff3e0',
    borderColor: '#ff9800'
  },
  CAMPAIGN: { 
    color: 'secondary', 
    icon: Campaign, 
    label: 'Campaign',
    bgColor: '#fce4ec',
    borderColor: '#e91e63'
  },
};

export default function CalendarEventCard({ 
  event, 
  onClick, 
  onMemberClick, 
  onGroupClick,
  compact = false,
  showDetails = true 
}) {
  const eventType = EVENT_TYPES[event.event_type] || EVENT_TYPES.MEETING;
  const IconComponent = eventType.icon;

  const handleCardClick = (e) => {
    e.stopPropagation();
    onClick && onClick(event);
  };

  const handleMemberClick = (e, memberId) => {
    e.stopPropagation();
    onMemberClick && onMemberClick(memberId);
  };

  const handleGroupClick = (e, groupId) => {
    e.stopPropagation();
    onGroupClick && onGroupClick(groupId);
  };

  if (compact) {
    return (
      <Chip
        size="small"
        icon={<IconComponent sx={{ fontSize: 14 }} />}
        label={event.title.length > 15 ? `${event.title.substring(0, 15)}...` : event.title}
        color={eventType.color}
        variant="outlined"
        onClick={handleCardClick}
        sx={{
          mb: 0.5,
          width: '100%',
          justifyContent: 'flex-start',
          cursor: 'pointer',
          '& .MuiChip-label': {
            fontSize: '0.7rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          '&:hover': {
            backgroundColor: eventType.bgColor,
          },
        }}
      />
    );
  }

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        border: `2px solid ${eventType.borderColor}`,
        backgroundColor: eventType.bgColor,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconComponent color={eventType.color} />
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {event.title}
            </Typography>
          </Box>
          <IconButton size="small" sx={{ p: 0.5 }}>
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>

        {showDetails && (
          <>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Schedule fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {new Date(event.event_date).toLocaleDateString()}
              </Typography>
            </Box>

            {event.location && (
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <LocationOn fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary" noWrap>
                  {event.location}
                </Typography>
              </Box>
            )}

            <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
              <Box display="flex" gap={1}>
                {event.group_name && (
                  <Tooltip title={`View ${event.group_name}`}>
                    <Chip
                      size="small"
                      icon={<Group />}
                      label={event.group_name.length > 12 ? `${event.group_name.substring(0, 12)}...` : event.group_name}
                      variant="outlined"
                      onClick={(e) => handleGroupClick(e, event.group_id)}
                      sx={{ fontSize: '0.7rem' }}
                    />
                  </Tooltip>
                )}
              </Box>

              <Box display="flex" alignItems="center" gap={1}>
                {/* Event-specific indicators */}
                {event.event_type === 'MEETING' && event.attendees_count !== undefined && (
                  <Tooltip title={`${event.attendees_count}/${event.total_members} members present`}>
                    <Badge badgeContent={event.attendees_count} color="success">
                      <Person fontSize="small" color="action" />
                    </Badge>
                  </Tooltip>
                )}

                {event.event_type === 'TRANSACTION' && event.amount && (
                  <Tooltip title={`${event.amount} UGX`}>
                    <Typography variant="caption" fontWeight="bold" color={eventType.color}>
                      {event.amount.toLocaleString()} UGX
                    </Typography>
                  </Tooltip>
                )}

                {event.event_type === 'LOAN' && event.amount && (
                  <Tooltip title={`Loan: ${event.amount} UGX`}>
                    <Typography variant="caption" fontWeight="bold" color={eventType.color}>
                      {event.amount.toLocaleString()} UGX
                    </Typography>
                  </Tooltip>
                )}

                <Chip
                  size="small"
                  label={event.verification_status}
                  color={event.verification_status === 'VERIFIED' ? 'success' : 'warning'}
                  variant="filled"
                  sx={{ fontSize: '0.6rem', height: 20 }}
                />
              </Box>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
