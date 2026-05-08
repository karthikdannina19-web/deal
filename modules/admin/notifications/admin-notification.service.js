import User from '../../../models/user.model.js';
import Notification from '../../../models/notification.model.js';
import Broadcast from '../../../models/broadcast.model.js';

/**
 * Admin Notification Service
 * Handles bulk broadcasting of notifications to user segments
 */
export class AdminNotificationService {
  /**
   * Send a broadcast notification to a specific segment of users
   * @param {Object} broadcastData 
   * @returns {Object} { totalNotified, targetType }
   */
  static async sendBroadcast({ title, body, type, imageUrl, action, targetType, sentBy }) {
    // 1. Determine Target Users
    let userQuery = {};
    
    if (targetType === 'login_only') {
      userQuery = { 
        status: 'active',
        lastLoginAt: { $ne: null }
      };
    } else {
      userQuery = { status: { $ne: 'deleted' } };
    }

    const users = await User.find(userQuery).select('_id').lean();
    
    if (users.length === 0) {
      return { totalNotified: 0, targetType };
    }

    // 2. Prepare Bulk Notifications
    const notificationsToInsert = users.map(user => ({
      userId: user._id,
      type: type || 'welcome',
      title,
      body,
      imageUrl: imageUrl || null,
      isUnread: true,
      action: action || { type: 'none' }
    }));

    // 3. Execute Bulk Insert
    const result = await Notification.insertMany(notificationsToInsert, { ordered: false });

    // 4. Record Broadcast History
    await Broadcast.create({
      title,
      body,
      type: type || 'welcome',
      targetType,
      imageUrl: imageUrl || null,
      action: action || { type: 'none' },
      totalNotified: result.length,
      sentBy
    });

    return {
      totalNotified: result.length,
      targetType
    };
  }

  /**
   * Get broadcast history
   */
  static async listBroadcasts() {
    return await Broadcast.find({})
      .sort({ createdAt: -1 })
      .populate('sentBy', 'firstName lastName email')
      .lean();
  }
}
