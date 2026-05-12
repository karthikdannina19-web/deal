import { VendorController } from '@/modules/vendor/vendor.controller.js';

/**
 * DELETE /api/vendor/account
 * Handles vendor account deletion
 */
export async function DELETE(req) {
  return await VendorController.deleteAccount(req);
}
