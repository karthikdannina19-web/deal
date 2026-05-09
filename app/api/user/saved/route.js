import { UserAppController } from '@/modules/user-app/user-app.controller.js';

export async function GET(req) {
  return UserAppController.getSavedAds(req);
}

export async function POST(req) {
  return UserAppController.saveAd(req);
}

export async function DELETE(req) {
  return UserAppController.unsaveAd(req);
}
