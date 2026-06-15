import User from '../../../models/user.model.js';
import Notification from '../../../models/notification.model.js';
import Broadcast from '../../../models/broadcast.model.js';
import { PushNotificationService } from '@/services/push-notification.service.js';
import mongoose from 'mongoose';

/**
 * Admin Notification Service
 * Handles bulk broadcasting of notifications to user segments with optional location targeting
 */
export class AdminNotificationService {
  /**
   * Send a broadcast notification to a specific segment of users
   * Supports location targeting: all | state | district | mandal
   * @param {Object} broadcastData 
   * @returns {Object} { totalNotified, targetType, visibilityScope }
   */
  static async sendBroadcast({
    title, body, type, imageUrl, action, targetType,
    visibilityScope, stateId, districtId, mandalId,
    sentBy
  }) {
    // 1. Determine Target Users — base query
    let userQuery = {};

    if (targetType === 'login_only') {
      userQuery = {
        status: 'active',
        lastLoginAt: { $ne: null }
      };
    } else {
      userQuery = { status: { $ne: 'deleted' } };
    }

    // 2. Apply Location Scope Filter on top of the base query
    const scope = visibilityScope || 'all';

    if (scope === 'state' && stateId && mongoose.Types.ObjectId.isValid(stateId)) {
      userQuery.stateId = new mongoose.Types.ObjectId(stateId);
    } else if (scope === 'district' && districtId && mongoose.Types.ObjectId.isValid(districtId)) {
      userQuery.districtId = new mongoose.Types.ObjectId(districtId);
    } else if (scope === 'mandal' && mandalId && mongoose.Types.ObjectId.isValid(mandalId)) {
      userQuery.mandalId = new mongoose.Types.ObjectId(mandalId);
    }

    const users = await User.find(userQuery).select('_id fcmTokens').lean();

    if (users.length === 0) {
      return { totalNotified: 0, targetType, visibilityScope: scope };
    }

    // 3. Prepare Bulk Notifications
    const notificationsToInsert = users.map(user => ({
      userId: user._id,
      type: type || 'welcome',
      title,
      body,
      imageUrl: imageUrl || null,
      isUnread: true,
      action: action || { type: 'none' }
    }));

    // 4. Execute Bulk Insert
    const result = await Notification.insertMany(notificationsToInsert, { ordered: false });

    // 5. Trigger push notifications for users who have active FCM tokens
    const deviceTokens = PushNotificationService.extractValidTokensFromUsers(users);
    const pushDelivery = await PushNotificationService.sendToTokens(deviceTokens, {
      title,
      body,
      type: type || 'welcome',
      imageUrl: imageUrl || null,
      action: action || { type: 'none' },
    });

    // 6. Record Broadcast History (with location targeting data)
    await Broadcast.create({
      title,
      body,
      type: type || 'welcome',
      targetType,
      imageUrl: imageUrl || null,
      action: action || { type: 'none' },
      totalNotified: result.length,
      sentBy,
      // Location fields
      visibilityScope: scope,
      stateId: (scope === 'state' && stateId) ? stateId : null,
      districtId: (scope === 'district' && districtId) ? districtId : null,
      mandalId: (scope === 'mandal' && mandalId) ? mandalId : null,
    });

    return {
      totalNotified: result.length,
      targetType,
      visibilityScope: scope,
      push: {
        tokensTargeted: pushDelivery.tokensTargeted,
        successCount: pushDelivery.successCount,
        failureCount: pushDelivery.failureCount,
        invalidTokensCleaned: pushDelivery.invalidTokens.length,
      },
    };
  }

  /**
   * Get broadcast history (with populated location names)
   */
  static async listBroadcasts() {
    return await Broadcast.find({})
      .sort({ createdAt: -1 })
      .populate('sentBy', 'firstName lastName email')
      .populate('stateId', 'name')
      .populate('districtId', 'name')
      .populate('mandalId', 'name')
      .lean();
  }
}
