import api from './api';

export const dashboardService = {
  getDashboardStats: async () => {
    const response = await api.get('/dashboard');
    return response.data;
  },

  getVendors: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await api.get(`/vendors?${params.toString()}`);
    return response.data;
  }
};
