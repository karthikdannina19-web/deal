import api from '../api';

/**
 * Admin Vendors Service
 */
export const vendorService = {
  /**
   * Get all vendors with filters
   */
  getVendors: async (filters = {}) => {
    try {
      const response = await api.get('/api/admin/vendors', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch vendors';
    }
  },

  /**
   * Approve a vendor
   */
  approveVendor: async (id) => {
    try {
      const response = await api.patch(`/api/admin/vendors/${id}`, { status: 'active' });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to approve vendor';
    }
  },

  /**
   * Reject a vendor
   */
  rejectVendor: async (id, reason) => {
    try {
      const response = await api.patch(`/api/admin/vendors/${id}`, { 
        status: 'rejected',
        reason 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to reject vendor';
    }
  },

  /**
   * Suspend a vendor
   */
  suspendVendor: async (id) => {
    try {
      const response = await api.patch(`/api/admin/vendors/${id}`, { status: 'suspended' });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to suspend vendor';
    }
  }
};
