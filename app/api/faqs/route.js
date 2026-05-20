import { dbConnect } from '@/config/database';
import Faq from '@/models/faq.model';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const section = searchParams.get('section');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const query = { isActive: true };
    if (section) {
      query.category = section.toLowerCase();
    }

    const [faqs, total] = await Promise.all([
      Faq.find(query).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Faq.countDocuments(query)
    ]);

    const formattedFaqs = faqs.map(faq => ({
      id: faq._id,
      section: faq.category,
      question: faq.question,
      answer: faq.answer,
      order: faq.sortOrder,
      isActive: faq.isActive,
      updatedAt: faq.updatedAt
    }));

    return Response.json({
      success: true,
      message: 'FAQs fetched successfully',
      data: formattedFaqs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return Response.json({
      success: false,
      message: 'Failed to fetch FAQs'
    }, { status: 500 });
  }
}
