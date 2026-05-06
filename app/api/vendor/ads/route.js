import { VendorController } from "@/modules/vendor/vendor.controller.js";

/**
 * POST /api/vendor/ads
 * Vendor creates a new ad (deducts 1 credit)
 */
export async function POST(req) {
  return await VendorController.createAd(req);
}
