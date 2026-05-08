import { NotificationController } from '@/modules/notifications/notification.controller.js';

export async function GET(req) {
  return await NotificationController.getUnreadCount(req);
}
