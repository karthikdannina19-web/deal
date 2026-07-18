import { dbConnect } from '@/config/database.js';
import { authenticate, authorize } from '@/middleware/auth.middleware.js';
import UserSubscription from '@/models/userSubscription.model.js';

function formatDate(date) {
  return date ? new Date(date).toISOString().slice(0, 10) : null;
}

function getCurrentStatus(subscription) {
  if (!['active', 'trial'].includes(subscription.status)) {
    return subscription.status;
  }

  const expiresAt = subscription.status === 'trial'
    ? subscription.trialEndDate || subscription.endDate
    : subscription.endDate;

  return expiresAt && new Date(expiresAt).getTime() < Date.now()
    ? 'expired'
    : subscription.status;
}

function getPaymentStatus(status) {
  return status === 'completed' ? 'paid' : status;
}

export async function GET(req) {
  try {
    await dbConnect();

    const { user, error: authError } = await authenticate(req);
    if (authError) return authError;

    const roleError = authorize(user, ['vendor']);
    if (roleError) return roleError;

    const subscriptions = await UserSubscription.find({ user: user.id })
      .populate('plan', 'name slug')
      .sort({ createdAt: -1 })
      .lean();

    const origin = new URL(req.url).origin;

    const data = subscriptions.map((subscription) => ({
      id: subscription._id.toString(),
      plan_id: subscription.plan?._id?.toString() || subscription.plan?.toString() || null,
      plan_name: subscription.planSnapshot?.name || subscription.plan?.name || 'Subscription Plan',
      plan_slug: subscription.planSnapshot?.slug || subscription.plan?.slug || null,
      status: getCurrentStatus(subscription),
      start_date: formatDate(subscription.startDate),
      end_date: formatDate(subscription.trialEndDate || subscription.endDate),
      amount: subscription.finalAmount ?? subscription.amount ?? subscription.planSnapshot?.price ?? 0,
      currency: subscription.planSnapshot?.currency || 'INR',
      credits_allocated: subscription.creditsAllocated ?? 0,
      credits_used: subscription.creditsUsed ?? 0,
      credits_remaining: subscription.creditsRemaining ?? 0,
      payment_status: getPaymentStatus(subscription.paymentStatus),
      transaction_id: subscription.razorpayPaymentId
        || subscription.paymentId
        || subscription.razorpayOrderId
        || null,
      purchased_at: subscription.createdAt ? new Date(subscription.createdAt).toISOString() : null,
      invoice_url: subscription.paymentStatus === 'completed'
        ? `${origin}/api/vendor/subscription-history/${subscription._id}/invoice`
        : null,
    }));

    return Response.json({
      status: true,
      message: data.length
        ? 'Subscription history fetched successfully'
        : 'No subscription history found',
      data,
    }, { status: 200 });
  } catch (error) {
    console.error('[VendorSubscriptionHistory GET Error]', error);
    return Response.json({
      status: false,
      message: 'Failed to fetch subscription history',
      data: [],
    }, { status: 500 });
  }
}
