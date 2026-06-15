import Vendor from '@/models/vendor.model.js';
import Ad from '@/models/ad.model.js';
import Banner from '@/models/banner.model.js';
import Category from '@/models/category.model.js';
import Section from '@/models/section.model.js';
import { VisibilityService } from '@/services/visibility.service.js';
import { SectionVisibilityService } from '@/services/section-visibility.service.js';
import { PriorityService } from '@/services/priority.service.js';

function buildVendorPayload(vendor, priorityRule = null) {
  return {
    id: vendor._id,
    storeName: vendor.storeName || '',
    storeAbout: vendor.storeAbout || '',
    fullAddress: vendor.fullAddress || '',
    location: vendor.location || {},
    media: vendor.media || {},
    visibilityLevel: vendor.visibilityLevel,
    resolvedPriority: priorityRule?.priority ?? null,
    priorityScopeLevel: priorityRule?.scopeLevel ?? null,
  };
}

function buildAdPayload(ad, priorityRule = null) {
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
    resolvedPriority: priorityRule?.priority ?? null,
    priorityScopeLevel: priorityRule?.scopeLevel ?? null,
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

function buildSectionPayload(section, priorityRule = null) {
  return {
    id: section._id,
    name: section.name,
    slug: section.slug,
    description: section.description || '',
    image: section.image || null,
    banner: section.banner || null,
    order: section.order || 0,
    visibilityLevel: section.visibilityLevel,
    resolvedPriority: priorityRule?.priority ?? null,
    priorityScopeLevel: priorityRule?.scopeLevel ?? null,
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

    const [vendorsRaw, adsRaw, banners, sectionsRaw, categories] = await Promise.all([
      Vendor.find(
        VisibilityService.buildMatchQuery(location, {
          status: 'active',
          is_deleted: { $ne: true },
        })
      )
        .sort({ createdAt: -1 })
        .lean(),
      Ad.find(
        VisibilityService.buildMatchQuery(location, {
          section: { $ne: null },
          status: 'approved',
        })
      )
        .populate('vendor', 'storeName fullAddress location media')
        .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
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

    const [vendorPriorityMap, adPriorityMap, sectionPriorityMap] = await Promise.all([
      PriorityService.getEffectivePriorityMap('vendor', vendorsRaw.map((vendor) => vendor._id), location),
      PriorityService.getEffectivePriorityMap('ad', adsRaw.map((ad) => ad._id), location),
      PriorityService.getEffectivePriorityMap('section', sectionsRaw.map((section) => section._id), location),
    ]);

    const vendors = PriorityService.sortItemsByPriority(
      vendorsRaw,
      (vendor) => vendor._id,
      vendorPriorityMap,
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    ).slice(0, vendorLimit);

    const ads = PriorityService.sortItemsByPriority(
      adsRaw,
      (ad) => ad._id,
      adPriorityMap,
      (left, right) => {
        if ((right.isFeatured ? 1 : 0) !== (left.isFeatured ? 1 : 0)) {
          return (right.isFeatured ? 1 : 0) - (left.isFeatured ? 1 : 0);
        }
        if ((right.priority || 0) !== (left.priority || 0)) {
          return (right.priority || 0) - (left.priority || 0);
        }
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }
    ).slice(0, adLimit);

    const sections = PriorityService.sortItemsByPriority(
      sectionsRaw,
      (section) => section._id,
      sectionPriorityMap,
      (left, right) => (left.order || 0) - (right.order || 0) || String(left.name || '').localeCompare(String(right.name || ''))
    ).slice(0, sectionLimit);

    return {
      sections: sections.map((section) => buildSectionPayload(section, sectionPriorityMap.get(String(section._id)) || null)),
      categories: categories.map(buildCategoryPayload),
      vendors: vendors.map((vendor) => buildVendorPayload(vendor, vendorPriorityMap.get(String(vendor._id)) || null)),
      ads: ads.map((ad) => buildAdPayload(ad, adPriorityMap.get(String(ad._id)) || null)),
      banners: banners.map(buildBannerPayload),
    };
  }
}
