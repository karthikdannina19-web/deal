import { AdminController } from "@/modules/admin/admin.controller.js";

/**
 * GET /api/admin/payments/export
 * Download payments ledger as an Excel-readable file
 */
export async function GET(req) {
  return await AdminController.exportPayments(req);
}
