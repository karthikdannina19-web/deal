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
  approveVendor: async (id, visibilityLevel = null, priority = null, priorityScopeLevel = null) => {
    try {
      const response = await api.post(`/api/admin/vendors/${id}/approve`, {
        visibility_level: visibilityLevel,
        priority,
        priority_scope_level: priorityScopeLevel,
      });
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
  },

  activateVendor: async (id) => {
    try {
      const response = await api.patch(`/api/admin/vendors/${id}`, { status: 'active' });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to activate vendor';
    }
  },

  updateVendorVisibility: async (id, payload) => {
    try {
      const response = await api.patch(`/api/admin/vendors/${id}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update vendor visibility';
    }
  },

  /**
   * Get all deleted vendors with filters
   */
  getDeletedVendors: async (filters = {}) => {
    try {
      const response = await api.get('/api/admin/vendors/deleted', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch deleted vendors';
    }
  },

  /**
   * Restore a soft-deleted vendor
   */
  restoreVendor: async (vendorId) => {
    try {
      const response = await api.post('/api/admin/vendors/restore', { vendorId });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to restore vendor';
    }
  },

  exportAudit: async (filters = {}) => {
    try {
      const response = await api.get('/api/admin/vendors/export', {
        params: filters,
        responseType: 'blob',
      });
      return response;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to export vendor audit';
    }
  }
};
