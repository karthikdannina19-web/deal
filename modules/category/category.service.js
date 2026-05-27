import Category from '../../models/category.model.js';
import { VisibilityService } from '@/services/visibility.service.js';

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
  static async getActiveCategories({ userLocation = null, sectionId = null } = {}) {
    const query = VisibilityService.buildMatchQuery(userLocation, { isActive: true });
    if (sectionId) {
      query.sectionId = sectionId;
    } else {
      query.sectionId = { $ne: null };
    }

    return await Category.find(query)
      .populate('sectionId', 'name slug order')
      .sort({ name: 1 })
      .select('_id name iconUrl imageUrl isActive sectionId visibilityLevel visibilityStateId visibilityDistrictId visibilityMandalId visibilityEnabled')
      .lean(); // Use lean for better performance and lightweight response
  }
}
