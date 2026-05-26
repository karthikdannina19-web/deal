import Section from '@/models/section.model.js';
import Ad from '@/models/ad.model.js';
import { uploadToS3 } from '@/services/s3.service.js';

const slugify = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Section Service (Admin)
 * Handles CRUD for ad sections/tags.
 */
export const SectionService = {
  /**
   * List all sections
   */
  listSections: async (filters = {}) => {
    return await Section.find(filters).sort({ order: 1, createdAt: -1 });
  },

  /**
   * Get section by ID
   */
  getSectionById: async (id) => {
    const section = await Section.findById(id);
    if (!section) throw new Error('Section not found');
    return section;
  },

  /**
   * Create new section
   */
  createSection: async (data) => {
    try {
      console.log('[SectionService] Creating section with data:', data);
      const payload = { ...data };
      if (!payload.slug && payload.name) {
        payload.slug = slugify(payload.name);
      }

      const section = new Section(payload);
      await section.save();
      console.log('[SectionService] Successfully saved section:', section._id);
      return section;
    } catch (error) {
      console.error('[SectionService] Error saving section:', error);
      throw error;
    }
  },

  /**
   * Update section
   */
  updateSection: async (id, data) => {
    const updateData = { ...data };
    if (!updateData.slug && updateData.name) {
      updateData.slug = slugify(updateData.name);
    }

    const section = await Section.findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true });
    if (!section) throw new Error('Section not found');
    return section;
  },

  /**
   * Delete section
   */
  deleteSection: async (id) => {
    const section = await Section.findById(id);
    if (!section) throw new Error('Section not found');
    
    // Check if any ads are assigned to this section
    const adsCount = await Ad.countDocuments({ section: id });
    if (adsCount > 0) {
      throw new Error(`Cannot delete section: ${adsCount} ads are currently assigned to it.`);
    }

    await Section.findByIdAndDelete(id);
    return { success: true, message: 'Section deleted' };
  },

  /**
   * Upload asset (image or banner) for a section
   */
  uploadSectionAsset: async (fileBuffer, fileName, mimeType, sectionId, type = 'image') => {
    const folder = `sections/${sectionId}/${type}s`;
    return await uploadToS3(fileBuffer, folder, fileName, mimeType);
  },

  /**
   * Reorder sections
   */
  reorderSections: async (orders) => {
    // orders: [{ id: '...', order: 1 }, ...]
    const operations = orders.map(({ id, order }) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { order } }
      }
    }));

    await Section.bulkWrite(operations);
    return { success: true };
  },

  /**
   * Get section stats (ad counts)
   */
  getSectionStats: async () => {
    const now = new Date();
    const stats = await Ad.aggregate([
      {
        $match: {
          section: { $exists: true, $ne: null },
          status: 'approved',
          $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: null },
            { expiresAt: { $gte: now } }
          ]
        }
      },
      { $group: { _id: '$section', count: { $sum: 1 } } }
    ]);

    // Map stats back to sections
    const sections = await Section.find().lean();
    return sections.map(s => {
      const stat = stats.find(st => st._id.toString() === s._id.toString());
      return {
        ...s,
        adCount: stat ? stat.count : 0
      };
    });
  }
};
