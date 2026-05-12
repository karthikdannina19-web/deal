import { VendorController } from '@/modules/vendor/vendor.controller.js';

/**
 * POST /api/vendor/delete-account
 * Handles vendor account deletion
 */
export async function POST(req) {
  return await VendorController.deleteAccount(req);
}
