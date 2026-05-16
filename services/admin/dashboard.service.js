import api from '../api';

/**
 * Admin Dashboard Service
 * Aggregates statistics and analytics
 */
export const dashboardService = {
  /**
   * Get main dashboard statistics
   */
  getStats: async () => {
    try {
      const response = await api.get('/api/admin/dashboard/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch dashboard stats';
    }
  },

  /**
   * Get analytics data for charts
   */
  getAnalytics: async () => {
    try {
      const response = await api.get('/api/admin/dashboard/analytics');
      return response.data;
    } catch (error) {
      console.error('[DashboardService.getAnalytics] Error:', error.response?.data || error.message);
      throw error.response?.data?.message || 'Failed to fetch analytics data';
    }
  }
};
