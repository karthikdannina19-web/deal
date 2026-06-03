import mongoose from 'mongoose';

/**
 * Redemption Request Model
 * Handles the multi-actor vendor-to-user coin redemption workflow
 */
const redemptionRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    coinAmount: {
      type: Number,
      required: true,
      min: 1,
    },
    userUniqueCode: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'otp_pending', 'success', 'failed'],
      default: 'PENDING',
      index: true,
    },
    otp: {
      type: String,
    },
    otpExpiry: {
      type: Date,
    },
    otpLastSentAt: {
      type: Date,
    },
    otpResendCount: {
      type: Number,
      default: 0,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

redemptionRequestSchema.index({ user: 1, status: 1 });
redemptionRequestSchema.index({ vendor: 1, status: 1 });
redemptionRequestSchema.index({ createdAt: -1 });

const RedemptionRequest = mongoose.models.RedemptionRequest || mongoose.model('RedemptionRequest', redemptionRequestSchema);

export default RedemptionRequest;
