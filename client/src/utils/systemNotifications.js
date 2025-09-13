// System-wide notification utilities
// This module provides helper functions for creating consistent notifications across the application

import { notificationsAPI } from '../services/api';

/**
 * Create a system notification
 * @param {Object} params - Notification parameters
 * @param {number} params.userId - Target user ID
 * @param {string} params.message - Notification message
 * @param {string} params.title - Notification title
 * @param {string} params.type - Notification type (info, success, warning, error)
 * @param {number} params.serviceId - Optional service ID
 * @param {string} params.actionUrl - Optional action URL
 * @param {Object} params.actionData - Optional action data
 */
export const createNotification = async (params) => {
  try {
    const response = await notificationsAPI.createNotification(params);
    return response.data;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};

/**
 * Notification templates for common scenarios
 */
export const NotificationTemplates = {
  // Authentication notifications
  LOGIN_SUCCESS: (username) => ({
    title: 'Welcome Back!',
    message: `Welcome back, ${username}! You have successfully logged in.`,
    type: 'success',
  }),

  LOGOUT_SUCCESS: () => ({
    title: 'Logged Out',
    message: 'You have been successfully logged out.',
    type: 'info',
  }),

  // Savings Group notifications
  GROUP_JOINED: (groupName) => ({
    title: 'Group Joined',
    message: `You have successfully joined ${groupName}.`,
    type: 'success',
  }),

  GROUP_LEFT: (groupName) => ({
    title: 'Group Left',
    message: `You have left ${groupName}.`,
    type: 'info',
  }),

  SAVINGS_DEPOSITED: (amount, groupName) => ({
    title: 'Savings Deposited',
    message: `Your savings of UGX ${amount.toLocaleString()} has been recorded in ${groupName}.`,
    type: 'success',
  }),

  MEETING_REMINDER: (groupName, meetingDate) => ({
    title: 'Meeting Reminder',
    message: `Don't forget about the ${groupName} meeting on ${meetingDate}.`,
    type: 'info',
  }),

  MEETING_MISSED: (groupName) => ({
    title: 'Meeting Missed',
    message: `You missed the ${groupName} meeting. Please contact your group officer.`,
    type: 'warning',
  }),

  // Loan notifications
  LOAN_APPROVED: (amount) => ({
    title: 'Loan Approved',
    message: `Your loan application for UGX ${amount.toLocaleString()} has been approved.`,
    type: 'success',
  }),

  LOAN_REJECTED: (reason) => ({
    title: 'Loan Application Rejected',
    message: `Your loan application has been rejected. Reason: ${reason}`,
    type: 'error',
  }),

  LOAN_DISBURSED: (amount) => ({
    title: 'Loan Disbursed',
    message: `Your loan of UGX ${amount.toLocaleString()} has been disbursed to your account.`,
    type: 'success',
  }),

  LOAN_REPAYMENT_DUE: (amount, dueDate) => ({
    title: 'Loan Repayment Due',
    message: `Your loan repayment of UGX ${amount.toLocaleString()} is due on ${dueDate}.`,
    type: 'warning',
  }),

  LOAN_REPAYMENT_OVERDUE: (amount, daysPastDue) => ({
    title: 'Loan Repayment Overdue',
    message: `Your loan repayment of UGX ${amount.toLocaleString()} is ${daysPastDue} days overdue.`,
    type: 'error',
  }),

  LOAN_REPAYMENT_RECEIVED: (amount) => ({
    title: 'Repayment Received',
    message: `Your loan repayment of UGX ${amount.toLocaleString()} has been received.`,
    type: 'success',
  }),

  // Campaign notifications
  CAMPAIGN_STARTED: (campaignName) => ({
    title: 'New Campaign Started',
    message: `The ${campaignName} campaign has started. Join now to participate!`,
    type: 'info',
  }),

  CAMPAIGN_GOAL_REACHED: (campaignName) => ({
    title: 'Campaign Goal Reached',
    message: `Congratulations! The ${campaignName} campaign has reached its goal.`,
    type: 'success',
  }),

  CAMPAIGN_ENDING_SOON: (campaignName, daysLeft) => ({
    title: 'Campaign Ending Soon',
    message: `The ${campaignName} campaign ends in ${daysLeft} days. Don't miss out!`,
    type: 'warning',
  }),

  // System notifications
  SYSTEM_MAINTENANCE: (startTime, duration) => ({
    title: 'Scheduled Maintenance',
    message: `System maintenance is scheduled for ${startTime} and will last approximately ${duration}.`,
    type: 'warning',
  }),

  SYSTEM_UPDATE: (version) => ({
    title: 'System Updated',
    message: `The system has been updated to version ${version}. Check out the new features!`,
    type: 'info',
  }),

  SECURITY_ALERT: (action) => ({
    title: 'Security Alert',
    message: `Security alert: ${action}. If this wasn't you, please contact support immediately.`,
    type: 'error',
  }),

  // Transaction notifications
  TRANSACTION_APPROVED: (amount, type) => ({
    title: 'Transaction Approved',
    message: `Your ${type} transaction of UGX ${amount.toLocaleString()} has been approved.`,
    type: 'success',
  }),

  TRANSACTION_REJECTED: (amount, type, reason) => ({
    title: 'Transaction Rejected',
    message: `Your ${type} transaction of UGX ${amount.toLocaleString()} was rejected. Reason: ${reason}`,
    type: 'error',
  }),

  // Admin notifications
  NEW_USER_REGISTERED: (username) => ({
    title: 'New User Registration',
    message: `New user ${username} has registered and requires approval.`,
    type: 'info',
  }),

  GROUP_REQUIRES_APPROVAL: (groupName) => ({
    title: 'Group Approval Required',
    message: `The group ${groupName} requires admin approval.`,
    type: 'info',
  }),

  SYSTEM_ERROR: (errorType) => ({
    title: 'System Error',
    message: `A system error occurred: ${errorType}. Technical team has been notified.`,
    type: 'error',
  }),
};

/**
 * Helper functions for common notification scenarios
 */
export const NotificationHelpers = {
  /**
   * Send notification to a specific user
   */
  notifyUser: async (userId, template, additionalData = {}) => {
    const notification = {
      userId,
      ...template,
      ...additionalData,
    };
    return createNotification(notification);
  },

  /**
   * Send notification to multiple users
   */
  notifyUsers: async (userIds, template, additionalData = {}) => {
    const promises = userIds.map(userId => 
      NotificationHelpers.notifyUser(userId, template, additionalData)
    );
    return Promise.allSettled(promises);
  },

  /**
   * Send notification to all group members
   */
  notifyGroupMembers: async (groupMembers, template, additionalData = {}) => {
    const userIds = groupMembers.map(member => member.user_id);
    return NotificationHelpers.notifyUsers(userIds, template, additionalData);
  },

  /**
   * Send notification to group officers only
   */
  notifyGroupOfficers: async (groupMembers, template, additionalData = {}) => {
    const officerIds = groupMembers
      .filter(member => member.role === 'OFFICER' || member.role === 'FOUNDER')
      .map(member => member.user_id);
    return NotificationHelpers.notifyUsers(officerIds, template, additionalData);
  },

  /**
   * Send notification to all admins
   */
  notifyAdmins: async (adminUsers, template, additionalData = {}) => {
    const adminIds = adminUsers.map(admin => admin.id);
    return NotificationHelpers.notifyUsers(adminIds, template, additionalData);
  },
};

/**
 * Notification priorities for different types
 */
export const NotificationPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

/**
 * Get notification priority based on type
 */
export const getNotificationPriority = (type) => {
  switch (type) {
    case 'error':
      return NotificationPriority.HIGH;
    case 'warning':
      return NotificationPriority.NORMAL;
    case 'success':
      return NotificationPriority.NORMAL;
    case 'info':
    default:
      return NotificationPriority.LOW;
  }
};
