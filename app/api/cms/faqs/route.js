import { CmsController } from '@/modules/cms/cms.controller.js';

export async function GET(req) {
  return await CmsController.getFaqs(req);
}
