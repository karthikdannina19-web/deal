import Banner from '@/models/banner.model.js';
import { dbConnect } from '@/config/database.js';

/**
 * GET /api/banners?sectionId=...
 * Fetch active banners for a section
 */
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId');
    const slug = searchParams.get('slug');

    let query = { isActive: true };

    if (sectionId) {
      query.section = sectionId;
    } else if (slug) {
      // Find section by slug first if sectionId not provided
      const Section = (await import('@/models/section.model.js')).default;
      const section = await Section.findOne({ slug });
      if (section) query.section = section._id;
    }

    const banners = await Banner.find(query).sort({ order: 1 });
    return Response.json({ success: true, data: banners }, { status: 200 });
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
