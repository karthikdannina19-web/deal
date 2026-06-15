import api from '../api';

export const priorityService = {
  listRules: async (params = {}) => {
    try {
      const response = await api.get('/api/admin/priorities', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch priority rules';
    }
  },

  saveRules: async (payload) => {
    try {
      const response = await api.post('/api/admin/priorities', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to save priority rules';
    }
  },
};
