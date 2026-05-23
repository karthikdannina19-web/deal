import { AdminController } from "@/modules/admin/admin.controller.js";

/**
 * DELETE /api/admin/ads/[id]
 * Admin deletes an ad
 */
export async function DELETE(req, context) {
  return await AdminController.deleteAd(req, context);
}
