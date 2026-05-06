import { VendorController } from "@/modules/vendor/vendor.controller.js";

/**
 * GET /api/vendor/subscription-plans
 * Fetch active subscription plans for vendors
 */
export async function GET(req) {
  return await VendorController.getSubscriptionPlans(req);
}
