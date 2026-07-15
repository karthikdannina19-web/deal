import { dbConnect } from '@/config/database.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import { UserAppService } from './user-app.service.js';
import { LocationResolverService } from '@/services/location-resolver.service.js';
import { LocationMasterService } from '@/services/location-master.service.js';
import { VisibilityService } from '@/services/visibility.service.js';
import User from '@/models/user.model.js';

export class UserAppController {
  static async resolveRequestLocation({ req, authUser = null }) {
    const { searchParams } = new URL(req.url);

    const queryStateId = searchParams.get('stateId');
    const queryDistrictId = searchParams.get('districtId');
    const queryMandalId = searchParams.get('mandalId');
    if (queryStateId) {
      return {
        stateId: queryStateId,
        districtId: queryDistrictId || null,
        mandalId: queryMandalId || null,
      };
    }

    const normalizedAuthLocation = VisibilityService.getUserLocation(authUser);
    if (normalizedAuthLocation) {
      return normalizedAuthLocation;
    }

    const lat = Number(searchParams.get('lat') || searchParams.get('latitude'));
    const lng = Number(searchParams.get('lng') || searchParams.get('longitude'));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      try {
        const resolved = await LocationResolverService.resolveCoordinates({ latitude: lat, longitude: lng });
        return {
          stateId: resolved.state._id,
          districtId: resolved.district._id,
          mandalId: resolved.mandal._id,
        };
      } catch {
        // fall through
      }
    }

    const queryState = searchParams.get('state');
    const queryDistrict = searchParams.get('district');
    const queryMandal = searchParams.get('mandal');
    if (queryState && queryDistrict && queryMandal) {
      try {
        const resolved = await LocationMasterService.findByNames({
          state: queryState,
          district: queryDistrict,
          mandal: queryMandal,
          autoCreateMissingDistrict: false,
          autoCreateMissingMandal: false,
        });
        return {
          stateId: resolved.state._id,
          districtId: resolved.district._id,
          mandalId: resolved.mandal._id,
        };
      } catch {
        return null;
      }
    }

