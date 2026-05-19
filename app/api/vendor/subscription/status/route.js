import { dbConnect } from '@/config/database.js';
import { authenticate } from '@/middleware/auth.middleware.js';
import { getActiveSubscription, autoExpireSubscriptions } from '@/services/subscription.service.js';
import UserSubscription from '@/models/userSubscription.model.js';

export async function GET(req) {
  try {
    await dbConnect();
    const { user, error: authError } = await authenticate(req);
    if (authError) return authError;

    // First auto-expire any old subscriptions
    await autoExpireSubscriptions(user.id);

    // Fetch the currently active subscription
    const activeSub = await getActiveSubscription(user.id);

    if (activeSub) {
      return Response.json({
        success: true,
        hasActivePlan: true,
        currentPlan: activeSub.planSnapshot?.name || 'Active Plan',
        remainingCredits: activeSub.creditsRemaining,
        expiryDate: activeSub.endDate,
        subscriptionStatus: activeSub.status, // 'active' or 'trial'
        isExpired: false
      }, { status: 200 });
    }

    // No active subscription. Check if they ever had one
    const pastSub = await UserSubscription.findOne({ user: user.id }).sort({ createdAt: -1 });

    if (pastSub) {
      return Response.json({
        success: true,
        hasActivePlan: false,
        currentPlan: pastSub.planSnapshot?.name || 'Previous Plan',
        remainingCredits: 0,
        expiryDate: pastSub.endDate,
        subscriptionStatus: 'expired',
        isExpired: true,
        message: 'Subscription Expired'
      }, { status: 200 });
    }

    // Never had a subscription
    return Response.json({
      success: true,
      hasActivePlan: false,
      currentPlan: null,
      remainingCredits: 0,
      expiryDate: null,
      subscriptionStatus: 'none',
      isExpired: false,
      message: 'Buy Subscription Plan'
    }, { status: 200 });

  } catch (error) {
    console.error('[VendorSubscriptionStatus GET Error]', error);
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
