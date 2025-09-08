import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

// API service functions
export const savingsGroupsAPI = {
  // Groups
  getGroups: () => apiClient.get('/savings-groups'),
  getGroup: (id) => apiClient.get(`/savings-groups/${id}`),
  createGroup: (data) => apiClient.post('/savings-groups', data),
  updateGroup: (id, data) => apiClient.put(`/savings-groups/${id}`, data),
  deleteGroup: (id) => apiClient.delete(`/savings-groups/${id}`),

  // Group Members
  getGroupMembers: (groupId) => apiClient.get(`/savings-groups/${groupId}/members`),
  addMember: (groupId, data) => apiClient.post(`/savings-groups/${groupId}/members`, data),
  updateMember: (groupId, memberId, data) => apiClient.put(`/savings-groups/${groupId}/members/${memberId}`, data),
  removeMember: (groupId, memberId) => apiClient.delete(`/savings-groups/${groupId}/members/${memberId}`),

  // Savings
  recordSaving: (groupId, memberId, data) => apiClient.post(`/savings-groups/${groupId}/members/${memberId}/savings`, data),
  getMemberSavings: (groupId, memberId) => apiClient.get(`/savings-groups/${groupId}/members/${memberId}/savings`),

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
  getNotifications: () => apiClient.get('/notifications'),
  markAsRead: (id) => apiClient.put(`/notifications/${id}/read`),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
};