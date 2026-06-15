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
    const query = VisibilityService.buildMatchQuery(userLocation, {
      isActive: true,
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

    return Banner.find(query);
  }
}
