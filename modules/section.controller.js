import Section from '@/models/section.model.js';
import Ad from '@/models/ad.model.js';
import Banner from '@/models/banner.model.js';
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

      const section = await Section.findOne({ slug, isActive: true })
        .select('_id name slug')
        .lean();
      if (!section) {
        return Response.json({ success: false, message: 'Section not found' }, { status: 404 });
      }

      const [banners, ads, total] = await Promise.all([
        Banner.find({ section: section._id, isActive: true })
          .select('_id section title image viewUrl whatsappLink storeLink order isActive')
          .sort({ order: 1 })
          .lean(),

        Ad.find({ section: section._id, status: 'approved' })
          .select('_id section title category images status vendor')
          .populate('vendor', 'storeName location state district mandal locationCoordinates media fullAddress _id')
          .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        Ad.countDocuments({ section: section._id, status: 'approved' }),
      ]);

      const mappedAds = ads.map(ad => ({
        id: ad._id,
        title: ad.title,
        category: ad.category || 'General',
        storeId: ad.vendor?._id || null,
        storeName: ad.vendor?.storeName || '',
        storeSummary: {
          businessName: ad.vendor?.storeName || '',
          logoImage: ad.vendor?.media?.thumbnailUrl || '',
          fullAddress: ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', ') || ''
        },
        image: { url: ad.images?.[0]?.url || '' },
        status: ad.status
      }));

      return Response.json({
        success: true,
        data: {
          section,
          banners,
          ads: mappedAds,
        },
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
