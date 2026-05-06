import mongoose from 'mongoose';

/**
 * Subscription Plan Schema
 * Defines available subscription plans that vendors can purchase.
 */
const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      unique: true,
      maxlength: 50,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Plan description is required'],
      maxlength: 500,
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    // ==========================================
    // Pricing
    // ==========================================
    price: {
      type: Number,
      required: [true, 'Plan price is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD'],
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'half_yearly', 'yearly', 'lifetime'],
      default: 'monthly',
    },
    // Duration in days (auto-calculated from billingCycle, or custom)
    durationDays: {
      type: Number,
      default: 30,
    },

    // ==========================================
    // Credits & Benefits
    // ==========================================
    creditsIncluded: {
      type: Number,
      required: [true, 'Credits included is required'],
      min: 0,
    },
    maxAds: {
      type: Number,
      default: 0, // 0 = unlimited
    },
    maxImagesPerAd: {
      type: Number,
      default: 3,
    },
    maxVideoPerAd: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // Features / Perks
    // ==========================================
    features: [
      {
        label: { type: String, required: true },
        included: { type: Boolean, default: true },
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    adPriority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
      description: 'Priority boost for ads posted under this plan',
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ==========================================
    // Display & Ordering
    // ==========================================
    sortOrder: {
      type: Number,
      default: 0,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    badge: {
      type: String,
      enum: ['free', 'starter', 'popular', 'best_value', 'enterprise', ''],
      default: '',
    },

    // ==========================================
    // Status
    // ==========================================
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },

    // ==========================================
    // Trial (optional)
    // ==========================================
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    trialCredits: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });
subscriptionPlanSchema.index({ billingCycle: 1 });

// ==========================================
// Virtual: Price per day
// ==========================================
subscriptionPlanSchema.virtual('pricePerDay').get(function () {
  if (!this.durationDays || this.durationDays === 0) return 0;
  return parseFloat((this.price / this.durationDays).toFixed(2));
});

// ==========================================
// Virtual: Effective credit cost per credit
// ==========================================
subscriptionPlanSchema.virtual('costPerCredit').get(function () {
  if (!this.creditsIncluded || this.creditsIncluded === 0) return 0;
  return parseFloat((this.price / this.creditsIncluded).toFixed(2));
});

// ==========================================
// Pre-validate: Auto-generate slug
// ==========================================
subscriptionPlanSchema.pre('validate', async function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Auto-set durationDays from billingCycle if not custom
  if (this.isNew && !this.durationDays) {
    const cycleMap = {
      monthly: 30,
      quarterly: 90,
      half_yearly: 180,
      yearly: 365,
      lifetime: 0,
    };
    this.durationDays = cycleMap[this.billingCycle] || 30;
  }
});

// ==========================================
// Static: Get active public plans
// ==========================================
subscriptionPlanSchema.statics.getActivePlans = function () {
  return this.find({ isActive: true, isPublic: true })
    .sort({ sortOrder: 1, price: 1 })
    .lean();
};

const SubscriptionPlan =
  mongoose.models.SubscriptionPlan ||
  mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
