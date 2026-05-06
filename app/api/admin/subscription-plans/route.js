import { AdminController } from "@/modules/admin/admin.controller.js";

/**
 * POST /api/admin/subscription-plans
 * Create a new subscription plan
 */
export async function POST(req) {
  return await AdminController.createSubscriptionPlan(req);
}

/**
 * GET /api/admin/subscription-plans
 * List all active subscription plans
 */
export async function GET(req) {
  return await AdminController.getSubscriptionPlans(req);
}
