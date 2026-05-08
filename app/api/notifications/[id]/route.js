import { NotificationController } from '@/modules/notifications/notification.controller.js';

export async function DELETE(req, { params }) {
  return await NotificationController.deleteOne(req, { params });
}
