import { AdminController } from "@/modules/admin/admin.controller.js";

/**
 * GET /api/admin/ads
 * List ads for moderation
 */
export async function GET(req) {
  return await AdminController.getPendingAds(req);
}
