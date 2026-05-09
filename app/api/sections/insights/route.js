import { UserAppController } from '@/modules/user-app/user-app.controller.js';

export async function GET() {
  return UserAppController.sectionInsights();
}
