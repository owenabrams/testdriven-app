// Unified API Service - Consistent data across all components
import savingsGroupsAPI from './savingsGroupsAPI';

class UnifiedAPI {
  // Get consistent mock data for all components
  async getUnifiedData() {
    try {
      const mockData = savingsGroupsAPI.getMockData();
      return {
        groups: mockData.groups || [],
        campaigns: mockData.campaigns || [],
        members: mockData.members || [],
        transactions: mockData.transactions || [],
        summary: mockData.summary || {}
      };
    } catch (error) {
      console.error('Error fetching unified data:', error);
      return {
        groups: [],
        campaigns: [],
        members: [],
        transactions: [],
        summary: {}
      };
    }
  }

  // Get groups data
  async getGroups() {
    const data = await this.getUnifiedData();
    return { data: { data: data.groups } };
  }

  // Get campaigns data
  async getCampaigns() {
    const data = await this.getUnifiedData();
    return { data: { data: data.campaigns } };
  }

  // Get members data
  async getMembers() {
    const data = await this.getUnifiedData();
    return { data: { data: data.members } };
  }

  // Get dashboard stats
  async getDashboardStats() {
    const data = await this.getUnifiedData();
    const groups = data.groups;
    
    return {
      totalGroups: groups.length,
      totalMembers: groups.reduce((sum, group) => sum + (group.member_count || 0), 0),
      totalSavings: groups.reduce((sum, group) => sum + (group.total_balance || 0), 0),
      activeCampaigns: data.campaigns.length
    };
  }
}

export default new UnifiedAPI();
