import { VendorController } from "@/modules/vendor/vendor.controller.js";

/**
 * POST /api/vendor/subscription-plans/verify
 * Verify Razorpay payment and activate subscription
 */
export async function POST(req) {
  return await VendorController.verifyPayment(req);
}
