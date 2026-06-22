import { AdminController } from "@/modules/admin/admin.controller.js";

/**
 * GET /api/admin/vendors/export
 * Download vendor audit as an Excel-readable file
 */
export async function GET(req) {
  return await AdminController.exportVendors(req);
}
