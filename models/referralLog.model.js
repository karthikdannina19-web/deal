import mongoose from 'mongoose';

/**
 * Referral Log Model
 * Tracks successful referral conversions and coin rewards
 */
const referralLogSchema = new mongoose.Schema(
  {
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    newUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Ensures a new user can only be recorded as being referred once
      index: true,
    },
    coinsGivenToReferrer: {
      type: Number,
      required: true,
      default: 0,
    },
    coinsGivenToUser: {
      type: Number,
      required: true,
      default: 0,
    },
    deviceId: {
      type: String,
      index: true,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const ReferralLog = mongoose.models.ReferralLog || mongoose.model('ReferralLog', referralLogSchema);

export default ReferralLog;
