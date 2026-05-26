import mongoose from 'mongoose';

/**
 * Ad Schema
 * Represents a vendor advertisement with credit-based posting,
 * view tracking, and admin approval workflow.
 */
const adSchema = new mongoose.Schema(
  {
    // Owner
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ==========================================
    // Ad Content
    // ==========================================
    title: {
      type: String,
      required: [true, 'Ad title is required'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: [true, 'Ad description is required'],
      maxlength: 2000,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
      index: true,
    },

    // ==========================================
    // Media
    // ==========================================
    images: [
      {
        url: String,
        key: String, // S3 key for deletion
        alt: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    videoUrl: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      trim: true,
    },

    // ==========================================
    // Pricing & Location
    // ==========================================
    price: {
      type: Number,
      min: 0,
    },
    priceType: {
      type: String,
      enum: ['fixed', 'negotiable', 'free', 'contact_for_price'],
      default: 'fixed',
    },
    location: {
      city: String,
      state: String,
      pincode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    // ==========================================
    // Credits & Billing
    // ==========================================
    creditsUsed: {
      type: Number,
      default: 1, // Default: 1 credit per ad
    },
    creditType: {
      type: String,
      enum: ['standard', 'featured', 'premium'],
      default: 'standard',
    },
    // How long the ad stays active (in days)
    durationDays: {
      type: Number,
      default: 30,
    },
    expiresAt: {
      type: Date,
    },

    // ==========================================
    // Status & Moderation
    // ==========================================
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'active', 'rejected', 'expired', 'deleted', 'suspended'],
      default: 'pending',
      index: true,
    },
    reviewNotes: {
      type: String,
      maxlength: 500,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    creditRefunded: {
      type: Boolean,
      default: false,
    },
    creditRefundedAt: Date,
    // True when vendor edits an already-approved ad (no credit refund on next rejection)
    editedFromApproved: {
      type: Boolean,
      default: false,
    },

    // ==========================================
    // Analytics / Tracking
    // ==========================================
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueViews: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    shares: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Tracking deduplication (prevent inflated views)
    viewTracking: {
      type: Map,
      of: Date,
      default: {},
    },

    // ==========================================
    // Visibility
    // ==========================================
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },

    // Tags for search
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Contact info shown on ad
    contactInfo: {
      showPhone: { type: Boolean, default: true },
      showEmail: { type: Boolean, default: true },
      whatsappNumber: String,
    },

    // ==========================================
    // Vendor Analytics Visibility Controls
    // ==========================================
    // Vendor can choose whether public users see view/click counts on this ad
    showViews: {
      type: Boolean,
      default: true,   // visible by default
    },
    showClicks: {
      type: Boolean,
      default: true,   // visible by default
    },

    // SEO
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    // Curated Section assignment
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      index: true,
    },
    visibilityLevel: {
      type: String,
      enum: ['state', 'district', 'mandal'],
      default: 'mandal',
      index: true,
    },
    visibilityStateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State',
      index: true,
    },
    visibilityDistrictId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'District',
      index: true,
    },
    visibilityMandalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mandal',
      index: true,
    },
    visibilityEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==========================================
// Indexes
// ==========================================
adSchema.index({ status: 1, createdAt: -1 });
adSchema.index({ category: 1, status: 1 });
adSchema.index({ isFeatured: 1, status: 1 });
adSchema.index({ vendor: 1, status: 1 });
adSchema.index({ 'location.city': 1, status: 1 });
adSchema.index({ title: 'text', description: 'text', tags: 'text' });
adSchema.index({ visibilityLevel: 1, visibilityStateId: 1, visibilityDistrictId: 1, visibilityMandalId: 1, visibilityEnabled: 1, status: 1 });

// ==========================================
// Virtuals
// ==========================================

/**
 * Check if ad is currently active
 */
adSchema.virtual('isActive').get(function () {
  if (this.status !== 'approved') return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
});

/**
 * Days remaining until expiry
 */
adSchema.virtual('daysRemaining').get(function () {
  if (!this.expiresAt) return null;
  const diff = this.expiresAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

/**
 * Primary image URL
 */
adSchema.virtual('primaryImage').get(function () {
  const primary = this.images?.find((img) => img.isPrimary);
  return primary?.url || this.images?.[0]?.url || null;
});

/**
 * Check if the ad can be edited by the vendor
 * (Only pending or rejected ads are typically editable)
 */
adSchema.virtual('canEdit').get(function () {
  return ['pending', 'rejected', 'draft'].includes(this.status);
});

// ==========================================
// Pre-save hooks
// ==========================================

/**
 * Auto-generate slug from title
 * Auto-set expiresAt based on duration
 */
adSchema.pre('save', function () {
  // Generate slug if not set
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now().toString(36);
  }

  // Set expiry date on first creation
  if (this.isNew && this.durationDays && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + this.durationDays * 24 * 60 * 60 * 1000);
  }
});

// ==========================================
// Methods
// ==========================================

/**
 * Increment view count (with basic dedup)
 * @param {string} viewerId - Unique viewer identifier (IP or session)
 * @returns {boolean} Whether this was a unique view
 */
adSchema.methods.incrementView = async function (viewerId) {
  this.views += 1;

  // Track unique views per viewer (last 24h)
  const now = Date.now();
  const lastViewed = this.viewTracking.get(viewerId);

  if (!lastViewed || now - new Date(lastViewed).getTime() > 24 * 60 * 60 * 1000) {
    this.uniqueViews += 1;
    this.viewTracking.set(viewerId, new Date());
    // Keep tracking map from growing too large
    if (this.viewTracking.size > 1000) {
      const entries = Array.from(this.viewTracking.entries());
      this.viewTracking = new Map(entries.slice(-500));
    }
    await this.save();
    return true;
  }

  await this.save();
  return false;
};

/**
 * Increment click count
 */
adSchema.methods.incrementClick = async function () {
  this.clicks += 1;
  await this.save();
};

/**
 * Increment share count
 */
adSchema.methods.incrementShare = async function () {
  this.shares += 1;
  await this.save();
};

// ==========================================
// Statics
// ==========================================

/**
 * Find approved ads with pagination
 */
adSchema.statics.findApproved = function (filters = {}, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return this.find({ status: 'approved', ...filters })
    .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Count approved ads
 */
adSchema.statics.countApproved = function (filters = {}) {
  return this.countDocuments({ status: 'approved', ...filters });
};

if (mongoose.models.Ad) {
  delete mongoose.models.Ad;
}
const Ad = mongoose.model('Ad', adSchema);

export default Ad;
