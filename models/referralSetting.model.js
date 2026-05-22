import mongoose from 'mongoose';

/**
 * Referral Setting Model
 * Stores global referral rewards settings configured by admins
 */
const referralSettingSchema = new mongoose.Schema(
  {
    // Coins awarded to the referrer when a referral converts
    coinsForReferrer: {
      type: Number,
      default: 500,
      min: 0,
    },
    // Coins awarded to the referred (new) user when they convert
    coinsForReferred: {
      type: Number,
      default: 200,
      min: 0,
    },
    // Backward-compatible alias (kept for older code that may still reference it)
    coinsPerReferral: {
      type: Number,
      default: 500,
      min: 0,
    },
    dailyReferralLimit: {
      type: Number,
      default: 20,
      min: 0,
    },
    maxReferralLimit: {
      type: Number,
      default: 100,
      min: 0,
    },
    activationCondition: {
      type: String,
      enum: ['signup', 'first_deal'],
      default: 'signup',
    },
    expiryDays: {
      type: Number,
      default: 365,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ReferralSetting = mongoose.models.ReferralSetting || mongoose.model('ReferralSetting', referralSettingSchema);

export default ReferralSetting;
