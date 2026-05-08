import { NotificationController } from '@/modules/notifications/notification.controller.js';

export async function POST(req) {
  return await NotificationController.saveDeviceToken(req);
}
