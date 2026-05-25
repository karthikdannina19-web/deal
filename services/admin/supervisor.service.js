import api from '../api';

export const supervisorService = {
  getSupervisors: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await api.get(`/api/admin/supervisors?${params.toString()}`);
    return response.data;
  },

  getSupervisorDetail: async (id) => {
    const response = await api.get(`/api/admin/supervisors/${id}`);
    return response.data;
  },

  createSupervisor: async (data) => {
    const response = await api.post('/api/admin/supervisors/create', data);
    return response.data;
  },

  updateSupervisor: async (id, data) => {
    const response = await api.put(`/api/admin/supervisors/${id}`, data);
    return response.data;
  },

  toggleStatus: async (id, status) => {
    const response = await api.patch(`/api/admin/supervisors/${id}/status`, { status });
    return response.data;
  },

  deleteSupervisor: async (id) => {
    const response = await api.delete(`/api/admin/supervisors/${id}`);
    return response.data;
  }
};
