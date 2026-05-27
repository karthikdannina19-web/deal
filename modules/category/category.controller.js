import { CategoryService } from './category.service.js';
import { dbConnect } from '../../config/database.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import User from '@/models/user.model.js';
import { VisibilityService } from '@/services/visibility.service.js';

/**
 * Category Controller
 * Interfaces between the API route and the Category service
 */
export class CategoryController {
  /**
   * Fetch all active categories
   * Endpoint: GET /api/categories
   */
  static async getCategories(req) {
    try {
      // 1. Ensure database connection
      await dbConnect();
      const { searchParams } = new URL(req.url);
      const authHeader = req.headers.get('authorization');
      const auth = authHeader ? await authenticate(req) : { user: null, error: null };
      if (auth?.error && authHeader) return auth.error;
      const authUser = auth?.user?.id
        ? await User.findById(auth.user.id).select('stateId districtId mandalId').lean()
        : null;
      const userLocation = VisibilityService.getUserLocation(authUser);

      // 2. Fetch categories from service
      const categories = await CategoryService.getActiveCategories({
        userLocation,
        sectionId: searchParams.get('sectionId') || searchParams.get('section'),
      });

      // 3. Return successful response
      return Response.json({
        success: true,
        categories
      }, { status: 200 });

    } catch (error) {
      console.error('[CategoryController.getCategories Error]', error);

      // Handle failures gracefully
      return Response.json({
        success: false,
        message: 'Failed to fetch categories'
      }, { status: 500 });
    }
  }
}
