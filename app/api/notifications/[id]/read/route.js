import { NotificationController } from '@/modules/notifications/notification.controller.js';

export async function PATCH(req, { params }) {
  return await NotificationController.markRead(req, { params });
}
