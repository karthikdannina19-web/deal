import { CmsService } from './cms.service.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';

/**
 * CMS Controller
 * API endpoints for fetching dynamic app content
 */
export class CmsController {
  /**
   * GET /api/cms/pages/:slug
   */
  static async getPage(req, { params }) {
    try {
      // For Next.js App Router dynamic route parameters
      const resolvedParams = await params;
      const slug = resolvedParams.slug;
      
      if (!slug) {
        return Response.json({ success: false, message: 'Slug is required' }, { status: 400 });
      }

      // If called from admin (check referrer or just allow for now as it's a GET)
      const isAdmin = req.headers.get('referer')?.includes('/admin');

      const pageData = await CmsService.getPageBySlug(slug, isAdmin);
      
      return Response.json({
        success: true,
        data: pageData // Will be null if not found
      }, { status: 200 });

    } catch (error) {
      const isNotFound = error.message.includes('not found');
      return Response.json({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }, { status: isNotFound ? 404 : 500 });
    }
  }

  /**
   * GET /api/cms/faqs?category=general
   */
  static async getFaqs(req) {
    try {
      const { searchParams } = new URL(req.url);
      const category = searchParams.get('category') || 'general';

      const faqs = await CmsService.getFaqs(category);
      
      return Response.json({
        success: true,
        data: faqs
      }, { status: 200 });

    } catch (error) {
      return Response.json({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }, { status: 500 });
    }
  }

  /**
   * ADMIN: POST /api/admin/cms/pages
   * Create or Update a CMS Page
   */
  static async upsertPage(req) {
    try {
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;
      
      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      const body = await req.json();
      const page = await CmsService.upsertPage(body);

      return Response.json({ success: true, data: page }, { status: 200 });
    } catch (error) {
      const isValidation = error.message.includes('required');
      return Response.json({ success: false, message: error.message }, { status: isValidation ? 400 : 500 });
    }
  }

  /**
   * ADMIN: POST /api/admin/cms/faqs
   * Create or Update an FAQ
   */
  static async upsertFaq(req) {
    try {
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;
      
      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      const body = await req.json();
      const faq = await CmsService.upsertFaq(body);

      return Response.json({ success: true, data: faq }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
