import { AdminController } from '@/modules/admin/admin.controller.js';

export async function PATCH(req, context) {
  return AdminController.approveAd(req, context);
}

export async function POST(req, context) {
  return AdminController.approveAd(req, context);
}
