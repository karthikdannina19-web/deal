import { VendorController } from "@/modules/vendor/vendor.controller.js";

/**
 * POST /api/vendor/subscription-plans/purchase
 * Initialize a subscription purchase (creates Razorpay order)
 */
export async function POST(req) {
  return await VendorController.purchaseSubscription(req);
}
