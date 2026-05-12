import { CmsController } from '@/modules/cms/cms.controller.js';

/**
 * POST /api/admin/cms/faqs
 * Create or Update FAQ
 */
export async function POST(req) {
  return await CmsController.upsertFaq(req);
}
