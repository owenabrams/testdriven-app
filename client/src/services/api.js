import axios from 'axios';

// Use our real microfinance API backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (userData) => apiClient.post('/auth/register', userData),
  getStatus: () => apiClient.get('/auth/status'),
  logout: () => apiClient.post('/auth/logout'),
};

// API service functions
export const savingsGroupsAPI = {
  // Groups - Updated to match our real API endpoints (with trailing slashes)
  getGroups: () => apiClient.get('/groups/'),
  getGroup: (id) => apiClient.get(`/groups/${id}`),
  createGroup: (data) => apiClient.post('/groups/', data),
  updateGroup: (id, data) => apiClient.put(`/groups/${id}`, data),
  deleteGroup: (id) => apiClient.delete(`/groups/${id}`),

  // Group Members - Updated to match our real API
  getGroupMembers: (groupId) => apiClient.get(`/groups/${groupId}/members`),
  addMember: (groupId, data) => apiClient.post(`/groups/${groupId}/members`, data),
  updateMember: (groupId, memberId, data) => apiClient.put(`/groups/${groupId}/members/${memberId}`, data),
  removeMember: (groupId, memberId) => apiClient.delete(`/groups/${groupId}/members/${memberId}`),

  // Savings - Updated to match our real API
  recordSaving: (groupId, memberId, data) => apiClient.post(`/groups/${groupId}/members/${memberId}/savings`, data),
  getMemberSavings: (groupId, memberId) => apiClient.get(`/groups/${groupId}/members/${memberId}/savings`),

  // Admin Functions
  updateMember: (groupId, memberId, data) => apiClient.put(`/savings-groups/${groupId}/members/${memberId}`, data),
  updateGroup: (groupId, data) => apiClient.put(`/savings-groups/${groupId}`, data),

  // Cashbook
  getCashbook: (groupId, params = {}) => apiClient.get(`/savings-groups/${groupId}/cashbook`, { params }),
  getFinancialSummary: (groupId) => apiClient.get(`/savings-groups/${groupId}/financial-summary`),

  // Analytics
  getAnalytics: (groupId) => apiClient.get(`/savings-groups/${groupId}/analytics`),
  
  // User membership and dashboard
  getUserMembership: (userId) => apiClient.get(`/user-membership/${userId}`),
  getAdminDashboard: () => apiClient.get('/admin-dashboard'),
  getMemberDashboard: (memberId) => apiClient.get(`/member-dashboard/${memberId}`),
  getMemberTransactions: (memberId) => apiClient.get(`/member-transactions/${memberId}`),

  // Loans
  checkLoanEligibility: (groupId, memberId, data) => apiClient.post(`/savings-groups/${groupId}/members/${memberId}/loan-eligibility`, data),
  getLoanHistory: (groupId, memberId) => apiClient.get(`/savings-groups/${groupId}/members/${memberId}/loan-history`),

  // Calendar Events
  getCalendarEvents: (params = {}) => apiClient.get('/calendar/events', { params }),
  getCalendarEventDetails: (eventId) => apiClient.get(`/api/calendar/events/${eventId}`),
  getFilterOptions: () => apiClient.get('/api/calendar/filter-options'),

  // Target Campaigns
  getTargetCampaigns: (groupId) => apiClient.get(`/savings-groups/${groupId}/target-campaigns`),

  // Member specific endpoints
  getMembers: (groupId) => apiClient.get(`/groups/${groupId}/members`),
  getMember: (groupId, memberId) => apiClient.get(`/groups/${groupId}/members/${memberId}`),
};

// Users API
export const usersAPI = {
  getUsers: () => apiClient.get('/users'),
  getUser: (id) => apiClient.get(`/users/${id}`),
  createUser: (data) => apiClient.post('/users', data),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
};

