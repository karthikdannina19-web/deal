import Notification from '../../models/notification.model.js';
import User from '../../models/user.model.js';
import { PushNotificationService } from '../../services/push-notification.service.js';

/**
 * Notification Service
 * Handles business logic for notifications and device tokens
 */
export class NotificationService {
  static normalizeToken(token = '') {
    return typeof token === 'string' ? token : '';
  }

  static isValidDeviceToken(token) {
    if (!token) return false;
    if (token.length <= 15) return false;
    if (token !== token.trim()) return false;
    if (token.startsWith('test_fcm_token_')) return false;
    if (token.toLowerCase().includes('dummy')) return false;
    return true;
  }

  /**
   * List notifications for a user with pagination
   * @param {string} userId 
   * @param {Object} options { page, limit, unreadOnly, type }
   */
  static async listNotifications(userId, { page = 1, limit = 20, unreadOnly = false, type } = {}) {
    const query = { userId };
    
    if (unreadOnly === 'true' || unreadOnly === true) {
      query.isUnread = true;
    }
    
    if (type) {
      query.type = type;
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const limitNum = Math.max(1, Number(limit));

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isUnread: true })
    ]);

    return {
      notifications,
      pagination: {
        page: Number(page),
        limit: limitNum,
        total,
        hasMore: total > skip + notifications.length
      },
      unreadCount
    };
  }

  /**
   * Mark a single notification as read
   */
  static async markAsRead(userId, notificationId) {
    const result = await Notification.updateOne(
      { _id: notificationId, userId },
      { $set: { isUnread: false } }
    );
    
    if (result.matchedCount === 0) {
      throw new Error('Notification not found or unauthorized');
    }
    
    return true;
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId) {
    await Notification.updateMany(
      { userId, isUnread: true },
      { $set: { isUnread: false } }
    );
    return true;
  }

  /**
   * Clear all notifications for a user
   */
  static async clearAll(userId) {
    await Notification.deleteMany({ userId });
    return true;
  }

  /**
   * Delete a single notification
   */
  static async deleteNotification(userId, notificationId) {
    const result = await Notification.deleteOne({ _id: notificationId, userId });
    
    if (result.deletedCount === 0) {
      throw new Error('Notification not found or unauthorized');
    }
    
    return true;
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId) {
    const count = await Notification.countDocuments({ userId, isUnread: true });
    return count;
  }

  /**
   * Save or update FCM device token for a user
   */
  static async saveDeviceToken(userId, token, platform) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const normalizedToken = this.normalizeToken(token);
    if (!this.isValidDeviceToken(normalizedToken)) {
      throw new Error('Invalid device token');
    }

    // Remove token if it exists elsewhere in the user's tokens to avoid duplicates
    user.fcmTokens = user.fcmTokens.filter(t => t.token !== normalizedToken);

    // Add new token
    user.fcmTokens.push({
      token: normalizedToken,
      platform,
      lastUsedAt: new Date()
    });

    // Keep only last 5 tokens to prevent bloating
    if (user.fcmTokens.length > 5) {
      user.fcmTokens = user.fcmTokens.slice(-5);
    }

    await user.save();
    return true;
  }

  /**
   * Remove an existing FCM device token for a user
   */
  static async removeDeviceToken(userId, token) {
    const normalizedToken = this.normalizeToken(token);
    if (!normalizedToken) return false;

    const result = await User.updateOne(
      { _id: userId },
      { $pull: { fcmTokens: { token: normalizedToken } } }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Create an in-app notification record and optionally send an FCM push.
   *
   * @param {string} userId        - The target user's MongoDB ID
   * @param {object} opts
   * @param {string} opts.type     - Notification type (must match model enum)
   * @param {string} opts.title    - Notification title
   * @param {string} opts.body     - Notification body text
   * @param {string} [opts.imageUrl]
   * @param {object} [opts.action] - { type: 'route'|'external'|'none', target, params }
   * @param {object} [opts.metadata] - Extra payload for the push data field
   * @returns {Promise<object>} Created Notification document
   */
  static async sendVendorNotification(userId, { type, title, body, imageUrl = null, action = { type: 'none' }, metadata = {} } = {}) {
    // 1. Persist to database (always)
    const notification = await Notification.create({
      userId,
      type,
      title,
      body,
      imageUrl,
      action,
      isUnread: true,
    });

    // 2. Try FCM push (non-blocking — failure must not break the caller)
    try {
      const user = await User.findById(userId).select('fcmTokens').lean();
      const tokens = PushNotificationService.extractValidTokensFromUsers(user ? [user] : []);
      if (tokens.length > 0) {
        await PushNotificationService.sendToTokens(tokens, {
          title,
          body,
          type,
          notificationId: notification._id.toString(),
          imageUrl: imageUrl || '',
          action,
          metadata,
        });
      }
    } catch (pushErr) {
      console.error('[NotificationService.sendVendorNotification] FCM push failed (non-fatal):', pushErr.message);
    }

    return notification;
  }
}
