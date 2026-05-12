import { VendorController } from '@/modules/vendor/vendor.controller.js';

/**
 * POST /api/vendor/logout
 * Handles vendor logout
 */
export async function POST(req) {
  return await VendorController.logout(req);
}
