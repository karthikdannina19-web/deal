import { NotificationController } from '@/modules/notifications/notification.controller.js';

export async function PATCH(req) {
  return await NotificationController.markReadAll(req);
}
