import { AdminController } from '@/modules/admin/admin.controller.js';

export async function POST(req, context) {
  return AdminController.impersonateUser(req, context);
}
