import { UserAppController } from '@/modules/user-app/user-app.controller.js';

export async function POST(req, context) {
  return UserAppController.bannerView(req, context);
}
