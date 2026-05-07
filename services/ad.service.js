import mongoose from 'mongoose';
import Ad from '../models/ad.model.js';
import User from '../models/user.model.js';
import Vendor from '../models/vendor.model.js';

/**
 * Ad Management Service
 * Handles CRUD operations, credit deduction, view tracking, and admin moderation.
 */

// Credit costs per ad type
const CREDIT_COSTS = {
  standard: 1,
  featured: 5,
  premium: 10,
};

// Default durations per type (days)
const DEFAULT_DURATIONS = {
  standard: 30,
  featured: 60,
  premium: 90,
};

// ==========================================
// CREATE AD (with credit deduction)
// ==========================================

/**
 * Create a new ad and deduct credits from user's wallet
 * @param {object} data - Ad data
 * @param {string} userId - User ID (JWT)
 * @returns {Promise<object>} Created ad
 */
export async function createAd(data, userId) {
  const {
    title,
    description,
    category,
    subCategory,
    images,
    videoUrl,
    url,
    price,
    priceType,
    location,
    creditType = 'standard',
    durationDays,
    tags,
    contactInfo,
  } = data;

  // Validate required fields
  if (!title || !description || !category) {
    throw {
      statusCode: 400,
      message: 'Title, description, and category are required',
      errorType: 'VALIDATION_ERROR',
    };
  }

  // Validate title length
  if (title.length < 5) {
    throw {
      statusCode: 400,
      message: 'Title must be at least 5 characters',
      errorType: 'VALIDATION_ERROR',
    };
  }

  // Validate description length
  if (description.length < 20) {
    throw {
      statusCode: 400,
      message: 'Description must be at least 20 characters',
      errorType: 'VALIDATION_ERROR',
    };
  }

  // Validate credit type
  const creditsRequired = CREDIT_COSTS[creditType] || CREDIT_COSTS.standard;

  console.log(`[AdService] Starting creation for user ${userId}. Required credits: ${creditsRequired}`);

  // Find the user
  const user = await User.findById(userId);
  if (!user) {
    console.error(`[AdService] User ${userId} not found`);
    throw {
      statusCode: 404,
      message: 'User not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  // Find vendor profile
  console.log(`[AdService] Locating vendor profile for userId ${userId}`);
  let vendor = await Vendor.findOne({ userId });

  // Fallback: Check if user has a vendorProfile link
  if (!vendor && user.vendorProfile) {
    vendor = await Vendor.findById(user.vendorProfile);
  }

  // Second Fallback: Check legacy 'user' field
  if (!vendor) {
    vendor = await Vendor.findOne({ user: userId });
  }
  
  if (!vendor) {
    console.error(`[AdService] Vendor profile not found for user ${userId}`);
    throw {
      statusCode: 400,
      message: 'Vendor registration required before posting ads',
      errorType: 'VALIDATION_ERROR',
    };
  }

  // Check if user has enough credits
  if (user.coinBalance < creditsRequired) {
    console.warn(`[AdService] Insufficient credits for user ${userId}. Has: ${user.coinBalance}, Needs: ${creditsRequired}`);
    throw {
      statusCode: 402,
      message: `Insufficient credits. You need ${creditsRequired} credits but have ${user.coinBalance}`,
      errorType: 'INSUFFICIENT_CREDITS',
      details: {
        required: creditsRequired,
        available: user.coinBalance,
      },
    };
  }

  // Deduct credits (atomic operation to prevent double spending)
  console.log(`[AdService] Deducting ${creditsRequired} credits from user ${userId}`);
  const updatedUser = await User.findOneAndUpdate(
    { _id: userId, coinBalance: { $gte: creditsRequired } },
    { $inc: { coinBalance: -creditsRequired } },
    { new: true }
  );

  if (!updatedUser) {
    console.error(`[AdService] Credit deduction failed for user ${userId} (Concurrency issue)`);
    throw {
      statusCode: 409,
      message: 'Credits were spent by another request. Please try again.',
      errorType: 'CONFLICT_ERROR',
    };
  }

  // Create the ad
  console.log(`[AdService] Saving new ad document for vendor ${vendor._id}`);
  const adDataToSave = {
    user: userId,
    vendor: vendor._id,
    title,
    description,
    category,
    subCategory,
    images: images || [],
    videoUrl,
    url,
    price,
    priceType: priceType || 'fixed',
    location,
    creditType,
    creditsUsed: creditsRequired,
    durationDays: durationDays || DEFAULT_DURATIONS[creditType],
    tags: tags || [],
    contactInfo: contactInfo || { showPhone: true, showEmail: true },
    status: 'pending', // Requires admin approval
    isFeatured: creditType === 'featured' || creditType === 'premium',
    priority: creditType === 'premium' ? 5 : creditType === 'featured' ? 3 : 0,
  };

  const ad = new Ad(adDataToSave);
  await ad.save();
  console.log(`[AdService] Ad saved successfully with ID: ${ad._id}`);

  // Populate vendor info for response using static method (more robust)
  try {
    console.log(`[AdService] Populating vendor info for ad ${ad._id}`);
    await Ad.populate(ad, { path: 'vendor', select: 'fullName storeName email' });
  } catch (popErr) {
    console.error(`[AdService] Population warning (non-fatal):`, popErr.message);
    // Continue even if populate fails, as the ad is already saved
  }

  return {
    ad,
    remainingCredits: updatedUser.coinBalance,
    creditsDeducted: creditsRequired,
  };
}

// ==========================================
// UPDATE AD
// ==========================================

/**
 * Update an existing ad (only if owned by user and not deleted)
 * @param {string} adId - Ad document ID
 * @param {string} userId - User ID (JWT)
 * @param {object} data - Updated ad data
 * @returns {Promise<object>} Updated ad
 */
export async function updateAd(adId, userId, data) {
  const ad = await Ad.findOne({ _id: adId, user: userId });

  if (!ad) {
    throw {
      statusCode: 404,
      message: 'Ad not found or you do not have permission',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  // Cannot edit deleted/expired ads
  if (['deleted', 'expired'].includes(ad.status)) {
    throw {
      statusCode: 400,
      message: `Cannot edit an ad that is ${ad.status}`,
      errorType: 'VALIDATION_ERROR',
    };
  }

  // Fields allowed to update
  const allowedFields = [
    'title', 'description', 'category', 'subCategory',
    'images', 'videoUrl', 'url', 'price', 'priceType',
    'location', 'tags', 'contactInfo',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      ad[field] = data[field];
    }
  }

  // If status was rejected, reset to pending after edit
  if (ad.status === 'rejected') {
    ad.status = 'pending';
  }

  await ad.save();

  await ad.populate('vendor', 'fullName storeName email');

  return ad;
}

// ==========================================
// DELETE AD
// ==========================================

/**
 * Soft-delete an ad
 * @param {string} adId - Ad document ID
 * @param {string} userId - User ID (JWT)
 * @returns {Promise<object>} Deleted ad
 */
export async function deleteAd(adId, userId) {
  const ad = await Ad.findOne({ _id: adId, user: userId });

  if (!ad) {
    throw {
      statusCode: 404,
      message: 'Ad not found or you do not have permission',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  if (ad.status === 'deleted') {
    throw {
      statusCode: 400,
      message: 'Ad is already deleted',
      errorType: 'VALIDATION_ERROR',
    };
  }

  ad.status = 'deleted';
  await ad.save();

  return ad;
}

// ==========================================
// LIST ADS (with pagination & filtering)
// ==========================================

/**
 * List ads with pagination, filtering, and search
 * @param {object} query - Query parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {string} userId - User ID (optional: filter by user's own ads)
 * @returns {Promise<object>} Paginated ad list
 */
export async function listAds(query = {}, page = 1, limit = 20, userId = null) {
  const skip = (page - 1) * limit;
  const filters = {};

  // Status filter
  if (query.status) {
    filters.status = query.status;
  } else if (!userId) {
    // Public listing: only show approved ads
    filters.status = 'approved';
  }

  // Category filter
  if (query.category) {
    filters.category = query.category;
  }

  // Sub-category filter
  if (query.subCategory) {
    filters.subCategory = query.subCategory;
  }

  // Location filter
  if (query.city) {
    filters['location.city'] = { $regex: query.city, $options: 'i' };
  }

  // Price range
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filters.price = {};
    if (query.minPrice !== undefined) filters.price.$gte = Number(query.minPrice);
    if (query.maxPrice !== undefined) filters.price.$lte = Number(query.maxPrice);
  }

  // User's own ads
  if (userId && !query.all) {
    filters.user = userId;
  }

  // Text search
  if (query.search) {
    filters.$text = { $search: query.search };
  }

  // Sorting
  let sortOption = { createdAt: -1 }; // Default: newest first

  if (query.sort === 'oldest') sortOption = { createdAt: 1 };
  else if (query.sort === 'price_low') sortOption = { price: 1 };
  else if (query.sort === 'price_high') sortOption = { price: -1 };
  else if (query.sort === 'most_viewed') sortOption = { views: -1 };
  else if (query.sort === 'featured') sortOption = { isFeatured: -1, priority: -1, createdAt: -1 };

  // Execute query
  const [ads, total] = await Promise.all([
    Ad.find(filters)
      .populate('vendor', 'fullName storeName email')
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(),
    Ad.countDocuments(filters),
  ]);

  return {
    ads,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}

// ==========================================
// GET SINGLE AD
// ==========================================

/**
 * Get a single ad by ID (with optional view tracking)
 * @param {string} adId - Ad document ID
 * @param {boolean} trackView - Whether to increment view count
 * @param {string} viewerId - Viewer identifier for dedup
 * @returns {Promise<object>} Ad document
 */
export async function getAd(adId, trackView = false, viewerId = null) {
  const ad = await Ad.findById(adId)
    .populate('vendor', 'fullName storeName email')
    .populate('user', 'email phone');

  if (!ad) {
    throw {
      statusCode: 404,
      message: 'Ad not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  // Don't return deleted ads to public
  if (ad.status === 'deleted') {
    throw {
      statusCode: 404,
      message: 'Ad not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  // Track view if requested
  if (trackView && viewerId) {
    await ad.incrementView(viewerId);
  }

  return ad;
}

// ==========================================
// TRACK AD VIEW
// ==========================================

/**
 * Track an ad view (deduplicated by viewer ID)
 * @param {string} adId - Ad document ID
 * @param {string} viewerId - Viewer identifier (IP or session)
 * @returns {Promise<object>} Updated view counts
 */
export async function trackAdView(adId, viewerId) {
  const ad = await Ad.findById(adId);

  if (!ad || ad.status === 'deleted') {
    throw {
      statusCode: 404,
      message: 'Ad not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  const isUnique = await ad.incrementView(viewerId);

  return {
    views: ad.views,
    uniqueViews: ad.uniqueViews,
    isUniqueView: isUnique,
  };
}

// ==========================================
// ADMIN: Approve / Reject Ad
// ==========================================

/**
 * Admin approve or reject an ad
 * @param {string} adId - Ad document ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} adminId - Admin user ID
 * @param {string} notes - Review notes (optional)
 * @returns {Promise<object>} Updated ad
 */
export async function moderateAd(adId, action, adminId, notes = '') {
  const ad = await Ad.findById(adId);

  if (!ad) {
    throw {
      statusCode: 404,
      message: 'Ad not found',
      errorType: 'NOT_FOUND_ERROR',
    };
  }

  const validActions = ['approve', 'reject', 'suspend', 'activate', 'expire'];
  if (!validActions.includes(action)) {
    throw {
      statusCode: 400,
      message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
      errorType: 'VALIDATION_ERROR',
    };
  }

  // Map actions to statuses
  const statusMap = {
    approve: 'approved',
    reject: 'rejected',
    suspend: 'suspended',
    activate: 'approved',
    expire: 'expired'
  };

  ad.status = statusMap[action];
  ad.reviewNotes = notes || ad.reviewNotes;
  ad.reviewedBy = adminId;
  ad.reviewedAt = new Date();

  await ad.save();

  return ad;
}

// ==========================================
// GET AD STATS (for dashboard)
// ==========================================

/**
 * Get ad statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} Ad stats
 */
export async function getAdStats(userId) {
  const stats = await Ad.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalClicks: { $sum: '$clicks' },
      },
    },
  ]);

  const summary = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    totalViews: 0,
    totalClicks: 0,
  };

  stats.forEach((s) => {
    summary[s._id] = s.count;
    summary.total += s.count;
    summary.totalViews += s.totalViews;
    summary.totalClicks += s.totalClicks;
  });

  return summary;
}

// ==========================================
// EXPIRE ADS (cron job helper)
// ==========================================

/**
 * Mark expired ads (past expiresAt and still approved)
 * Call this from a scheduled job/cron
 * @returns {Promise<number>} Number of expired ads
 */
export async function expireOldAds() {
  const result = await Ad.updateMany(
    {
      status: 'approved',
      expiresAt: { $lte: new Date() },
    },
    { $set: { status: 'expired' } }
  );

  return result.modifiedCount;
}

export { CREDIT_COSTS };
