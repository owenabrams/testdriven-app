// Savings Groups Microservice API
// This service handles all API calls specific to the savings groups functionality

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

class SavingsGroupsAPI {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/savings-groups`;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // Helper method to handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || 'API request failed');
    }
    return response.json();
  }

  // Member-specific API calls
  async getMyGroupMembership() {
    const response = await fetch(`${this.baseURL}/my-membership/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMySavings() {
    const response = await fetch(`${this.baseURL}/my-savings/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMyTransactions() {
    const response = await fetch(`${this.baseURL}/my-transactions/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Calendar and Filtering API calls
  async getCalendarEvents(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'ALL' && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value);
        }
      }
    });

    const response = await fetch(`${this.baseURL}/calendar/events?${params.toString()}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getCalendarEventDetails(eventId) {
    const response = await fetch(`${this.baseURL}/calendar/events/${eventId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getFilterOptions() {
    const response = await fetch(`${this.baseURL}/calendar/filter-options`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Mock data for testing filtering scenarios
  getMockCalendarEvents() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    return {
      events: [
        // Women ECD savers in Central region - Current month
        {
          id: 1,
          title: 'ECD Fund Deposit - 75,000 UGX',
          description: 'Sarah Nakato saved 75,000 UGX to ECD Fund',
          event_type: 'TRANSACTION',
          event_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`,
          group_id: 1,
          group_name: 'Kampala Women\'s Cooperative',
          group_region: 'Central',
          group_district: 'Kampala',
          group_parish: 'Central',
          amount: 75000,
          fund_type: 'ECD',
          verification_status: 'VERIFIED',
          member_gender: 'F',
          member_role: 'OFFICER',
          mobile_money_provider: 'MTN'
        },
        {
          id: 2,
          title: 'ECD Fund Deposit - 50,000 UGX',
          description: 'Mary Nambi saved 50,000 UGX to ECD Fund',
          event_type: 'TRANSACTION',
          event_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-10`,
          group_id: 1,
          group_name: 'Kampala Women\'s Cooperative',
          group_region: 'Central',
          group_district: 'Kampala',
          group_parish: 'Central',
          amount: 50000,
          fund_type: 'ECD',
          verification_status: 'VERIFIED',
          member_gender: 'F',
          member_role: 'OFFICER',
          mobile_money_provider: 'Airtel'
        },
        // Mixed gender group in Central region - Personal savings
        {
          id: 3,
          title: 'Personal Savings - 100,000 UGX',
          description: 'John Mukasa saved 100,000 UGX to Personal Savings',
          event_type: 'TRANSACTION',
          event_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-12`,
          group_id: 2,
          group_name: 'Wakiso Mixed Savings Group',
          group_region: 'Central',
          group_district: 'Wakiso',
          group_parish: 'Kawempe',
          amount: 100000,
          fund_type: 'PERSONAL',
          verification_status: 'VERIFIED',
          member_gender: 'M',
          member_role: 'OFFICER',
          mobile_money_provider: 'MTN'
        },
        // Women in Eastern region - ECD Fund
        {
          id: 4,
          title: 'ECD Fund Deposit - 60,000 UGX',
          description: 'Grace Mukasa saved 60,000 UGX to ECD Fund',
          event_type: 'TRANSACTION',
          event_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-08`,
          group_id: 3,
          group_name: 'Jinja Women Entrepreneurs',
          group_region: 'Eastern',
          group_district: 'Jinja',
          group_parish: 'Central',
          amount: 60000,
          fund_type: 'ECD',
          verification_status: 'VERIFIED',
          member_gender: 'F',
          member_role: 'MEMBER',
          mobile_money_provider: 'MTN'
        },
        // Social Fund transactions
        {
          id: 5,
          title: 'Social Fund Contribution - 25,000 UGX',
          description: 'Alice Ssali contributed 25,000 UGX to Social Fund',
          event_type: 'TRANSACTION',
          event_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-05`,
          group_id: 1,
          group_name: 'Kampala Women\'s Cooperative',
          group_region: 'Central',
          group_district: 'Kampala',
          group_parish: 'Central',
          amount: 25000,
          fund_type: 'SOCIAL',
          verification_status: 'VERIFIED',
          member_gender: 'F',
          member_role: 'MEMBER',
          mobile_money_provider: 'Airtel'
        },
        // Meeting events
        {
          id: 6,
          title: 'Weekly Group Meeting',
          description: 'Regular weekly meeting for group planning',
          event_type: 'MEETING',
          event_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-14`,
          group_id: 1,
          group_name: 'Kampala Women\'s Cooperative',
          group_region: 'Central',
          group_district: 'Kampala',
          group_parish: 'Central',
          verification_status: 'VERIFIED',
          member_gender: null,
          member_role: null
        },
        // Loan events
        {
          id: 7,
          title: 'Group Loan Disbursement - 500,000 UGX',
          description: 'Loan disbursed to Kampala Women\'s Cooperative',
          event_type: 'LOAN',
          event_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
          group_id: 1,
          group_name: 'Kampala Women\'s Cooperative',
          group_region: 'Central',
          group_district: 'Kampala',
          group_parish: 'Central',
          amount: 500000,
          verification_status: 'VERIFIED',
          member_gender: null,
          member_role: null
        },
        // Previous month data for time filtering tests
        {
          id: 8,
          title: 'ECD Fund Deposit - 45,000 UGX',
          description: 'Jane Nakirya saved 45,000 UGX to ECD Fund',
          event_type: 'TRANSACTION',
          event_date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-20`,
          group_id: 1,
          group_name: 'Kampala Women\'s Cooperative',
          group_region: 'Central',
          group_district: 'Kampala',
          group_parish: 'Central',
          amount: 45000,
          fund_type: 'ECD',
          verification_status: 'VERIFIED',
          member_gender: 'F',
          member_role: 'MEMBER',
          mobile_money_provider: 'MTN'
        }
      ],
      summary: {
        total_events: 8,
        total_amount: 875000,
        event_type_breakdown: {
          'TRANSACTION': 6,
          'MEETING': 1,
          'LOAN': 1
        },
        fund_type_breakdown: {
          'ECD': 4,
          'PERSONAL': 1,
          'SOCIAL': 1
        }
      }
    };
  }

  getMockFilterOptions() {
    return {
      time_periods: [
        { value: 'today', label: 'Today' },
        { value: 'this_week', label: 'This Week' },
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'custom', label: 'Custom Range' }
      ],
      regions: [
        { value: 'Central', label: 'Central' },
        { value: 'Eastern', label: 'Eastern' },
        { value: 'Western', label: 'Western' },
        { value: 'Northern', label: 'Northern' }
      ],
      districts: [
        { value: 'Kampala', label: 'Kampala' },
        { value: 'Wakiso', label: 'Wakiso' },
        { value: 'Jinja', label: 'Jinja' },
        { value: 'Mukono', label: 'Mukono' }
      ],
      parishes: [
        { value: 'Central', label: 'Central' },
        { value: 'Kawempe', label: 'Kawempe' },
        { value: 'Nakasero', label: 'Nakasero' }
      ],
      genders: [
        { value: 'ALL', label: 'All Genders' },
        { value: 'F', label: '👩 Women' },
        { value: 'M', label: '👨 Men' },
        { value: 'OTHER', label: '⚧ Other' }
      ],
      roles: [
        { value: 'CHAIR', label: '🪑 Chair' },
        { value: 'TREASURER', label: '💼 Treasurer' },
        { value: 'SECRETARY', label: '📝 Secretary' },
        { value: 'OFFICER', label: '👔 Officer' },
        { value: 'MEMBER', label: '👤 Member' }
      ],
      fund_types: [
        { value: 'PERSONAL', label: '💰 Personal Savings' },
        { value: 'ECD', label: '👶 ECD Fund' },
        { value: 'SOCIAL', label: '🤝 Social Fund' },
        { value: 'TARGET', label: '🎯 Target Savings' }
      ],
      event_types: [
        { value: 'TRANSACTION', label: '💰 Transactions' },
        { value: 'MEETING', label: '👥 Meetings' },
        { value: 'LOAN', label: '🏦 Loans' },
        { value: 'CAMPAIGN', label: '🎯 Campaigns' },
        { value: 'FINE', label: '⚠️ Fines' }
      ],
      verification_statuses: [
        { value: 'ALL', label: 'All Statuses' },
        { value: 'PENDING', label: '⏳ Pending' },
        { value: 'VERIFIED', label: '✅ Verified' },
        { value: 'REJECTED', label: '❌ Rejected' }
      ],
      groups: [
        { value: 1, label: 'Kampala Women\'s Cooperative' },
        { value: 2, label: 'Wakiso Mixed Savings Group' },
        { value: 3, label: 'Jinja Women Entrepreneurs' }
      ]
    };
  }

  async getMyLoans() {
    const response = await fetch(`${this.baseURL}/my-loans/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getMyMeetingAttendance() {
    const response = await fetch(`${this.baseURL}/my-attendance/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Group Officer API calls
  async getGroupMembers(groupId) {
    const response = await fetch(`${this.baseURL}/groups/${groupId}/members/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getGroupTransactions(groupId) {
    const response = await fetch(`${this.baseURL}/groups/${groupId}/transactions/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getGroupLoans(groupId) {
    const response = await fetch(`${this.baseURL}/groups/${groupId}/loans/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async verifyTransaction(transactionId) {
    const response = await fetch(`${this.baseURL}/transactions/${transactionId}/verify/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Admin API calls
  async getAllGroups() {
    const response = await fetch(`${this.baseURL}/groups/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSystemStats() {
    const response = await fetch(`${this.baseURL}/admin/stats/`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Transaction recording
  async recordSaving(savingData) {
    const response = await fetch(`${this.baseURL}/savings/record/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(savingData),
    });
    return this.handleResponse(response);
  }

  // Mock data for development (until backend endpoints are ready)
  getMockData() {
    return {
      currentUser: {
        id: 1,
        name: 'Sarah Nakato',
        email: 'sarah@kampala.ug',
        groupName: "Kampala Women's Cooperative",
        role: 'CHAIR',
        memberSince: '2023-12-08',
      },
      
      mySavings: [
        {
          id: 1,
          savingType: 'Personal Savings',
          currentBalance: 650000,
          totalContributions: 650000,
          lastContribution: '2024-12-08',
          lastAmount: 50000,
        },
        {
          id: 2,
          savingType: 'ECD Fund',
          currentBalance: 150000,
          totalContributions: 150000,
          lastContribution: '2024-12-07',
          lastAmount: 25000,
        },
        {
          id: 3,
          savingType: 'Social Fund',
          currentBalance: 75000,
          totalContributions: 75000,
          lastContribution: '2024-12-06',
          lastAmount: 15000,
        },
      ],

      myTransactions: [
        {
          id: 1,
          date: '2024-12-08',
          type: 'Personal Savings',
          amount: 50000,
          method: 'MTN Mobile Money',
          status: 'Verified',
          verifiedBy: 'Mary Nambi',
          verifiedAt: '2024-12-08 14:30',
        },
        {
          id: 2,
          date: '2024-12-07',
          type: 'ECD Fund',
          amount: 25000,
          method: 'Cash',
          status: 'Verified',
          verifiedBy: 'Grace Mukasa',
          verifiedAt: '2024-12-07 16:45',
        },
        {
          id: 3,
          date: '2024-12-06',
          type: 'Social Fund',
          amount: 15000,
          method: 'Airtel Money',
          status: 'Pending',
          verifiedBy: null,
          verifiedAt: null,
        },
      ],

      myLoans: [
        {
          id: 1,
          applicationDate: '2024-11-15',
          amount: 500000,
          purpose: 'Business expansion - tailoring equipment',
          status: 'Approved',
          approvedAmount: 500000,
          interestRate: 5,
          repaymentPeriod: 6,
          monthlyPayment: 87500,
          totalRepaid: 175000,
          remainingBalance: 325000,
          nextPaymentDate: '2024-12-15',
        },
      ],

      myAttendance: [
        { weekOf: '2024-12-02', attended: true, fineAmount: 0 },
        { weekOf: '2024-11-25', attended: true, fineAmount: 0 },
        { weekOf: '2024-11-18', attended: false, fineAmount: 5000 },
        { weekOf: '2024-11-11', attended: true, fineAmount: 0 },
        { weekOf: '2024-11-04', attended: true, fineAmount: 0 },
        { weekOf: '2024-10-28', attended: true, fineAmount: 0 },
        { weekOf: '2024-10-21', attended: true, fineAmount: 0 },
        { weekOf: '2024-10-14', attended: true, fineAmount: 0 },
      ],

      groupData: {
        id: 1,
        name: "Kampala Women's Cooperative",
        totalMembers: 5,
        totalBalance: 2025000,
        monthlyTarget: 500000,
        formationDate: '2023-12-08',
        meetingDay: 'Monday',
        meetingTime: '18:00',
        location: 'Community Center, Nakasero',
        
        members: [
          {
            id: 1,
            name: 'Sarah Nakato',
            role: 'CHAIR',
            personalSavings: 650000,
            ecdFund: 150000,
            socialFund: 75000,
            totalBalance: 875000,
            attendanceRate: 95,
            status: 'Active',
            joinDate: '2023-12-08',
            phoneNumber: '+256701234567',
          },
          {
            id: 2,
            name: 'Mary Nambi',
            role: 'TREASURER',
            personalSavings: 475000,
            ecdFund: 0,
            socialFund: 0,
            totalBalance: 475000,
            attendanceRate: 100,
            status: 'Active',
            joinDate: '2023-12-08',
            phoneNumber: '+256701234568',
          },
          {
            id: 3,
            name: 'Grace Mukasa',
            role: 'SECRETARY',
            personalSavings: 350000,
            ecdFund: 0,
            socialFund: 0,
            totalBalance: 350000,
            attendanceRate: 90,
            status: 'Active',
            joinDate: '2023-12-08',
            phoneNumber: '+256701234569',
          },
          {
            id: 4,
            name: 'Alice Ssali',
            role: 'MEMBER',
            personalSavings: 300000,
            ecdFund: 0,
            socialFund: 0,
            totalBalance: 300000,
            attendanceRate: 85,
            status: 'Active',
            joinDate: '2024-01-15',
            phoneNumber: '+256701234570',
          },
          {
            id: 5,
            name: 'Jane Nakirya',
            role: 'MEMBER',
            personalSavings: 250000,
            ecdFund: 0,
            socialFund: 0,
            totalBalance: 250000,
            attendanceRate: 95,
            status: 'Active',
            joinDate: '2024-02-01',
            phoneNumber: '+256701234571',
          },
        ],
      },

      pendingActions: [
        {
          id: 1,
          type: 'Transaction Verification',
          description: 'Alice Ssali - UGX 30,000 Personal Savings deposit',
          priority: 'High',
          dueDate: '2024-12-09',
          memberName: 'Alice Ssali',
          amount: 30000,
        },
        {
          id: 2,
          type: 'Loan Application Review',
          description: 'Jane Nakirya - UGX 200,000 loan request for shop inventory',
          priority: 'Medium',
          dueDate: '2024-12-10',
          memberName: 'Jane Nakirya',
          amount: 200000,
        },
        {
          id: 3,
          type: 'Fine Collection',
          description: 'Alice Ssali - UGX 5,000 meeting absence fine',
          priority: 'Low',
          dueDate: '2024-12-12',
          memberName: 'Alice Ssali',
          amount: 5000,
        },
      ],
    };
  }
}

export default new SavingsGroupsAPI();