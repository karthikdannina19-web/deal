import { UserAppController } from '@/modules/user-app/user-app.controller.js';

export async function GET(req, context) {
  return UserAppController.couponCode(req, context);
}
