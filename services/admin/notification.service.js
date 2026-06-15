import api from '../api';

export const notificationService = {
  /**
   * Send a broadcast notification with optional location targeting
   * @param {Object} data { title, body, type, targetType, imageUrl, action,
   *                        visibilityScope, stateId, districtId, mandalId }
   */
  sendBroadcast: async (data) => {
    try {
      const response = await api.post('/api/admin/notifications/send', data);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to send broadcast';
    }
  },

  /**
   * Fetch broadcast history
   */
  getBroadcastHistory: async () => {
    try {
      const response = await api.get('/api/admin/notifications/broadcasts');
      return response.data.broadcasts;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch history';
    }
  }
};
