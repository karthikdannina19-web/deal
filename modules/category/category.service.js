import Category from '../../models/category.model.js';

/**
 * Category Service
 * Handles business logic for category retrieval
 */
export class CategoryService {
  /**
   * Fetch all active categories
   * - Filters: isActive = true
   * - Sorted: name ASC
   * - Projection: _id, name, iconUrl, imageUrl, isActive
   */
  static async getActiveCategories() {
    return await Category.find({ isActive: true })
      .sort({ name: 1 })
      .select('_id name iconUrl imageUrl isActive')
      .lean(); // Use lean for better performance and lightweight response
  }
}
