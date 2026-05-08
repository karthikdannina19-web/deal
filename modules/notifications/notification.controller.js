import { NotificationService } from './notification.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { dbConnect } from '../../config/database.js';

/**
 * Notification Controller
 * Orchestrates notification requests
 */
export class NotificationController {
  /**
   * GET /api/notifications
   */
  static async list(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const { searchParams } = new URL(req.url);
      const page = searchParams.get('page') || 1;
      const limit = searchParams.get('limit') || 20;
      const unreadOnly = searchParams.get('unreadOnly');
      const type = searchParams.get('type');

      const result = await NotificationService.listNotifications(user.id, {
        page,
        limit,
        unreadOnly,
        type
      });

      return Response.json({
        success: true,
        notifications: result.notifications,
        pagination: result.pagination,
        unreadCount: result.unreadCount
      }, { status: 200 });

    } catch (error) {
      console.error('[NotificationController.list Error]', error);
      return Response.json({ success: false, message: 'Failed to fetch notifications' }, { status: 500 });
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   */
  static async markRead(req, { params }) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const { id } = await params;
      await NotificationService.markAsRead(user.id, id);

      return Response.json({
        success: true,
        message: 'Notification marked as read'
      }, { status: 200 });

    } catch (error) {
      console.error('[NotificationController.markRead Error]', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return Response.json({ success: false, message: error.message }, { status });
    }
  }

  /**
   * PATCH /api/notifications/read-all
   */
  static async markReadAll(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      await NotificationService.markAllAsRead(user.id);

      return Response.json({
        success: true,
        message: 'All notifications marked as read'
      }, { status: 200 });

    } catch (error) {
      console.error('[NotificationController.markReadAll Error]', error);
      return Response.json({ success: false, message: 'Failed to mark all as read' }, { status: 500 });
    }
  }

  /**
   * DELETE /api/notifications/clear-all
   */
  static async clearAll(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      await NotificationService.clearAll(user.id);

      return Response.json({
        success: true,
        message: 'All notifications cleared'
      }, { status: 200 });

    } catch (error) {
      console.error('[NotificationController.clearAll Error]', error);
      return Response.json({ success: false, message: 'Failed to clear notifications' }, { status: 500 });
    }
  }

  /**
   * DELETE /api/notifications/:id
   */
  static async deleteOne(req, { params }) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const { id } = await params;
      await NotificationService.deleteNotification(user.id, id);

      return Response.json({
        success: true,
        message: 'Notification deleted'
      }, { status: 200 });

    } catch (error) {
      console.error('[NotificationController.deleteOne Error]', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return Response.json({ success: false, message: error.message }, { status });
    }
  }

  /**
   * GET /api/notifications/unread-count
   */
  static async getUnreadCount(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const unreadCount = await NotificationService.getUnreadCount(user.id);

      return Response.json({
        success: true,
        unreadCount
      }, { status: 200 });

    } catch (error) {
      console.error('[NotificationController.getUnreadCount Error]', error);
      return Response.json({ success: false, message: 'Failed to fetch unread count' }, { status: 500 });
    }
  }

  /**
   * POST /api/notifications/device-token
   */
  static async saveDeviceToken(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const body = await req.json();
      const { token, platform } = body;

      if (!token) {
        return Response.json({ success: false, message: 'Device token is required' }, { status: 400 });
      }

      await NotificationService.saveDeviceToken(user.id, token, platform || 'android');

      return Response.json({
        success: true,
        message: 'Device token saved successfully'
      }, { status: 200 });

    } catch (error) {
      console.error('[NotificationController.saveDeviceToken Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
