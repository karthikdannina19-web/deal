import mongoose from 'mongoose';

/**
 * Vendor Account Log Model
 * Audits status transitions, soft-deletions, restorations, and login blocks
 */
const vendorAccountLogSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    action_type: {
      type: String,
      enum: ['DELETED', 'RESTORED', 'LOGIN_BLOCKED', 'RECREATION_ATTEMPT'],
      required: true,
      index: true,
    },
    action_by: {
      type: String,
      enum: ['vendor', 'admin'],
      required: true,
    },
    old_status: {
      type: String,
      default: '',
    },
    new_status: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    deviceInfo: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

vendorAccountLogSchema.index({ vendor_id: 1, action_type: 1 });
vendorAccountLogSchema.index({ timestamp: -1 });

const VendorAccountLog = mongoose.models.VendorAccountLog || mongoose.model('VendorAccountLog', vendorAccountLogSchema);

export default VendorAccountLog;
