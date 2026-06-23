import { AdminController } from '@/modules/admin/admin.controller.js';

export async function PATCH(req, context) {
  return AdminController.updateUser(req, context);
}

export async function DELETE(req, context) {
  return AdminController.updateUser(req, context);
}

export async function POST(req, context) {
  // allow POST to update for clients that can't use PATCH
  return AdminController.updateUser(req, context);
}
