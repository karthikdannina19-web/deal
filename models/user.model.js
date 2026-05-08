import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * User Schema
 * Stores user account information
 */
const userSchema = new mongoose.Schema(
  {
    // Basic Info
    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    profileImage: {
      type: String, // URL to the image
      trim: true,
    },
    
    // Geographic Info
    state: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    mandal: {
      type: String,
      trim: true,
    },
    
    // Detailed Location (Dynamic GPS Save)
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      label: { type: String, trim: true },
      addressLine: { type: String, trim: true },
      area: { type: String, trim: true },
      city: { type: String, trim: true },
      district: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true },
      lastUpdated: { type: Date, default: Date.now }
    },
    
    // Contact (unique identifier)
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      index: true,
    },
    
    // Authentication
    password: {
      type: String,
      select: false, // Don't return password by default
    },
    
    // Role & Status
    role: {
      type: String,
      enum: ['user', 'vendor', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'deleted'],
      default: 'pending',
    },
    
    // Vendor Profile (populated during vendor registration)
    vendorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    
    // Wallet
    coinBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Referral
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    
    // Anti-Abuse
    deviceId: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
    },
    referralUsed: {
      type: Boolean,
      default: false,
    },
    
    // Fraud Detection
    fraudScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Email/Phone verification
    emailVerified: {
      type: Boolean,
      default: false,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    
    // Timestamps
    lastLoginAt: {
      type: Date,
    },
    
    // Push Notifications
    fcmTokens: [
      {
        token: { type: String, required: true },
        platform: { type: String, enum: ['android', 'ios', 'web'] },
        lastUsedAt: { type: Date, default: Date.now }
      }
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

// Indexes for faster queries
userSchema.index({ email: 1, phone: 1 });
userSchema.index({ role: 1, status: 1 });

/**
 * Hash password before saving
 */
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Compare password with hash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * Update last login timestamp
 */
userSchema.methods.updateLastLogin = async function () {
  this.lastLoginAt = new Date();
  await this.save({ validateBeforeSave: false });
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;
