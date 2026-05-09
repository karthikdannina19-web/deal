import { UserAppController } from '@/modules/user-app/user-app.controller.js';

/**
 * GET /api/banners?sectionId=...
 * Fetch active banners for a section
 */
export async function GET(req) {
  return UserAppController.banners(req);
}
