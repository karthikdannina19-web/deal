import { AdminController } from '@/modules/admin/admin.controller.js';

/**
 * PATCH /api/admin/subscription-plans/:id
 * Update one subscription plan.
 */
export async function PATCH(req, { params }) {
  const { id } = await params;
  return AdminController.updateSubscriptionPlan(req, id);
}
