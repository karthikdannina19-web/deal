import { dbConnect } from '@/config/database.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import { UserAppService } from './user-app.service.js';

export class UserAppController {
  static async sections() {
    await dbConnect();
    const data = await UserAppService.listSections();
    return Response.json({ success: true, data }, { status: 200 });
  }

  static async banners(req, { topOnly = false } = {}) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const data = await UserAppService.listBanners({
      section: searchParams.get('section') || searchParams.get('sectionId'),
      state: searchParams.get('state'),
      district: searchParams.get('district'),
      mandal: searchParams.get('mandal'),
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      topOnly,
    });
    return Response.json({ success: true, data }, { status: 200 });
  }

  static async ads(req) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const auth = await authenticate(req);
    const userId = auth?.user?.id;

    const data = await UserAppService.listAds({
      section: searchParams.get('section') || searchParams.get('sectionId'),
      category: searchParams.get('category'),
      state: searchParams.get('state'),
      district: searchParams.get('district'),
      mandal: searchParams.get('mandal'),
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      savedOnly: searchParams.get('savedOnly') === 'true',
      userId,
    });
    return Response.json({ success: true, data }, { status: 200 });
  }

  static async bannerView(req, { params }) {
    await dbConnect();
    const { id } = await params;
    const item = await UserAppService.incrementBannerView(id);
    if (!item) return Response.json({ success: false, message: 'Banner not found' }, { status: 404 });
    return Response.json({ success: true, viewCount: item.clicks || 0 }, { status: 200 });
  }

  static async adView(req, { params }) {
    await dbConnect();
    const { id } = await params;
    const item = await UserAppService.incrementAdView(id);
    if (!item) return Response.json({ success: false, message: 'Ad not found' }, { status: 404 });
    return Response.json({ success: true, viewCount: item.views || 0 }, { status: 200 });
  }

  static async categories() {
    await dbConnect();
    const categories = await UserAppService.listCategories();
    return Response.json({ success: true, categories }, { status: 200 });
  }

  static async coupons() {
    await dbConnect();
    const data = await UserAppService.listCoupons();
    const items = data.map((c) => ({
      id: c._id,
      title: c.title,
      subtitle: c.subtitle || '',
      category: c.category || '',
      image: c.imageUrl || '',
      couponCode: c.isCodeUserSpecific ? null : c.couponCode || '',
      isActive: !!c.isActive,
    }));
    return Response.json({ success: true, data: items }, { status: 200 });
  }

  static async couponCode(req, { params }) {
    await dbConnect();
    const { id } = await params;
    const coupon = await UserAppService.getCouponCode(id);
    if (!coupon) return Response.json({ success: false, message: 'Coupon not found' }, { status: 404 });
    return Response.json({ success: true, data: { id: coupon._id, couponCode: coupon.couponCode || '' } }, { status: 200 });
  }

  static async saveAd(req) {
    await dbConnect();
    const { user, error } = await authenticate(req);
    if (error) return error;
    const { adId } = await req.json();
    if (!adId) return Response.json({ success: false, message: 'adId is required' }, { status: 400 });
    const result = await UserAppService.saveAd(user.id, adId);
    return Response.json({ success: true, savedAds: result?.savedAds || [] }, { status: 200 });
  }

  static async unsaveAd(req) {
    await dbConnect();
    const { user, error } = await authenticate(req);
    if (error) return error;
    const { adId } = await req.json();
    if (!adId) return Response.json({ success: false, message: 'adId is required' }, { status: 400 });
    const result = await UserAppService.unsaveAd(user.id, adId);
    return Response.json({ success: true, savedAds: result?.savedAds || [] }, { status: 200 });
  }

  static async getSavedAds(req) {
    await dbConnect();
    const { user, error } = await authenticate(req);
    if (error) return error;
    const data = await UserAppService.getSavedAds(user.id);
    return Response.json({ success: true, data }, { status: 200 });
  }

  static async sectionInsights() {
    await dbConnect();
    const data = await UserAppService.sectionAdInsights();
    return Response.json({ success: true, data }, { status: 200 });
  }
}
