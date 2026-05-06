import { VendorController } from "@/modules/vendor/vendor.controller.js";

/**
 * GET /api/vendor/ads/credits
 * Fetch remaining ad credits for vendor
 */
export async function GET(req) {
  return await VendorController.getAdCredits(req);
}
