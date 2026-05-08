import { AdminController } from "@/modules/admin/admin.controller.js";

/**
 * PATCH /api/admin/ads/[id]/section
 * Assign or update the section tag of an ad
 */
export async function PATCH(req, context) {
  return await AdminController.updateAdSection(req, context);
}
