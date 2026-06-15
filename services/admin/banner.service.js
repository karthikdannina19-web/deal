import Banner from '@/models/banner.model.js';
import { uploadToS3 } from '@/services/s3.service.js';
import { LocationMasterService } from '@/services/location-master.service.js';
import { VisibilityService } from '@/services/visibility.service.js';

/**
 * Banner Service (Admin)
 */
export const BannerService = {
  /**
   * List banners (optional filter by section)
   */
  listBanners: async (filters = {}) => {
    const query = {};
    if (filters.sectionId) query.section = filters.sectionId;
    if (filters.categoryId) query.categoryId = filters.categoryId;
    if (filters.placementType) query.placementType = filters.placementType;
    if (filters.visibilityLevel) query.visibilityLevel = filters.visibilityLevel;
    if (filters.stateId) query.visibilityStateId = filters.stateId;
    if (filters.districtId) query.visibilityDistrictId = filters.districtId;
    if (filters.mandalId) query.visibilityMandalId = filters.mandalId;
    return await Banner.find(query)
      .populate('section', 'name')
      .populate('categoryId', 'name sectionId')
      .sort({ section: 1, order: 1 });
  },

  /**
   * Create new banner
   */
  createBanner: async (data) => {
    const visibility = VisibilityService.normalizeVisibilityPayload({
      visibilityLevel: data.visibilityLevel,
      visibilityStateId: data.visibilityStateId,
      visibilityDistrictId: data.visibilityDistrictId,
      visibilityMandalId: data.visibilityMandalId,
      visibilityEnabled: data.visibilityEnabled,
    });

    if (visibility.visibilityStateId) {
      await LocationMasterService.validateHierarchy({
        stateId: visibility.visibilityStateId,
        districtId: visibility.visibilityDistrictId,
        mandalId: visibility.visibilityMandalId,
      });
    }

    const banner = new Banner({
      ...data,
      placementType: data.placementType || 'section',
      isTopBanner: (data.placementType || 'section') === 'home_top',
      ...visibility,
    });
    await banner.save();
    await banner.populate('section', 'name');
    await banner.populate('categoryId', 'name sectionId');
    return banner;
  },

  /**
   * Update banner
   */
  updateBanner: async (id, data) => {
    const hasVisibilityUpdate = [
      'visibilityLevel',
      'visibilityStateId',
      'visibilityDistrictId',
      'visibilityMandalId',
      'visibilityEnabled',
    ].some((key) => Object.prototype.hasOwnProperty.call(data, key));

    if (hasVisibilityUpdate) {
      const visibility = VisibilityService.normalizeVisibilityPayload({
        visibilityLevel: data.visibilityLevel,
        visibilityStateId: data.visibilityStateId,
        visibilityDistrictId: data.visibilityDistrictId,
        visibilityMandalId: data.visibilityMandalId,
        visibilityEnabled: data.visibilityEnabled,
      });

      if (visibility.visibilityStateId) {
        await LocationMasterService.validateHierarchy({
          stateId: visibility.visibilityStateId,
          districtId: visibility.visibilityDistrictId,
          mandalId: visibility.visibilityMandalId,
        });
      }

      data.visibilityLevel = visibility.visibilityLevel;
      data.visibilityStateId = visibility.visibilityStateId;
      data.visibilityDistrictId = visibility.visibilityDistrictId;
      data.visibilityMandalId = visibility.visibilityMandalId;
      data.visibilityEnabled = visibility.visibilityEnabled;
    }

    if (Object.prototype.hasOwnProperty.call(data, 'placementType')) {
      data.isTopBanner = data.placementType === 'home_top';
      if (data.placementType === 'home_top') {
        data.categoryId = null;
      }
    }
    const banner = await Banner.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    if (!banner) throw new Error('Banner not found');
    await banner.populate('section', 'name');
    await banner.populate('categoryId', 'name sectionId');
    return banner;
  },

  /**
   * Delete banner
   */
  deleteBanner: async (id) => {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) throw new Error('Banner not found');
    return { success: true };
  },

  /**
   * Upload banner image
   */
  uploadBannerImage: async (fileBuffer, fileName, mimeType, sectionId) => {
    const folder = `sections/${sectionId}/banners`;
    return await uploadToS3(fileBuffer, folder, fileName, mimeType);
  }
};
