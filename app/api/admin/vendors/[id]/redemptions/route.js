import { RedemptionsController } from '@/modules/redemptions/redemptions.controller.js';

/**
 * GET /api/admin/vendors/[id]/redemptions
 * Fetch full lifetime redemption history for a specific vendor (admin-only)
 */
export async function GET(req, { params }) {
  return await RedemptionsController.getVendorRedemptionHistory(req, { params });
}
