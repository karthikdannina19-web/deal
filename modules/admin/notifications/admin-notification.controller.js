import { AdminNotificationService } from './admin-notification.service.js';
import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import { dbConnect } from '../../../config/database.js';

/**
 * Admin Notification Controller
 * Manages admin-initiated notification broadcasts
 */
export class AdminNotificationController {
  /**
   * POST /api/admin/notifications/send
   * Broadcasts a notification to all users or login-only users
   */
  static async sendBroadcast(req) {
    try {
      await dbConnect();

      // 1. Security Check: Admin Only
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      // 2. Parse and Validate Body
      let body;
      try {
        body = await req.json();
      } catch (err) {
        return Response.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
      }

      const { title, body: messageBody, type, imageUrl, action, targetType } = body;

      if (!title || !messageBody) {
        return Response.json({ 
          success: false, 
          message: 'Title and Body are required for notifications' 
        }, { status: 400 });
      }

      // targetType validation (all vs login_only)
      const validTargets = ['all', 'login_only'];
      const target = validTargets.includes(targetType) ? targetType : 'all';

      // 3. Invoke Service
      const result = await AdminNotificationService.sendBroadcast({
        title,
        body: messageBody,
        type,
        imageUrl,
        action,
        targetType: target,
        sentBy: user.id
      });

      return Response.json({
        success: true,
        message: `Notification broadcast sent successfully to ${result.totalNotified} users`,
        data: result
      }, { status: 200 });

    } catch (error) {
      console.error('[AdminNotificationController.sendBroadcast Error]', error);
      return Response.json({ 
        success: false, 
        message: 'Failed to send notification broadcast',
        error: error.message 
      }, { status: 500 });
    }
  }

  /**
   * GET /api/admin/notifications/broadcasts
   * Fetches the history of broadcasts
   */
  static async listBroadcasts(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      const broadcasts = await AdminNotificationService.listBroadcasts();

      return Response.json({
        success: true,
        broadcasts
      }, { status: 200 });

    } catch (error) {
      console.error('[AdminNotificationController.listBroadcasts Error]', error);
      return Response.json({ 
        success: false, 
        message: 'Failed to fetch broadcast history' 
      }, { status: 500 });
    }
  }
}
