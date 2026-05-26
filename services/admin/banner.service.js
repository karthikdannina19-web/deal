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
    if (filters.visibilityLevel) query.visibilityLevel = filters.visibilityLevel;
    if (filters.stateId) query.visibilityStateId = filters.stateId;
    if (filters.districtId) query.visibilityDistrictId = filters.districtId;
    if (filters.mandalId) query.visibilityMandalId = filters.mandalId;
    return await Banner.find(query)
      .populate('section', 'name')
      .sort({ section: 1, order: 1 });
  },

  /**
   * Create new banner
   */
  createBanner: async (data) => {
    VisibilityService.validateVisibilityPayload({
      visibilityLevel: data.visibilityLevel,
      stateId: data.visibilityStateId,
      districtId: data.visibilityDistrictId,
      mandalId: data.visibilityMandalId,
    });
    await LocationMasterService.validateHierarchy({
      stateId: data.visibilityStateId,
      districtId: data.visibilityDistrictId,
      mandalId: data.visibilityMandalId,
    });
    const banner = new Banner(data);
    await banner.save();
    await banner.populate('section', 'name');
    return banner;
  },

  /**
   * Update banner
   */
  updateBanner: async (id, data) => {
    if (data.visibilityLevel) {
      VisibilityService.validateVisibilityPayload({
        visibilityLevel: data.visibilityLevel,
        stateId: data.visibilityStateId,
        districtId: data.visibilityDistrictId,
        mandalId: data.visibilityMandalId,
      });
      await LocationMasterService.validateHierarchy({
        stateId: data.visibilityStateId,
        districtId: data.visibilityDistrictId,
        mandalId: data.visibilityMandalId,
      });
    }
    const banner = await Banner.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    if (!banner) throw new Error('Banner not found');
    await banner.populate('section', 'name');
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
