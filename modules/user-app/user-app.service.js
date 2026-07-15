import Ad from '@/models/ad.model.js';
import Banner from '@/models/banner.model.js';
import Category from '@/models/category.model.js';
import Coupon from '@/models/coupon.model.js';
import User from '@/models/user.model.js';
import '@/models/vendor.model.js';
import mongoose from 'mongoose';
import { VisibilityService } from '@/services/visibility.service.js';
import { SectionVisibilityService } from '@/services/section-visibility.service.js';
import { PriorityService } from '@/services/priority.service.js';
import { calculateDistanceKm, getOfferCoordinates, parseCoordinate } from '@/utils/offer-location.js';

function num(v, fallback = 999999) {
  return Number.isFinite(v) ? v : fallback;
}
function normalizeText(v) {
  return (v || '').toString().trim().toLowerCase();
}

function locationMatches(doc, filters) {
  const stateOk = !filters.state || normalizeText(doc.state) === normalizeText(filters.state);
  const districtOk = !filters.district || normalizeText(doc.district) === normalizeText(filters.district);
  const mandalOk = !filters.mandal || normalizeText(doc.mandal) === normalizeText(filters.mandal);
  return stateOk && districtOk && mandalOk;
}

function mapBanner(banner) {
  const imageUrl = banner.image?.url || '';
  return {
    id: banner._id,
    _id: banner._id,
    sectionId: banner.section?._id || banner.section || null,
    title: banner.title || '',
    image: { url: imageUrl },
    imageUrl,
    bannerUrl: imageUrl,
    mediaUrl: imageUrl,
    locationLabel: banner.locationLabel || banner.location || '',
    distanceKm: num(parseCoordinate(banner.distanceKm), null),
    viewCount: banner.clicks || 0,
    whatsappLink: banner.whatsappLink || '',
    viewUrl: banner.viewUrl || '',
    storeLink: banner.storeLink || '',
    order: banner.order || 0,
    isActive: !!banner.isActive,
  };
}

function mapAd(ad) {
  const imageUrl = ad.primaryImage || ad.images?.[0]?.url || '';
  const { latitude, longitude } = getOfferCoordinates(ad);
  return {
    id: ad._id,
    _id: ad._id,
    sectionId: ad.section?._id || ad.section || null,
    title: ad.title,
    category: ad.category || 'General',
    image: { url: imageUrl },
    imageUrl,
    storeId: ad.vendor?._id || null,
    storeName: ad.vendor?.storeName || '',
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    storeAddress: ad.vendor?.fullAddress || '',
    storeSummary: {
      businessName: ad.vendor?.storeName || '',
      logoImage: ad.vendor?.media?.thumbnailUrl || '',
      fullAddress: ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', ') || ''
    },
    store: {
      storeName: ad.vendor?.storeName || '',
      location: {
        lat: latitude,
        lng: longitude,
      },
      locationCoordinates: {
        lat: latitude,
        lng: longitude,
      },
    },
    storeDetails: {
      location: {
        lat: latitude,
        lng: longitude,
      },
      locationCoordinates: {
        lat: latitude,
        lng: longitude,
      },
    },
    vendor: ad.vendor ? {
      ...ad.vendor,
      locationCoordinates: {
        ...(ad.vendor.locationCoordinates || {}),
        lat: latitude,
        lng: longitude,
      },
    } : null,
    locationLabel: ad.vendor?.fullAddress || [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', '),
    distanceKm: num(parseCoordinate(ad.distanceKm), null),
    // viewCount: null means vendor disabled view counter — hide the widget in the UI
    viewCount: ad.showViews !== false ? (ad.views || 0) : null,
    // clickCount: null means vendor disabled click counter — hide the widget in the UI
    clickCount: ad.showClicks !== false ? (ad.clicks || 0) : null,
    resolvedPriority: ad._resolvedPriority ?? null,
    priorityScopeLevel: ad._priorityScopeLevel ?? null,
    shareLink: ad.url || '',
    isActive: ad.status === 'approved',
  };
}

export class UserAppService {
  static async listSections({ userLocation = null } = {}) {
    return SectionVisibilityService.getVisibleSections({ userLocation });
  }

  static async listBanners({ section, state, district, mandal, lat, lng, topOnly = false, userLocation = null }) {
    const banners = await SectionVisibilityService.filterBannersBySection({
      userLocation,
      sectionId: topOnly ? null : section || null,
      extraFilters: topOnly ? { placementType: 'home_top', isTopBanner: true } : {},
    })
      .populate('section', '_id name order')
      .populate('categoryId', '_id name sectionId')
      .sort({ order: 1 })
      .lean();
    const filteredBanners = userLocation
      ? banners
      : banners.filter((b) => locationMatches(b, { state, district, mandal }));
    const limitedBanners = topOnly ? filteredBanners.slice(0, 1) : filteredBanners;

    return limitedBanners
      .map((b) => ({
        ...b,
        distanceKm: calculateDistanceKm(
          parseCoordinate(lat),
          parseCoordinate(lng),
          parseCoordinate(b.locationCoordinates?.lat),
          parseCoordinate(b.locationCoordinates?.lng)
        ),
      }))
      .map(mapBanner);
  }

