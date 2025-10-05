import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon,
  MarkEmailUnread as MarkUnreadIcon,
  Clear as ClearAllIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const getNotificationIcon = (type) => {
  switch (type) {
    case 'success':
      return <SuccessIcon color="success" />;
    case 'warning':
      return <WarningIcon color="warning" />;
    case 'error':
      return <ErrorIcon color="error" />;
    default:
      return <InfoIcon color="info" />;
  }
};

const getNotificationColor = (type) => {
  switch (type) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
};

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationsAPI.getNotifications(user?.id),

      select: (response) => response.data?.notifications || [],
      refetchInterval: 30000, // Refetch every 30 seconds
    
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => notificationsAPI.markAsRead(notificationId),
    onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
        toast.success('Notification marked as read');
      },
      onError: () => {
        toast.error('Failed to mark notification as read');
      },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => notificationsAPI.deleteNotification(notificationId),
    onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
        toast.success('Notification deleted');
      },
      onError: () => {
        toast.error('Failed to delete notification');
      },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(user?.id),
    onSuccess: () => {
        queryClient.invalidateQueries(['notifications']);
        toast.success('All notifications marked as read');
      },
      onError: () => {
        toast.error('Failed to mark all notifications as read');
      },
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleMarkAsRead = (notificationId) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleDeleteNotification = (notificationId) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load notifications. Please try again later.
      </Alert>
    );
  }

  const allNotifications = notifications || [];
  const unreadNotifications = allNotifications.filter(n => !n.read);
  const readNotifications = allNotifications.filter(n => n.read);

  const getFilteredNotifications = () => {
    switch (activeTab) {
      case 1:
        return unreadNotifications;
      case 2:
        return readNotifications;
      default:
        return allNotifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Notifications
        </Typography>
        {unreadNotifications.length > 0 && (
          <Button
            variant="outlined"
            startIcon={<ClearAllIcon />}
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isLoading}
          >
            Mark All as Read
          </Button>
        )}
      </Box>

      {/* Stats */}
      <Box display="flex" gap={2} mb={3}>
        <Chip
          icon={<NotificationsIcon />}
          label={`${allNotifications.length} Total`}
          color="primary"
          variant="outlined"
        />
        <Chip
          icon={<MarkUnreadIcon />}
          label={`${unreadNotifications.length} Unread`}
          color="error"
          variant={unreadNotifications.length > 0 ? "filled" : "outlined"}
        />
      </Box>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`All (${allNotifications.length})`} />
          <Tab label={`Unread (${unreadNotifications.length})`} />
          <Tab label={`Read (${readNotifications.length})`} />
        </Tabs>
      </Card>

      {/* Notifications List */}
      <Card>
        {filteredNotifications.length === 0 ? (
          <CardContent>
            <Box textAlign="center" py={4}>
              <NotificationsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No notifications found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeTab === 1 ? "You're all caught up!" : "Notifications will appear here"}
              </Typography>
            </Box>
          </CardContent>
        ) : (
          <List>
            {filteredNotifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'transparent' }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: notification.read ? 'normal' : 'bold',
                          }}
                        >
                          {notification.title || 'Notification'}
                        </Typography>
                        <Chip
                          label={notification.type}
                          size="small"
                          color={getNotificationColor(notification.type)}
                          variant="outlined"
                        />
                        {!notification.read && (
                          <Chip label="New" size="small" color="error" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.primary" sx={{ mb: 0.5 }}>
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(notification.created_date), { addSuffix: true })}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" gap={1}>
                      {!notification.read && (
                        <IconButton
                          edge="end"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isLoading}
                          title="Mark as read"
                        >
                          <MarkReadIcon />
                        </IconButton>
                      )}
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteNotification(notification.id)}
                        disabled={deleteNotificationMutation.isLoading}
                        title="Delete notification"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < filteredNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Card>
    </Box>
  );
}
