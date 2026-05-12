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
   */
  static async getPageBySlug(slug) {
    await dbConnect();
    const page = await CmsPage.findOne({ slug, isActive: true }).select('slug title content contentType updatedAt').lean();
    
    if (!page) {
      throw new Error('Page not found or is inactive');
    }

    return {
      slug: page.slug,
      title: page.title,
      lastUpdated: page.updatedAt,
      contentType: page.contentType,
      content: page.content, // HTML structure or JSON
      isActive: true
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
    const { slug, title, content, contentType, isActive } = data;
    
    if (!slug || !title || !content) {
      throw new Error('Slug, title, and content are required');
    }

    const page = await CmsPage.findOneAndUpdate(
      { slug },
      { title, content, contentType: contentType || 'html', isActive: isActive !== false },
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
