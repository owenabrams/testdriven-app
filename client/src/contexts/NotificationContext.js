import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../services/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastNotificationCheck, setLastNotificationCheck] = useState(Date.now());

  // Get notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationsAPI.getNotifications(user?.id),
    select: (response) => response.data?.notifications || [],
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!user?.id,
  });

  // Get unread count
  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-count', user?.id],
    queryFn: () => notificationsAPI.getUnreadCount(user?.id),
    select: (response) => response.data?.unread_count || 0,
    refetchInterval: 30000,
    enabled: !!user?.id,
  });

  // Check for new notifications and show toast
  useEffect(() => {
    if (!notifications || notifications.length === 0) return;

    const newNotifications = notifications.filter(
      notification => 
        new Date(notification.created_date).getTime() > lastNotificationCheck &&
        !notification.read
    );

    if (newNotifications.length > 0) {
      newNotifications.forEach(notification => {
        const toastOptions = {
          duration: 6000,
          style: {
            background: getToastBackground(notification.type),
            color: '#fff',
          },
        };

        switch (notification.type) {
          case 'success':
            toast.success(notification.message, toastOptions);
            break;
          case 'warning':
            toast(notification.message, { ...toastOptions, icon: '⚠️' });
            break;
          case 'error':
            toast.error(notification.message, toastOptions);
            break;
          default:
            toast(notification.message, { ...toastOptions, icon: 'ℹ️' });
        }
      });

      // Update last check time
      setLastNotificationCheck(Date.now());
    }
  }, [notifications, lastNotificationCheck]);

  const getToastBackground = (type) => {
    switch (type) {
      case 'success':
        return '#4caf50';
      case 'warning':
        return '#ff9800';
      case 'error':
        return '#f44336';
      default:
        return '#2196f3';
    }
  };

  // System notification functions
  const createSystemNotification = async (data) => {
    try {
      await notificationsAPI.createNotification(data);
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications-count']);
      return true;
    } catch (error) {
      console.error('Failed to create notification:', error);
      return false;
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications-count']);
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead(user?.id);
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications-count']);
      return true;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications-count']);
      return true;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }
  };

  // Helper functions for common notification types
  const notifySuccess = (message, title = 'Success') => {
    return createSystemNotification({
      userId: user?.id,
      message,
      title,
      type: 'success',
    });
  };

  const notifyWarning = (message, title = 'Warning') => {
    return createSystemNotification({
      userId: user?.id,
      message,
      title,
      type: 'warning',
    });
  };

  const notifyError = (message, title = 'Error') => {
    return createSystemNotification({
      userId: user?.id,
      message,
      title,
      type: 'error',
    });
  };

  const notifyInfo = (message, title = 'Information') => {
    return createSystemNotification({
      userId: user?.id,
      message,
      title,
      type: 'info',
    });
  };

  // Notify about savings group activities
  const notifySavingsActivity = (message, groupId, actionUrl = null) => {
    return createSystemNotification({
      userId: user?.id,
      message,
      title: 'Savings Group Activity',
      type: 'info',
      serviceId: 1, // Assuming savings groups service ID is 1
      actionUrl,
      actionData: { groupId },
    });
  };

  // Notify about loan activities
  const notifyLoanActivity = (message, loanId, actionUrl = null) => {
    return createSystemNotification({
      userId: user?.id,
      message,
      title: 'Loan Activity',
      type: 'info',
      actionUrl,
      actionData: { loanId },
    });
  };

  // Notify about campaign activities
  const notifyCampaignActivity = (message, campaignId, actionUrl = null) => {
    return createSystemNotification({
      userId: user?.id,
      message,
      title: 'Campaign Activity',
      type: 'info',
      actionUrl,
      actionData: { campaignId },
    });
  };

  const value = {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
    isLoading,
    
    // Core functions
    createSystemNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    
    // Helper functions
    notifySuccess,
    notifyWarning,
    notifyError,
    notifyInfo,
    
    // Activity-specific functions
    notifySavingsActivity,
    notifyLoanActivity,
    notifyCampaignActivity,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
