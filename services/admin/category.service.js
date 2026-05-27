import api from '../api';

/**
 * Admin Categories Service
 */
export const categoryService = {
  /**
   * Get all categories
   */
  getCategories: async () => {
    try {
      const response = await api.get('/api/admin/categories');
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch categories';
    }
  },

  /**
   * Create a new category
   */
  createCategory: async (formData) => {
    try {
      const response = await api.post('/api/admin/categories', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to create category';
    }
  },

  /**
   * Update an existing category
   */
  updateCategory: async (id, formData) => {
    try {
      const response = await api.put(`/api/admin/categories/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to update category';
    }
  },

  /**
   * Delete a category
   */
  deleteCategory: async (id) => {
    try {
      const response = await api.delete(`/api/admin/categories/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to delete category';
    }
  }
};
