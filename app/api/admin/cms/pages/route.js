import { CmsController } from '@/modules/cms/cms.controller.js';

/**
 * POST /api/admin/cms/pages
 * Create or Update CMS Page
 */
export async function POST(req) {
  return await CmsController.upsertPage(req);
}
