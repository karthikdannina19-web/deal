import { UserAppController } from '@/modules/user-app/user-app.controller.js';

export async function GET(req) {
  return UserAppController.banners(req, { topOnly: true });
}
