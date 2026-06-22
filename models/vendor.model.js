import mongoose from 'mongoose';

/**
 * Vendor Model
 * Handles multi-step registration (Draft Save System)
 */
const vendorSchema = new mongoose.Schema(
  {
    // Reference to the logged-in user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true, // One user = one vendor profile
      index: true,
    },
    
    // Step 1: Basic Info
    fullName: {
      type: String,
      trim: true,
    },
    
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    
    // Mobile number (typically sourced from User's primary mobile)
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
    },

    // Step 2: Business Details
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },

    storeName: {
      type: String,
      trim: true,
    },

    storeAbout: {
      type: String,
      trim: true,
    },

    location: {
      state: { type: String, trim: true },
      district: { type: String, trim: true },
      mandal: { type: String, trim: true },
    },
    storeStateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State',
      index: true,
    },
    storeDistrictId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'District',
      index: true,
    },
    storeMandalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mandal',
      index: true,
    },
    visibilityLevel: {
      type: String,
      enum: ['global', 'state', 'district', 'mandal'],
      default: 'global',
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

    media: {
      thumbnailUrl: { type: String },
      thumbnailKey: { type: String },
      bannerUrl: { type: String },
      bannerKey: { type: String },
      images: [{ type: String }], // Array of store image URLs
    },

    // Social Links
    website: { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    linkedin: { type: String, trim: true, default: '' },
    youtube: { type: String, trim: true, default: '' },
    facebook: { type: String, trim: true, default: '' },

    workingHours: {
      type: String,
      trim: true,
    },

    // Step 3: Localization and Referral
    locationCoordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    fullAddress: {
      type: String,
      trim: true,
    },

    agentCode: {
      type: String,
      trim: true,
      index: true,
    },
    
    // Supervisor Mapping
    supervisorCode: {
      type: String,
      trim: true,
      index: true,
    },
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supervisor',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedAt: {
      type: Date,
    },
    
    // Registration progress
    registrationStep: {
      type: Number,
      required: true,
      default: 1,
      enum: [1, 2, 3],
    },
    
    // Account state
    status: {
      type: String,
      required: true,
      enum: ['draft', 'pending_approval', 'active', 'suspended', 'rejected', 'deleted'],
      default: 'draft',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    deletedAt: {
      type: Date,
    },
    deletionReason: {
      type: String,
      trim: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_reason: {
      type: String,
      default: null,
    },
    deleted_by: {
      type: String,
      enum: ['vendor', 'admin'],
      default: null,
    },
    account_status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
      default: 'ACTIVE',
      index: true,
    },

    // Unique identifier for QR codes and sharing
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    // Wallet
    coinBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    views: {
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

// Virtual for the public QR URL
vendorSchema.virtual('qrCodeUrl').get(function() {
  if (!this.slug) return null;
  return `https://rhock.vercel.app/v/${this.slug}`;
});

// Auto-generate slug from storeName
vendorSchema.pre('save', async function() {
  if (this.storeName && !this.slug) {
    let baseSlug = this.storeName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Ensure uniqueness
    let slug = baseSlug;
    let count = 1;
    while (await mongoose.models.Vendor.findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }
    this.slug = slug;
  }
});

// Indexes
vendorSchema.index({ email: 1 });
vendorSchema.index({ locationCoordinates: '2dsphere' });
vendorSchema.index({ storeName: 1 }); // Regular index for starts-with/regex search
vendorSchema.index({ visibilityLevel: 1, visibilityStateId: 1, visibilityDistrictId: 1, visibilityMandalId: 1, visibilityEnabled: 1 });

if (mongoose.models.Vendor) {
  delete mongoose.models.Vendor;
}
const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
