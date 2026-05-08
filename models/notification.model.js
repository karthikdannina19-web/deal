import mongoose from 'mongoose';

/**
 * Notification Model
 * Stores user-specific in-app notifications
 */
const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'flash_deal', 'coins_earned', 'store_update', 'offer_expiring', 
        'welcome', 'cashback', 'referral_bonus', 'deal_reminder', 
        'profile_updated', 'daily_checkin', 'nearby_store', 'order_reward', 
        'survey', 'security', 'food_offer'
      ],
      default: 'welcome',
    },
    title: { 
      type: String, 
      required: true,
      trim: true 
    },
    body: { 
      type: String, 
      required: true,
      trim: true 
    },
    imageUrl: { 
      type: String, 
      default: null 
    },
    isUnread: { 
      type: Boolean, 
      default: true 
    },
    action: {
      type: { 
        type: String, 
        enum: ['route', 'external', 'none'], 
        default: 'none' 
      },
      target: { 
        type: String, 
        default: null 
      },
      params: { 
        type: Map, 
        of: String, 
        default: {} 
      }
    },
  },
  { 
    timestamps: true 
  }
);

// Index for faster unread counting and listing
notificationSchema.index({ userId: 1, isUnread: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
