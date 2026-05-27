import Vendor from '@/models/vendor.model.js';
import Ad from '@/models/ad.model.js';
import Banner from '@/models/banner.model.js';
import Category from '@/models/category.model.js';
import Section from '@/models/section.model.js';
import { VisibilityService } from '@/services/visibility.service.js';
import { SectionVisibilityService } from '@/services/section-visibility.service.js';

function buildVendorPayload(vendor) {
  return {
    id: vendor._id,
    storeName: vendor.storeName || '',
    storeAbout: vendor.storeAbout || '',
    fullAddress: vendor.fullAddress || '',
    location: vendor.location || {},
    media: vendor.media || {},
    visibilityLevel: vendor.visibilityLevel,
  };
}

function buildAdPayload(ad) {
  return {
    id: ad._id,
    title: ad.title,
    description: ad.description,
    category: ad.category,
    images: ad.images || [],
    url: ad.url || '',
    price: ad.price ?? null,
    priceType: ad.priceType || 'fixed',
    views: ad.showViews === false ? null : (ad.views || 0),
    clicks: ad.showClicks === false ? null : (ad.clicks || 0),
    visibilityLevel: ad.visibilityLevel,
    vendor: ad.vendor ? {
      id: ad.vendor._id,
      storeName: ad.vendor.storeName || '',
      fullAddress: ad.vendor.fullAddress || '',
      location: ad.vendor.location || {},
      media: ad.vendor.media || {},
    } : null,
  };
}

function buildBannerPayload(banner) {
  return {
    id: banner._id,
    title: banner.title || '',
    image: banner.image || null,
    section: banner.section ? {
      id: banner.section._id,
      name: banner.section.name,
    } : null,
    viewUrl: banner.viewUrl || '',
    whatsappLink: banner.whatsappLink || '',
    storeLink: banner.storeLink || '',
    visibilityLevel: banner.visibilityLevel,
  };
}

function buildCategoryPayload(category) {
  return {
    id: category._id,
    name: category.name,
    iconUrl: category.iconUrl || '',
    imageUrl: category.imageUrl || '',
    section: category.sectionId ? {
      id: category.sectionId._id || category.sectionId,
      name: category.sectionId.name || '',
      slug: category.sectionId.slug || '',
    } : null,
    visibilityLevel: category.visibilityLevel,
  };
}

function buildSectionPayload(section) {
  return {
    id: section._id,
    name: section.name,
    slug: section.slug,
    description: section.description || '',
    image: section.image || null,
    banner: section.banner || null,
    order: section.order || 0,
    visibilityLevel: section.visibilityLevel,
  };
}

export class HomeFeedService {
  static STALE_LOCATION_MS = 24 * 60 * 60 * 1000;

  static getFreshUserLocation(user) {
    if (!user?.stateId || !user?.districtId || !user?.mandalId || !user?.locationUpdatedAt) {
      return null;
    }

    const age = Date.now() - new Date(user.locationUpdatedAt).getTime();
    if (age > this.STALE_LOCATION_MS) {
      return null;
    }

    return {
      stateId: user.stateId,
      districtId: user.districtId,
      mandalId: user.mandalId,
    };
  }

  static async getHomeFeed({ user, vendorLimit = 20, adLimit = 20, bannerLimit = 20, categoryLimit = 50, sectionLimit = 50 }) {
    const location = this.getFreshUserLocation(user);

    const [vendors, ads, banners, sections, categories] = await Promise.all([
      Vendor.find(
        VisibilityService.buildMatchQuery(location, {
          status: 'active',
          is_deleted: { $ne: true },
        })
      )
        .sort({ createdAt: -1 })
        .limit(vendorLimit)
        .lean(),
      Ad.find(
        VisibilityService.buildMatchQuery(location, {
          section: { $ne: null },
          status: 'approved',
        })
      )
        .populate('vendor', 'storeName fullAddress location media')
        .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
        .limit(adLimit)
        .lean(),
      Banner.find(
        VisibilityService.buildMatchQuery(location, {
          isActive: true,
          section: { $ne: null },
        })
      )
        .populate('section', 'name')
        .sort({ isTopBanner: -1, order: 1, createdAt: -1 })
        .limit(bannerLimit)
        .lean(),
      SectionVisibilityService.getVisibleSections({ userLocation: location }),
      Category.find(
        VisibilityService.buildMatchQuery(location, {
          isActive: true,
          sectionId: { $ne: null },
        })
      )
        .populate('sectionId', 'name slug order')
        .sort({ name: 1 })
        .limit(categoryLimit)
        .lean(),
    ]);

    return {
      sections: sections.slice(0, sectionLimit).map(buildSectionPayload),
      categories: categories.map(buildCategoryPayload),
      vendors: vendors.map(buildVendorPayload),
      ads: ads.map(buildAdPayload),
      banners: banners.map(buildBannerPayload),
    };
  }
}
