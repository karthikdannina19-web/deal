import { AdminController } from "@/modules/admin/admin.controller.js";

/**
 * PATCH /api/admin/ads/[id]/approve
 * Approve or reject an ad
 */
export async function PATCH(req, context) {
  return await AdminController.approveAd(req, context);
}