    return null;
  }

  static async sections(req) {
    await dbConnect();
    const authHeader = req.headers.get('authorization');
    const auth = authHeader ? await authenticate(arguments[0]) : { user: null, error: null };
    if (auth?.error && authHeader) return auth.error;
    const authUser = auth?.user?.id
      ? await User.findById(auth.user.id).select('stateId districtId mandalId').lean()
      : null;
    const userLocation = await this.resolveRequestLocation({ req, authUser });
    const sections = await UserAppService.listSections({ userLocation });
    const data = sections.map((section) => {
      const imageUrl = section.image?.url || '';
      const bannerUrl = section.banner?.url || imageUrl;
      return {
        ...section,
        id: section._id,
        image: { ...(section.image || {}), url: imageUrl },
        banner: { ...(section.banner || {}), url: bannerUrl },
        imageUrl,
        iconUrl: imageUrl,
        bannerUrl,
      };
    });
    return Response.json({ success: true, data }, { status: 200 });
  }

  static async banners(req, { topOnly = false } = {}) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const auth = authHeader ? await authenticate(req) : { user: null, error: null };
    if (auth?.error && authHeader) return auth.error;
    const authUser = auth?.user?.id
      ? await User.findById(auth.user.id).select('stateId districtId mandalId').lean()
      : null;
    const userLocation = await this.resolveRequestLocation({ req, authUser });
    const data = await UserAppService.listBanners({
      section: searchParams.get('section') || searchParams.get('sectionId'),
      state: searchParams.get('state'),
      district: searchParams.get('district'),
      mandal: searchParams.get('mandal'),
      lat: searchParams.get('lat') || searchParams.get('latitude'),
      lng: searchParams.get('lng') || searchParams.get('longitude'),
      topOnly,
      userLocation,
    });
    return Response.json({ success: true, data }, { status: 200 });
  }

  static async ads(req) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const authHeader = req.headers.get('authorization');
    const auth = authHeader ? await authenticate(req) : { user: null, error: null };
    if (auth?.error && authHeader) return auth.error;
    const userId = auth?.user?.id;
    const authUser = userId
      ? await User.findById(userId).select('stateId districtId mandalId').lean()
      : null;

    const userLocation = await this.resolveRequestLocation({ req, authUser });
    const data = await UserAppService.listAds({
      section: searchParams.get('section') || searchParams.get('sectionId'),
      category: searchParams.get('category'),
      state: searchParams.get('state'),
      district: searchParams.get('district'),
      mandal: searchParams.get('mandal'),
      lat: searchParams.get('lat') || searchParams.get('latitude'),
      lng: searchParams.get('lng') || searchParams.get('longitude'),
      savedOnly: searchParams.get('savedOnly') === 'true',
      userId,
      userLocation,
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
    // Return null if vendor disabled view counter visibility
    return Response.json({
      success: true,
      viewCount: item.showViews !== false ? (item.views || 0) : null
    }, { status: 200 });
  }

  static async adClick(req, { params }) {
    await dbConnect();
    const { id } = await params;
    const item = await UserAppService.incrementAdClick(id);
    if (!item) return Response.json({ success: false, message: 'Ad not found' }, { status: 404 });
    // Return null if vendor disabled click counter visibility
    return Response.json({
      success: true,
      clickCount: item.showClicks !== false ? (item.clicks || 0) : null
    }, { status: 200 });
  }

  static async categories(req) {
    await dbConnect();
    const authHeader = req.headers.get('authorization');
    const auth = authHeader ? await authenticate(req) : { user: null, error: null };
    if (auth?.error && authHeader) return auth.error;
    const authUser = auth?.user?.id
      ? await User.findById(auth.user.id).select('stateId districtId mandalId').lean()
      : null;
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId') || searchParams.get('section');
    const location = await this.resolveRequestLocation({ req, authUser });

    const categories = await UserAppService.listCategories({
      userLocation: location,
      sectionId,
    });

    const baseMapped = categories
      .filter((c) => c.name && c.name.trim().length > 0 && c.isActive)
      .map((c) => ({
        ...c,
        id: c._id,
        _id: c._id,
        name: c.name,
        isActive: !!c.isActive,
        icon: c.iconUrl || '',
        image: c.imageUrl || c.iconUrl || '',
        iconUrl: c.iconUrl || c.imageUrl || '',
        imageUrl: c.imageUrl || c.iconUrl || '',
        bannerUrl: c.imageUrl || '',
        section: c.sectionId ? {
          id: c.sectionId._id,
          name: c.sectionId.name,
          slug: c.sectionId.slug,
        } : null,
      }));

    let mapped = baseMapped;
    if (location && mapped.length < 4) {
      const fallbackCategories = await UserAppService.listCategories({ userLocation: null, sectionId });
      const fallbackMapped = fallbackCategories
        .filter((c) => c.name && c.name.trim().length > 0 && c.isActive)
        .map((c) => ({
          ...c,
          id: c._id,
          _id: c._id,
          name: c.name,
          isActive: !!c.isActive,
          icon: c.iconUrl || '',
          image: c.imageUrl || c.iconUrl || '',
          iconUrl: c.iconUrl || c.imageUrl || '',
          imageUrl: c.imageUrl || c.iconUrl || '',
          bannerUrl: c.imageUrl || '',
          section: c.sectionId ? {
            id: c.sectionId._id,
            name: c.sectionId.name,
            slug: c.sectionId.slug,
          } : null,
        }));

      const existingIds = new Set(mapped.map((cat) => String(cat._id)));
      for (const category of fallbackMapped) {
        if (mapped.length >= 4) break;
        if (!existingIds.has(String(category._id))) {
          mapped.push(category);
          existingIds.add(String(category._id));
        }
      }
    }

    return Response.json({ success: true, categories: mapped, data: mapped }, { status: 200 });
  }

  static async coupons(req) {
    try {
      await dbConnect();
      const authHeader = req.headers.get('authorization');
      const auth = authHeader ? await authenticate(req) : { user: null, error: null };
      if (auth?.error && authHeader) return auth.error;
      const authUser = auth?.user?.id
        ? await User.findById(auth.user.id).select('stateId districtId mandalId').lean()
        : null;
      const userLocation = await this.resolveRequestLocation({ req, authUser });
      const { searchParams } = new URL(req.url);
      const page = searchParams.get('page') || 1;
      const limit = searchParams.get('limit') || 20;
      const category = searchParams.get('category') || undefined;
      const sortBy = searchParams.get('sortBy') || 'order';
      const sortOrder = searchParams.get('sortOrder') || 'asc';
      const activeParam = searchParams.get('isActive');
      const isActive = activeParam === null ? true : activeParam === 'true';

      const { items: data, pagination } = await UserAppService.listCoupons({
        page,
        limit,
        category,
        isActive,
        sortBy,
        sortOrder,
        userLocation,
      });
      const items = data.map((c) => {
        let safeCtaLink = c.ctaLink || '';
        if (safeCtaLink) {
          try {
            safeCtaLink = new URL(safeCtaLink).toString();
          } catch {
            safeCtaLink = '';
          }
        }

        return {
          id: c._id,
          _id: c._id,
          name: c.title,
          title: c.title,
          description: c.subtitle || '',
          subtitle: c.subtitle || '',
          category: c.category || '',
          image: c.imageUrl || '',
          imageUrl: c.imageUrl || '',
          couponCode: c.isCodeUserSpecific ? null : c.couponCode || '',
          isActive: !!c.isActive,
          sortOrder: c.order || 0,
          order: c.order || 0,
          expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString() : null,
          storeName: c.storeName || '',
          terms: c.terms || '',
          ctaLink: safeCtaLink,
          visibilityScope: c.visibilityScope || 'all',
          stateId: c.stateId || null,
          districtId: c.districtId || null,
          mandalId: c.mandalId || null,
        };
      });
      return Response.json({
        success: true,
        data: {
          coupons: items,
          total: pagination.total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: pagination.totalPages,
        },
      }, { status: 200 });
    } catch {
      return Response.json({
        success: true,
        data: {
          coupons: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
        message: 'Coupons unavailable, returned empty data.',
      }, { status: 200 });
    }
  }

  static async couponCode(req, { params }) {
    try {
      await dbConnect();
      const { id } = await params;
      const authHeader = req.headers.get('authorization');
      const auth = authHeader ? await authenticate(req) : { user: null, error: null };
      if (auth?.error && authHeader) return auth.error;
      const authUser = auth?.user?.id
        ? await User.findById(auth.user.id).select('stateId districtId mandalId').lean()
        : null;
      const userLocation = await this.resolveRequestLocation({ req, authUser });
      const coupon = await UserAppService.getCouponCode(id, userLocation);
      if (!coupon) return Response.json({ success: false, message: 'Coupon not found' }, { status: 404 });
      return Response.json({ success: true, data: { id: coupon._id, couponCode: coupon.couponCode || '' } }, { status: 200 });
    } catch {
      return Response.json({ success: false, message: 'Coupon not found' }, { status: 404 });
    }
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
    const authUser = await User.findById(user.id).select('stateId districtId mandalId').lean();
    const data = await UserAppService.getSavedAds(user.id, VisibilityService.getUserLocation(authUser));
    return Response.json({ success: true, data }, { status: 200 });
  }

  static async sectionInsights() {
    await dbConnect();
    const data = await UserAppService.sectionAdInsights();
    return Response.json({ success: true, data }, { status: 200 });
  }
}
