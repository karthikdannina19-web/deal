import { dbConnect } from '@/config/database.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import User from '@/models/user.model.js';
import { HomeFeedService } from '@/services/home-feed.service.js';

export async function GET(req) {
  try {
    await dbConnect();

    const { user, error } = await authenticate(req);
    if (error) return error;

    const authUser = await User.findById(user.id)
      .select('stateId districtId mandalId locationUpdatedAt')
      .lean();

    const { searchParams } = new URL(req.url);
    const vendorLimit = Math.min(50, Math.max(1, Number(searchParams.get('vendorLimit')) || 20));
    const adLimit = Math.min(50, Math.max(1, Number(searchParams.get('adLimit')) || 20));
    const bannerLimit = Math.min(50, Math.max(1, Number(searchParams.get('bannerLimit')) || 20));
    const categoryLimit = Math.min(100, Math.max(1, Number(searchParams.get('categoryLimit')) || 50));
    const sectionLimit = Math.min(100, Math.max(1, Number(searchParams.get('sectionLimit')) || 50));

    const data = await HomeFeedService.getHomeFeed({
      user: authUser,
      vendorLimit,
      adLimit,
      bannerLimit,
      categoryLimit,
      sectionLimit,
    });

    return Response.json({
      success: true,
      data,
    }, { status: 200 });
  } catch (error) {
    const message = error.message || 'Failed to load home feed';
    const status = message === 'Location not set' ? 400 : message === 'Location stale' ? 409 : 500;

    return Response.json({
      success: false,
      message,
      data: {
        sections: [],
        categories: [],
        vendors: [],
        ads: [],
        banners: [],
      },
    }, { status });
  }
}