// Meetings API - Our new meeting scheduler system
export const meetingsAPI = {
  getMeetings: (groupId) => apiClient.get(`/meetings?group_id=${groupId}`),
  getMeeting: (id) => apiClient.get(`/meetings/${id}`),
  createMeeting: (data) => apiClient.post('/meetings', data),
  updateMeeting: (id, data) => apiClient.put(`/meetings/${id}`, data),
  deleteMeeting: (id) => apiClient.delete(`/meetings/${id}`),

  // Meeting Scheduler endpoints
  getCalendar: (params = {}) => apiClient.get('/scheduler/calendar', { params }),
  scheduleMeeting: (data) => apiClient.post('/scheduler/schedule-meeting', data),
  getMeetingTemplates: (params = {}) => apiClient.get('/scheduler/meeting-templates', { params }),
  getMeetingInvitations: (meetingId) => apiClient.get(`/scheduler/meetings/${meetingId}/invitations`),
  respondToInvitation: (invitationId, response) => apiClient.post(`/scheduler/invitations/${invitationId}/respond`, response),
  getPlannedActivities: (meetingId) => apiClient.get(`/scheduler/meetings/${meetingId}/planned-activities`),
};

// Reports API - Our comprehensive reporting system
export const reportsAPI = {
  getSystemOverview: () => apiClient.get('/reports/system-overview'),
  getGroupDashboard: (groupId) => apiClient.get(`/reports/group-dashboard/${groupId}`),
  getAttendanceComparison: () => apiClient.get('/attendance/group-comparison'),
  getAttendanceSummary: (groupId) => apiClient.get(`/attendance/summary?group_id=${groupId}`),
};

// Calendar API - Real calendar from activities
export const calendarAPI = {
  getEvents: (params = {}) => apiClient.get('/calendar/events', { params }),
  getFilteredEvents: (params = {}) => apiClient.get('/calendar/filtered', { params }),
  getFilterOptions: () => apiClient.get('/calendar/filter-options'),
};

export const campaignsAPI = {
  // Campaigns
  getCampaigns: (params = {}) => apiClient.get('/target-campaigns', { params }),
  getCampaign: (id) => apiClient.get(`/target-campaigns/${id}`),
  createCampaign: (data) => apiClient.post('/target-campaigns', data),
  updateCampaign: (id, data) => apiClient.put(`/target-campaigns/${id}`, data),
  deleteCampaign: (id) => apiClient.delete(`/target-campaigns/${id}`),

  // Campaign Assignment
  assignToGroup: (campaignId, groupId, data) => apiClient.post(`/target-campaigns/${campaignId}/assign/${groupId}`, data),
  getGroupCampaigns: (groupId) => apiClient.get(`/savings-groups/${groupId}/campaigns`),

  // Voting
  vote: (campaignId, groupId, data) => apiClient.post(`/target-campaigns/${campaignId}/groups/${groupId}/vote`, data),
  getVotes: (campaignId, groupId) => apiClient.get(`/target-campaigns/${campaignId}/groups/${groupId}/votes`),

  // Contributions
  contribute: (campaignId, groupId, data) => apiClient.post(`/target-campaigns/${campaignId}/groups/${groupId}/contribute`, data),
  getProgress: (campaignId, groupId) => apiClient.get(`/target-campaigns/${campaignId}/groups/${groupId}/progress`),
};

export const loansAPI = {
  // Loan Assessment
  createAssessment: (groupId, memberId, data) => apiClient.post(`/savings-groups/${groupId}/members/${memberId}/loan-assessment`, data),
  getAssessment: (groupId, memberId) => apiClient.get(`/savings-groups/${groupId}/members/${memberId}/loan-assessment`),
  checkEligibility: (groupId, memberId, data) => apiClient.post(`/savings-groups/${groupId}/members/${memberId}/loan-eligibility`, data),
  getLoanHistory: (groupId, memberId) => apiClient.get(`/savings-groups/${groupId}/members/${memberId}/loan-history`),

  // Loans
  getLoans: (groupId) => apiClient.get(`/savings-groups/${groupId}/loans`),
  disburseLoan: (groupId, loanId, data) => apiClient.post(`/savings-groups/${groupId}/loans/${loanId}/disburse`, data),
  recordRepayment: (groupId, loanId, data) => apiClient.post(`/savings-groups/${groupId}/loans/${loanId}/repayment`, data),
};

export const notificationsAPI = {
  getNotifications: (userId) => apiClient.get(`/notifications/user/${userId}`),
  getUnreadCount: (userId) => apiClient.get(`/notifications/user/${userId}/unread-count`),
  markAsRead: (id) => apiClient.post(`/notifications/${id}/read`),
  markAllAsRead: (userId) => apiClient.post(`/notifications/user/${userId}/mark-all-read`),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
  createNotification: (data) => apiClient.post('/notifications', data),
};