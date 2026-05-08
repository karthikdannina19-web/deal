import Section from '@/models/section.model.js';
import Ad from '@/models/ad.model.js';
import { dbConnect } from '@/config/database.js';

export class SectionController {
  /**
   * GET /api/sections
   * Fetch all active sections with banners
   */
  static async listSections(req) {
    try {
      await dbConnect();
      const sections = await Section.find({ isActive: true }).sort({ order: 1 });
      return Response.json({ success: true, data: sections }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/sections/[slug]/ads
   * Fetch ads for a specific section
   */
  static async getSectionAds(req, { params }) {
    try {
      await dbConnect();
      const { slug } = await params;
      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 20;
      const skip = (page - 1) * limit;

      const section = await Section.findOne({ slug, isActive: true });
      if (!section) {
        return Response.json({ success: false, message: 'Section not found' }, { status: 404 });
      }

      const [ads, total] = await Promise.all([
        Ad.find({ section: section._id, status: 'approved' })
          .populate('vendor', 'fullName storeName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Ad.countDocuments({ section: section._id, status: 'approved' })
      ]);

      return Response.json({
        success: true,
        data: {
          section,
          ads,
          total,
          page,
          totalPages: Math.ceil(total / limit)
        }
      }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
