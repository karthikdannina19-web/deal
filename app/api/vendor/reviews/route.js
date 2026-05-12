import { VendorController } from '@/modules/vendor/vendor.controller.js';

export async function GET(req) {
  return await VendorController.getReviews(req);
}
