import api from '../api';

/**
 * Admin Users Service
 * Interfaces with the /api/admin/users endpoints
 */
export const userService = {
  /**
   * Fetch all users with optional filtering
   */
  getAllUsers: async (page = 1, limit = 10, search = '', filters = {}) => {
    try {
      const response = await api.get('/api/admin/users', {
        params: {
          page,
          limit,
          search,
          stateId: filters.stateId || undefined,
          districtId: filters.districtId || undefined,
          mandalId: filters.mandalId || undefined,
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch users';
    }
  },

  /**
   * Get specific user details
   */
  getUserById: async (id) => {
    try {
      const response = await api.get(`/api/admin/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch user details';
    }
  }
};
