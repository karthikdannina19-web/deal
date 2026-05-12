import { CmsController } from '@/modules/cms/cms.controller.js';

export async function GET(req, context) {
  return await CmsController.getPage(req, context);
}
