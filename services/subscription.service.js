import SubscriptionPlan from '../models/subscriptionPlan.model.js';
import UserSubscription from '../models/userSubscription.model.js';
import User from '../models/user.model.js';
import Vendor from '../models/vendor.model.js';
import { NotificationService } from '../modules/notifications/notification.service.js';

/**
 * Subscription Service
 * Handles plan listing, purchase, credit allocation, and cancellation.
 */

// ==========================================
// PLANS
// ==========================================

/**
 * Get all active public plans
 * @returns {Promise<Array>} List of plans
 */
export async function getPlans() {
  return await SubscriptionPlan.getActivePlans();
}

/**
 * Get a single plan by slug or ID
 * @param {string} identifier - Plan slug or MongoDB ID
 * @returns {Promise<object>} Plan document
 */
export async function getPlan(identifier) {
  const query = identifier.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: identifier }
    : { slug: identifier };

  const plan = await SubscriptionPlan.findOne(query);

  if (!plan) {
    throw {
      statusCode: 404,
      message: 'Plan not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  return plan;
}

/**
 * Create a new subscription plan (admin only)
 * @param {object} data - Plan data
 * @returns {Promise<object>} Created plan
 */
export async function createPlan(data) {
  const {
    name,
    description,
    tagline,
    price,
    currency,
    billingCycle,
    durationDays,
    creditsIncluded,
    maxAds,
    maxImagesPerAd,
    maxVideoPerAd,
    features,
    isFeatured,
    adPriority,
    discountPercentage,
    sortOrder,
    isPopular,
    badge,
    trialDays,
    trialCredits,
  } = data;

  // Validate required fields
  if (!name || !description || price === undefined || creditsIncluded === undefined) {
    throw {
      statusCode: 400,
      message: 'Name, description, price, and creditsIncluded are required',
      errorType: 'VALIDATION_ERROR',
    };
  }

  if (price < 0) {
    throw {
      statusCode: 400,
      message: 'Price cannot be negative',
      errorType: 'VALIDATION_ERROR',
    };
  }

  if (creditsIncluded < 0) {
    throw {
      statusCode: 400,
      message: 'Credits included cannot be negative',
      errorType: 'VALIDATION_ERROR',
    };
  }

  // Check for duplicate slug/name
  const existing = await SubscriptionPlan.findOne({
    $or: [{ name }, { slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }],
  });

  if (existing) {
    throw {
      statusCode: 409,
      message: 'A plan with this name already exists',
      errorType: 'CONFLICT_ERROR',
    };
  }

  const planData = {
    name,
    description,
    tagline,
    price,
    currency: currency || 'INR',
    billingCycle: billingCycle || 'monthly',
    durationDays,
    creditsIncluded,
    maxAds: maxAds || 0,
    maxImagesPerAd: maxImagesPerAd || 3,
    maxVideoPerAd: maxVideoPerAd || 0,
    features: features || [],
    isFeatured: isFeatured || false,
    adPriority: adPriority || 0,
    discountPercentage: discountPercentage || 0,
    sortOrder: sortOrder || 0,
    isPopular: isPopular || false,
    badge: badge || '',
    trialDays: trialDays || 0,
    trialCredits: trialCredits || 0,
  };

  return await SubscriptionPlan.create(planData);
}

/**
 * Update a subscription plan (admin only)
 * @param {string} planId - Plan document ID
 * @param {object} data - Updated data
 * @returns {Promise<object>} Updated plan
 */
export async function updatePlan(planId, data) {
  const plan = await SubscriptionPlan.findById(planId);

  if (!plan) {
    throw {
      statusCode: 404,
      message: 'Plan not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  const allowedFields = [
    'name', 'description', 'tagline', 'price', 'currency',
    'billingCycle', 'durationDays', 'creditsIncluded', 'maxAds',
    'maxImagesPerAd', 'maxVideoPerAd', 'features', 'isFeatured',
    'adPriority', 'discountPercentage', 'sortOrder', 'isPopular',
    'badge', 'trialDays', 'trialCredits', 'isActive', 'isPublic',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      plan[field] = data[field];
    }
  }

  await plan.save();
  return plan;
}

/**
 * Delete a plan (admin only) — soft delete by deactivating
 * @param {string} planId - Plan document ID
 * @returns {Promise<object>} Updated plan
 */
export async function deletePlan(planId) {
  const plan = await SubscriptionPlan.findById(planId);

  if (!plan) {
    throw {
      statusCode: 404,
      message: 'Plan not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  // Check if any active subscriptions use this plan
  const activeSubs = await UserSubscription.countDocuments({
    plan: planId,
    status: { $in: ['active', 'trial'] },
  });

  if (activeSubs > 0) {
    throw {
      statusCode: 400,
      message: `Cannot delete plan: ${activeSubs} active subscription(s) use this plan`,
      errorType: 'VALIDATION_ERROR',
    };
  }

  plan.isActive = false;
  plan.isPublic = false;
  await plan.save();

  return plan;
}

// ==========================================
// PURCHASE
// ==========================================

/**
 * Purchase a subscription plan
 * Allocates credits to user's wallet
 * 
 * @param {string} userId - User ID
 * @param {string} planId - Plan ID or slug
 * @param {string} paymentMethod - 'razorpay' | 'credits' | 'admin_grant' | 'trial'
 * @param {object} paymentInfo - Optional payment metadata
 * @returns {Promise<object>} Created subscription
 */
export async function purchaseSubscription(userId, planId, paymentMethod = 'razorpay', paymentInfo = {}) {
  // Find the plan
  const plan = planId.match(/^[0-9a-fA-F]{24}$/)
    ? await SubscriptionPlan.findById(planId)
    : await SubscriptionPlan.findOne({ slug: planId, isActive: true });

  if (!plan) {
    throw {
      statusCode: 404,
      message: 'Plan not found or is inactive',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    throw {
      statusCode: 404,
      message: 'User not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  // Handle trial subscriptions
  if (paymentMethod === 'trial') {
    if (plan.trialDays <= 0) {
      throw {
        statusCode: 400,
        message: 'This plan does not offer a free trial',
        errorType: 'VALIDATION_ERROR',
      };
    }

    // Check if user already used a trial
    const existingTrial = await UserSubscription.findOne({
      user: userId,
      paymentMethod: 'trial',
    });

    if (existingTrial) {
      throw {
        statusCode: 400,
        message: 'You have already used your free trial for this plan',
        errorType: 'VALIDATION_ERROR',
      };
    }
  }

  // Handle payment via credits (if plan is free or user pays from wallet)
  if (paymentMethod === 'credits' && plan.price > 0) {
    if (user.coinBalance < plan.price) {
      throw {
        statusCode: 402,
        message: `Insufficient credits. Need ${plan.price}, have ${user.coinBalance}`,
        errorType: 'INSUFFICIENT_CREDITS',
      };
    }

    // Atomic credit deduction
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, coinBalance: { $gte: plan.price } },
      { $inc: { coinBalance: -plan.price } },
      { returnDocument: 'after' }
    );

    if (!updatedUser) {
      throw {
        statusCode: 409,
        message: 'Credits were spent by another request. Please try again.',
        errorType: 'CONFLICT_ERROR',
      };
    }
  }

  // Create plan snapshot
  const planSnapshot = {
    name: plan.name,
    slug: plan.slug,
    price: plan.price,
    currency: plan.currency,
    creditsIncluded: plan.creditsIncluded,
    durationDays: plan.durationDays,
    billingCycle: plan.billingCycle,
    adPriority: plan.adPriority,
    maxAds: plan.maxAds,
    maxImagesPerAd: plan.maxImagesPerAd,
  };

  // Determine subscription status and dates
  let status = 'active';
  let startDate = new Date();
  let endDate;
  let trialEndDate = null;

  if (paymentMethod === 'trial') {
    status = 'trial';
    trialEndDate = new Date(startDate.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);
    endDate = trialEndDate;
  } else if (plan.durationDays === 0) {
    // Lifetime
    endDate = new Date('2099-12-31');
  } else {
    endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
  }

  // Find vendor profile
  const vendor = await Vendor.findOne({ userId });

  // Create subscription
  const subscriptionData = {
    user: userId,
    vendor: vendor?._id || null,
    plan: plan._id,
    planSnapshot,
    paymentMethod,
    paymentStatus: paymentMethod === 'razorpay' ? 'pending' : 'completed',
    amount: plan.price,
    discount: paymentInfo.discount || 0,
    finalAmount: plan.price - (paymentInfo.discount || 0),
    startDate,
    endDate,
    trialEndDate,
    creditsAllocated: paymentMethod === 'trial' ? plan.trialCredits : plan.creditsIncluded,
    creditsRemaining: 0, // Will be set by pre-save hook
    status,
    razorpayOrderId: paymentInfo.razorpayOrderId || null,
    razorpayPaymentId: paymentInfo.razorpayPaymentId || null,
    razorpaySignature: paymentInfo.razorpaySignature || null,
    grantedBy: paymentMethod === 'admin_grant' ? paymentInfo.adminId : null,
  };

  // If this is a direct activation (non-razorpay), override old plans before saving
  if (paymentMethod !== 'razorpay') {
    await overrideOldSubscriptions(userId);
  }

  const subscription = await UserSubscription.create(subscriptionData);

  // Add credits to user's wallet ONLY for non-Razorpay payments (trial, credits, admin_grant).
  // For Razorpay, payment is still pending here — credits are allocated in verifyPayment()
  // after signature verification, to prevent double-crediting.
  if (subscription.creditsAllocated > 0 && paymentMethod !== 'razorpay') {
    await User.findByIdAndUpdate(userId, {
      $inc: { coinBalance: subscription.creditsAllocated },
    });
  }

  // Update user role to vendor if not already
  if (user.role !== 'vendor' && user.role !== 'admin') {
    await User.findByIdAndUpdate(userId, { role: 'vendor' });
  }

  // Populate plan for response
  await subscription.populate('plan', 'name slug description features badge');

  return {
    subscription,
    creditsAllocated: subscription.creditsAllocated,
    userCoinBalance: (await User.findById(userId)).coinBalance,
  };
}

/**
 * Verify Razorpay payment and activate subscription
 * @param {string} subscriptionId - UserSubscription ID
 * @param {object} paymentDetails - Razorpay payment response
 * @returns {Promise<object>} Updated subscription
 */
export async function verifyPayment(subscriptionId, paymentDetails) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentDetails;

  const subscription = await UserSubscription.findById(subscriptionId);

  if (!subscription) {
    throw {
      statusCode: 404,
      message: 'Subscription not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  if (subscription.paymentStatus === 'completed') {
    throw {
      statusCode: 400,
      message: 'Payment already completed',
      errorType: 'VALIDATION_ERROR',
    };
  }

  // Override any previous active subscriptions before activating this one
  await overrideOldSubscriptions(subscription.user, subscription._id);

  subscription.razorpayOrderId = razorpay_order_id;
  subscription.razorpayPaymentId = razorpay_payment_id;
  subscription.razorpaySignature = razorpay_signature;
  subscription.paymentStatus = 'completed';
  subscription.status = 'active';

  await subscription.save();

  // Allocate credits if not already done
  if (subscription.creditsAllocated > 0 && subscription.creditsRemaining === 0) {
    subscription.creditsRemaining = subscription.creditsAllocated;
    await subscription.save();

    await User.findByIdAndUpdate(subscription.user, {
      $inc: { coinBalance: subscription.creditsAllocated },
    });
  }

  // ── Send in-app + FCM notification to the vendor (non-blocking) ──
  try {
    const planName = subscription.planSnapshot?.name || 'your plan';
    const credits = subscription.creditsAllocated || 0;
    await NotificationService.sendVendorNotification(subscription.user.toString(), {
      type: 'subscription_activated',
      title: '🎉 Subscription Activated!',
      body: `Your ${planName} subscription is now active. You have received ${credits} ad credits. Start posting your ads!`,
      action: { type: 'route', target: 'VendorSubscription', params: {} },
      metadata: {
        planName,
        credits: credits.toString(),
        subscriptionId: subscription._id.toString(),
      },
    });
  } catch (notifErr) {
    console.error('[verifyPayment] Notification dispatch failed (non-fatal):', notifErr.message);
  }

  return subscription;
}

// ==========================================
// USER SUBSCRIPTION MANAGEMENT
// ==========================================

/**
 * Auto-expire subscriptions that have passed their end date
 * @param {string} userId - User ID
 */
export async function autoExpireSubscriptions(userId) {
  const now = new Date();
  await UserSubscription.updateMany(
    {
      user: userId,
      status: { $in: ['active', 'trial'] },
      endDate: { $lt: now }
    },
    {
      $set: { status: 'expired', creditsRemaining: 0 }
    }
  );
}

/**
 * Override existing active subscriptions for a user when a new plan is activated.
 * @param {string} userId - User ID
 * @param {string} excludeSubscriptionId - ID of the subscription to exclude from overriding
 */
export async function overrideOldSubscriptions(userId, excludeSubscriptionId = null) {
  const query = { user: userId, status: { $in: ['active', 'trial'] } };
  
  if (excludeSubscriptionId) {
    query._id = { $ne: excludeSubscriptionId };
  }

  await UserSubscription.updateMany(
    query,
    { $set: { status: 'overridden', creditsRemaining: 0 } }
  );
}

/**
 * Get user's currently active subscription
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} Active subscription
 */
export async function getActiveSubscription(userId) {
  await autoExpireSubscriptions(userId);
  return await UserSubscription.findActive(userId);
}

/**
 * Get all subscriptions for a user
 * @param {string} userId - User ID
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<object>} Paginated subscriptions
 */
export async function getUserSubscriptions(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [subscriptions, total] = await Promise.all([
    UserSubscription.findByUser(userId, page, limit),
    UserSubscription.countDocuments({ user: userId }),
  ]);

  return {
    subscriptions,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Cancel user's active subscription
 * @param {string} userId - User ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<object>} Cancelled subscription
 */
export async function cancelSubscription(userId, reason = '') {
  const subscription = await UserSubscription.findActive(userId);

  if (!subscription) {
    throw {
      statusCode: 404,
      message: 'No active subscription found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  return await subscription.cancel(reason);
}

// ==========================================
// CRON: Expire old subscriptions
// ==========================================

/**
 * Mark expired subscriptions (past endDate and still active/trial)
 * Call from a scheduled cron job
 * @returns {Promise<number>} Number of expired subscriptions
 */
export async function expireOldSubscriptions() {
  const now = new Date();

  const result = await UserSubscription.updateMany(
    {
      status: { $in: ['active', 'trial'] },
      endDate: { $lte: now },
    },
    { $set: { status: 'expired' } }
  );

  return result.modifiedCount;
}
