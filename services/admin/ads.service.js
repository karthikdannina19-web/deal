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
  reviewAd: async (
    id,
    status,
    notes = '',
    sectionId = null,
    category = null,
    visibilityLevel = null,
    visibilityStateId = null,
    visibilityDistrictId = null,
    visibilityMandalId = null
  ) => {
    try {
      const body = { status, notes };
      if (sectionId !== undefined) body.sectionId = sectionId;
      if (category !== undefined) body.category = category;
      if (visibilityLevel !== undefined && visibilityLevel !== null) body.visibility_level = visibilityLevel;
      if (visibilityStateId !== undefined && visibilityStateId !== null) body.visibility_state_id = visibilityStateId;
      if (visibilityDistrictId !== undefined) body.visibility_district_id = visibilityDistrictId;
      if (visibilityMandalId !== undefined) body.visibility_mandal_id = visibilityMandalId;
      const response = await api.put(`/api/admin/ads/review/${id}`, body);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to review ad';
    }
  },

  /**
   * Delete an ad
   */
  deleteAd: async (id) => {
    try {
      const response = await api.delete(`/api/admin/ads/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to delete ad';
    }
  }
};
