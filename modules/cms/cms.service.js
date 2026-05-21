import CmsPage from '../../models/cms.model.js';
import Faq from '../../models/faq.model.js';
import { dbConnect } from '../../config/database.js';

/**
 * CMS Service
 * Handles data fetching for dynamic app content
 */
export class CmsService {
  /**
   * Get a specific CMS page by slug
   * @param {string} slug 
   * @param {boolean} includeInactive
   * @param {string} audience
   */
  static async getPageBySlug(slug, includeInactive = false, audience = 'user') {
    await dbConnect();
    const query = {
      slug,
      $or: [
        { audience },
        { audience: { $exists: false } }
      ]
    };
    if (!includeInactive) query.isActive = true;

    const page = await CmsPage.findOne(query)
      .sort({ updatedAt: -1 })
      .select('slug title content contentType audience updatedAt isActive')
      .lean();
    
    if (!page) {
      return null;
    }

    return {
      slug: page.slug,
      title: page.title,
      lastUpdated: page.updatedAt,
      contentType: page.contentType,
      audience: page.audience || 'user',
      content: page.content, // HTML structure or JSON
      isActive: page.isActive !== false
    };
  }

  /**
   * Get FAQs by category
   * @param {string} category 
   */
  static async getFaqs(category = 'general') {
    await dbConnect();
    const faqs = await Faq.find({ category, isActive: true })
      .select('question answer category sortOrder isActive')
      .sort({ sortOrder: 1 }) // Ascending order
      .lean();

    return faqs.map(faq => ({
      id: faq._id.toString(),
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      sortOrder: faq.sortOrder,
      isActive: faq.isActive
    }));
  }

  /**
   * ADMIN: Create or Update CMS Page
   */
  static async upsertPage(data) {
    await dbConnect();
    const { slug, title, content, contentType, audience, isActive } = data;
    
    if (!slug || !title || !content) {
      throw new Error('Slug, title, and content are required');
    }

    const page = await CmsPage.findOneAndUpdate(
      { slug, audience: audience || 'user' },
      {
        title,
        content,
        contentType: contentType || 'html',
        audience: audience || 'user',
        isActive: isActive !== false
      },
      { new: true, upsert: true }
    );
    
    return page;
  }

  /**
   * ADMIN: Create or Update FAQ
   */
  static async upsertFaq(data) {
    await dbConnect();
    const { id, question, answer, category, sortOrder, isActive } = data;
    
    if (!question || !answer) {
      throw new Error('Question and answer are required');
    }

    if (id) {
      const faq = await Faq.findByIdAndUpdate(
        id,
        { question, answer, category: category || 'general', sortOrder: sortOrder || 0, isActive: isActive !== false },
        { new: true }
      );
      if (!faq) throw new Error('FAQ not found');
      return faq;
    } else {
      const faq = new Faq({
        question, answer, category: category || 'general', sortOrder: sortOrder || 0, isActive: isActive !== false
      });
      await faq.save();
      return faq;
    }
  }
}
