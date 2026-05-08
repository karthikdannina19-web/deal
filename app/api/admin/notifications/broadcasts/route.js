import { AdminNotificationController } from '@/modules/admin/notifications/admin-notification.controller.js';

/**
 * GET /api/admin/notifications/broadcasts
 * Admin-only broadcast history
 */
export async function GET(req) {
  return await AdminNotificationController.listBroadcasts(req);
}
