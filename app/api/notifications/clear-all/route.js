import { NotificationController } from '@/modules/notifications/notification.controller.js';

export async function DELETE(req) {
  return await NotificationController.clearAll(req);
}
