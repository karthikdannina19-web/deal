import api from '../api';

/**
 * Admin Payments Service
 */
export const paymentService = {
  /**
   * Get all payments
   */
  getPayments: async (page = 1, limit = 20) => {
    try {
      const response = await api.get('/api/admin/payments', {
        params: { page, limit }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch payments';
    }
  },

  exportLedger: async (filters = {}) => {
    try {
      const response = await api.get('/api/admin/payments/export', {
        params: filters,
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to export payments ledger';
    }
  }
};
