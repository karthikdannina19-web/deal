import Banner from '@/models/banner.model.js';
import { uploadToS3 } from '@/services/s3.service.js';

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
    if (filters.state) query.state = filters.state;
    if (filters.district) query.district = filters.district;
    if (filters.mandal) query.mandal = filters.mandal;
    return await Banner.find(query)
      .populate('section', 'name')
      .sort({ section: 1, order: 1 });
  },

  /**
   * Create new banner
   */
  createBanner: async (data) => {
    const banner = new Banner(data);
    await banner.save();
    return banner;
  },

  /**
   * Update banner
   */
  updateBanner: async (id, data) => {
    const banner = await Banner.findByIdAndUpdate(id, data, { new: true });
    if (!banner) throw new Error('Banner not found');
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
