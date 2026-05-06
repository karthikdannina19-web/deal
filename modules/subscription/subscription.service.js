import SubscriptionPlan from '../../models/subscriptionPlan.model.js';
import Subscription from '../../models/subscription.model.js';

/**
 * Subscription Service
 */
export class SubscriptionService {
  /**
   * Fetch all active subscription plans
   * Sorted by price ASC
   */
  static async getSubscriptionPlans() {
    return await SubscriptionPlan.find({ isActive: true, isPublic: true })
      .sort({ sortOrder: 1, price: 1 })
      .select('-__v'); // Exclude version key
  }

  /**
   * Get the current active or latest subscription for a vendor
   * @param {string} vendorId 
   */
  static async getCurrentVendorSubscription(vendorId) {
    // 1. Find latest subscription
    const sub = await Subscription.findOne({ vendorId })
      .sort({ createdAt: -1 })
      .populate('planId', 'name');

    if (!sub) return null;

    const now = new Date();
    const isActive = sub.expiryDate > now;
    const creditsRemaining = sub.creditsTotal - sub.creditsUsed;

    return {
      planName: sub.planId?.name || 'UNKNOWN',
      creditsTotal: sub.creditsTotal,
      creditsUsed: sub.creditsUsed,
      creditsRemaining: creditsRemaining > 0 ? creditsRemaining : 0,
      startDate: sub.startDate,
      expiryDate: sub.expiryDate,
      isActive
    };
  }
}