  static async listAds({ section, category, state, district, mandal, lat, lng, savedOnly, userId, userLocation = null }) {
    const userLatitude = parseCoordinate(lat);
    const userLongitude = parseCoordinate(lng);
    const extraFilters = {};
    let categoryId = null;
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        categoryId = category;
      } else {
        extraFilters.category = category;
      }
    }
    if (savedOnly && userId) {
      const user = await User.findById(userId).select('savedAds').lean();
      extraFilters._id = { $in: user?.savedAds || [] };
    }

    const ads = await SectionVisibilityService.filterAdsBySection({
      userLocation,
      sectionId: section || null,
      categoryId,
      extraFilters,
    })
      .populate('section', '_id name order')
      .populate('categoryId', '_id name sectionId')
      .populate('vendor', 'storeName location state district mandal locationCoordinates media fullAddress _id')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const filtered = (userLocation ? ads : ads
      .filter((ad) => {
        const loc = {
          state: ad.vendor?.location?.state || ad.location?.state || ad.state,
          district: ad.vendor?.location?.district || ad.location?.district || ad.district,
          mandal: ad.vendor?.location?.mandal || ad.location?.city || ad.mandal,
        };
        return locationMatches(loc, { state, district, mandal });
      }))
      .map((ad) => {
        const { latitude, longitude } = getOfferCoordinates(ad);
        return {
          ...ad,
          distanceKm: calculateDistanceKm(
            userLatitude,
            userLongitude,
            latitude,
            longitude
          ),
        };
      });

    const ruleMap = await PriorityService.getEffectivePriorityMap(
      'ad',
      filtered.map((ad) => ad._id),
      userLocation
    );

    return PriorityService.sortItemsByPriority(
      filtered,
      (ad) => ad._id,
      ruleMap,
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ).map((ad) => {
      const rule = ruleMap.get(String(ad._id));
      return mapAd({
        ...ad,
        _resolvedPriority: rule?.priority ?? null,
        _priorityScopeLevel: rule?.scopeLevel ?? null,
      });
    });
  }

  static async incrementBannerView(id) {
    return Banner.findOneAndUpdate({ _id: id, isActive: true }, { $inc: { clicks: 1 } }, { returnDocument: 'after' });
  }

  static async incrementAdView(id) {
    return Ad.findOneAndUpdate({ _id: id, status: 'approved' }, { $inc: { views: 1 } }, { returnDocument: 'after' });
  }

  static async incrementAdClick(id) {
    return Ad.findOneAndUpdate({ _id: id, status: 'approved' }, { $inc: { clicks: 1 } }, { returnDocument: 'after' });
  }

  static async listCategories({ userLocation = null, sectionId = null } = {}) {
    const query = VisibilityService.buildMatchQuery(userLocation, { isActive: true });
    if (sectionId) {
      query.sectionId = sectionId;
    }

    return Category.find(query)
      .populate('sectionId', '_id name slug order')
      .sort({ name: 1 })
      .select('_id name iconUrl imageUrl isActive sectionId visibilityLevel')
      .lean();
  }

  static async listCoupons({ page = 1, limit = 20, category, isActive = true, sortBy = 'order', sortOrder = 'asc', userLocation = null }) {
    const query = VisibilityService.buildCouponVisibilityQuery(userLocation, {
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(category ? { category } : {}),
    });

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;
    const direction = String(sortOrder).toLowerCase() === 'desc' ? -1 : 1;
    const safeSortBy = ['order', 'createdAt', 'title', 'expiryDate'].includes(sortBy) ? sortBy : 'order';

    const [items, total] = await Promise.all([
      Coupon.find(query).sort({ [safeSortBy]: direction, createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
      Coupon.countDocuments(query),
    ]);

    return {
      items,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  static async getCouponCode(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Coupon.findOne({ _id: id, isActive: true }).lean();
  }

  static async saveAd(userId, adId) {
    return User.findByIdAndUpdate(userId, { $addToSet: { savedAds: adId } }, { returnDocument: 'after' }).select('savedAds').lean();
  }

  static async unsaveAd(userId, adId) {
    return User.findByIdAndUpdate(userId, { $pull: { savedAds: adId } }, { returnDocument: 'after' }).select('savedAds').lean();
  }

  static async getSavedAds(userId, userLocation = null) {
    const user = await User.findById(userId).select('savedAds').lean();
    if (!user) return [];
    const ads = await Ad.find(VisibilityService.buildMatchQuery(userLocation, {
      _id: { $in: user.savedAds || [] },
      status: 'approved',
    }))
      .populate('vendor', 'location')
      .lean({ virtuals: true });
    return ads.map(mapAd);
  }

  static async sectionAdInsights() {
    const rows = await Ad.aggregate([
      { $match: { status: 'approved', section: { $ne: null } } },
      {
        $group: {
          _id: '$section',
          adsCount: { $sum: 1 },
          totalViews: { $sum: '$views' },
          totalShares: { $sum: '$shares' },
        },
      },
      {
        $lookup: {
          from: 'sections',
          localField: '_id',
          foreignField: '_id',
          as: 'section',
        },
      },
      { $unwind: '$section' },
      { $project: { _id: 0, sectionId: '$section._id', sectionName: '$section.name', adsCount: 1, totalViews: 1, totalShares: 1 } },
      { $sort: { totalViews: -1 } },
    ]);
    return rows;
  }
}
