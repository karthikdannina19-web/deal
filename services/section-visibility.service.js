import Ad from '@/models/ad.model.js';
import Banner from '@/models/banner.model.js';
import Category from '@/models/category.model.js';
import Section from '@/models/section.model.js';
import { VisibilityService } from '@/services/visibility.service.js';
import { PriorityService } from '@/services/priority.service.js';

function normalizeSectionId(sectionId) {
  return sectionId || null;
}

export class SectionVisibilityService {
  static applyBannerPlacementFilter(query, placementType = 'section') {
    const existingOr = Array.isArray(query.$or) ? query.$or : null;

    let placementMatchers;
    if (placementType === 'home_top') {
      placementMatchers = [
        { placementType: 'home_top' },
        { placementType: { $exists: false }, isTopBanner: true },
        { placementType: null, isTopBanner: true },
      ];
    } else {
      placementMatchers = [
        { placementType: 'section' },
        { placementType: { $exists: false }, isTopBanner: { $ne: true } },
        { placementType: null, isTopBanner: { $ne: true } },
      ];
    }

    if (existingOr) {
      delete query.$or;
      query.$and = [
        { $or: existingOr },
        { $or: placementMatchers },
      ];
      return query;
    }

    query.$or = placementMatchers;
    return query;
  }

  static async getVisibleSections({ userLocation = null } = {}) {
    const sections = await Section.find(
      VisibilityService.buildMatchQuery(userLocation, {
        isActive: true,
      })
    ).lean();

    const ruleMap = await PriorityService.getEffectivePriorityMap(
      'section',
      sections.map((section) => section._id),
      userLocation
    );

    return PriorityService.sortItemsByPriority(
      sections,
      (section) => section._id,
      ruleMap,
      (left, right) => (left.order || 0) - (right.order || 0) || String(left.name || '').localeCompare(String(right.name || ''))
    );
  }

  static async getVisibleCategories({ userLocation = null, sectionId = null } = {}) {
    const query = VisibilityService.buildMatchQuery(userLocation, {
      isActive: true,
    });

    if (sectionId) {
      query.sectionId = sectionId;
    } else {
      query.sectionId = { $ne: null };
    }

    return Category.find(query)
      .populate('sectionId', 'name slug order')
      .sort({ name: 1 })
      .lean();
  }

  static filterAdsBySection({ userLocation = null, sectionId = null, categoryId = null, extraFilters = {} } = {}) {
    const query = VisibilityService.buildMatchQuery(userLocation, {
      status: 'approved',
      ...extraFilters,
    });

    if (sectionId) {
      query.section = normalizeSectionId(sectionId);
    } else {
      query.section = { $ne: null };
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    return Ad.find(query);
  }

  static filterBannersBySection({ userLocation = null, sectionId = null, categoryId = null, extraFilters = {} } = {}) {
    const placementType = extraFilters.placementType || 'section';
    const normalizedExtraFilters = { ...extraFilters };
    delete normalizedExtraFilters.placementType;

    const query = VisibilityService.buildMatchQuery(userLocation, {
      isActive: true,
      ...normalizedExtraFilters,
    });

    this.applyBannerPlacementFilter(query, placementType);

    if (sectionId) {
      query.section = normalizeSectionId(sectionId);
    } else if (placementType !== 'home_top') {
      query.section = { $ne: null };
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    return Banner.find(query);
  }
}
