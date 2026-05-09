import Ad from '@/models/ad.model.js';
import Banner from '@/models/banner.model.js';
import Category from '@/models/category.model.js';
import Coupon from '@/models/coupon.model.js';
import Section from '@/models/section.model.js';
import User from '@/models/user.model.js';
import '@/models/vendor.model.js';

function num(v, fallback = 999999) {
  return Number.isFinite(v) ? v : fallback;
}
function distanceKm(lat1, lng1, lat2, lng2) {
  if (![lat1, lng1, lat2, lng2].every((v) => Number.isFinite(v))) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
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
  return {
    id: banner._id,
    sectionId: banner.section?._id || banner.section || null,
    title: banner.title || '',
    image: { url: banner.image?.url || '' },
    locationLabel: banner.locationLabel || banner.location || '',
    distanceKm: num(banner.distanceKm, null),
    viewCount: banner.clicks || 0,
    whatsappLink: banner.whatsappLink || '',
    viewUrl: banner.viewUrl || '',
    storeLink: banner.storeLink || '',
    order: banner.order || 0,
    isActive: !!banner.isActive,
  };
}

function mapAd(ad) {
  return {
    id: ad._id,
    sectionId: ad.section?._id || ad.section || null,
    title: ad.title,
    category: ad.category || 'General',
    image: { url: ad.primaryImage || ad.images?.[0]?.url || '' },
    locationLabel: [ad.vendor?.location?.mandal, ad.vendor?.location?.district, ad.vendor?.location?.state].filter(Boolean).join(', '),
    distanceKm: num(ad.distanceKm, null),
    viewCount: ad.views || 0,
    shareLink: ad.url || '',
    isActive: ad.status === 'approved',
  };
}

export class UserAppService {
  static async listSections() {
    return Section.find({ isActive: true }).sort({ order: 1 }).lean();
  }

  static async listBanners({ section, state, district, mandal, lat, lng, topOnly = false }) {
    const query = { isActive: true };
    if (section) query.section = section;
    if (topOnly) query.isTopBanner = true;
    const banners = await Banner.find(query).populate('section', '_id name order').sort({ order: 1 }).lean();
    return banners
      .filter((b) => locationMatches(b, { state, district, mandal }))
      .map((b) => ({
        ...b,
        distanceKm: distanceKm(Number(lat), Number(lng), b.locationCoordinates?.lat, b.locationCoordinates?.lng),
      }))
      .sort((a, b) => {
        const d = num(a.distanceKm) - num(b.distanceKm);
        if (d !== 0) return d;
        return (b.clicks || 0) - (a.clicks || 0);
      })
      .map(mapBanner);
  }

  static async listAds({ section, category, state, district, mandal, lat, lng, savedOnly, userId }) {
    const query = { status: 'approved' };
    if (section) query.section = section;
    if (category) query.category = category;
    if (savedOnly && userId) {
      const user = await User.findById(userId).select('savedAds').lean();
      query._id = { $in: user?.savedAds || [] };
    }

    const ads = await Ad.find(query)
      .populate('section', '_id name order')
      .populate('vendor', 'location state district mandal locationCoordinates')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const filtered = ads
      .filter((ad) => {
        const loc = {
          state: ad.vendor?.location?.state || ad.location?.state || ad.state,
          district: ad.vendor?.location?.district || ad.location?.district || ad.district,
          mandal: ad.vendor?.location?.mandal || ad.location?.city || ad.mandal,
        };
        return locationMatches(loc, { state, district, mandal });
      })
      .map((ad) => ({
        ...ad,
        distanceKm: distanceKm(
          Number(lat),
          Number(lng),
          ad.vendor?.locationCoordinates?.coordinates?.[1],
          ad.vendor?.locationCoordinates?.coordinates?.[0]
        ),
      }))
      .sort((a, b) => {
        const d = num(a.distanceKm) - num(b.distanceKm);
        if (d !== 0) return d;
        return (b.views || 0) - (a.views || 0);
      });
    return filtered.map(mapAd);
  }

  static async incrementBannerView(id) {
    return Banner.findOneAndUpdate({ _id: id, isActive: true }, { $inc: { clicks: 1 } }, { new: true });
  }

  static async incrementAdView(id) {
    return Ad.findOneAndUpdate({ _id: id, status: 'approved' }, { $inc: { views: 1 } }, { new: true });
  }

  static async listCategories() {
    return Category.find({ isActive: true }).sort({ name: 1 }).select('_id name iconUrl imageUrl isActive').lean();
  }

  static async listCoupons() {
    return Coupon.find({ isActive: true }).sort({ order: 1 }).lean();
  }

  static async getCouponCode(id) {
    return Coupon.findOne({ _id: id, isActive: true }).lean();
  }

  static async saveAd(userId, adId) {
    return User.findByIdAndUpdate(userId, { $addToSet: { savedAds: adId } }, { new: true }).select('savedAds').lean();
  }

  static async unsaveAd(userId, adId) {
    return User.findByIdAndUpdate(userId, { $pull: { savedAds: adId } }, { new: true }).select('savedAds').lean();
  }

  static async getSavedAds(userId) {
    const user = await User.findById(userId).select('savedAds').lean();
    if (!user) return [];
    const ads = await Ad.find({ _id: { $in: user.savedAds || [] }, status: 'approved' })
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
