import api from '../api';

/**
 * Admin Ads Service
 */
export const adsService = {
  /**
   * Get all ads
   */
  getAds: async (filters = {}) => {
    try {
      const response = await api.get('/api/admin/ads', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch ads';
    }
  },

  /**
   * Review an ad (Approve/Reject)
   */
  reviewAd: async (id, status, notes = '', sectionId = null) => {
    try {
      const response = await api.put(`/api/admin/ads/review/${id}`, { status, notes, sectionId });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to review ad';
    }
  }
};
