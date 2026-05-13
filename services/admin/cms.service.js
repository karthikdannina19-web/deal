import api from '../api';

/**
 * CMS Admin Service
 * Handles management of dynamic pages and FAQs
 */
export const cmsAdminService = {
  /**
   * Fetch a CMS page by slug
   */
  async getPage(slug) {
    const response = await api.get(`/api/cms/pages/${slug}`);
    return response.data;
  },

  /**
   * Create or Update a CMS page
   */
  async upsertPage(data) {
    const response = await api.post('/api/admin/cms/pages', data);
    return response.data;
  },

  /**
   * Fetch FAQs by category
   */
  async getFaqs(category = 'general') {
    const response = await api.get(`/api/cms/faqs?category=${category}`);
    return response.data;
  },

  /**
   * Create or Update an FAQ
   */
  async upsertFaq(data) {
    const response = await api.post('/api/admin/cms/faqs', data);
    return response.data;
  },
};
