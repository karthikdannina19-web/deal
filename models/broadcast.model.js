import mongoose from 'mongoose';

/**
 * Broadcast Model
 * Stores history of admin-initiated broadcast notifications
 */
const broadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: { type: String, required: true },
    targetType: { type: String, enum: ['all', 'login_only'], default: 'all' },
    imageUrl: { type: String, default: null },
    action: {
      type: { type: String, default: 'none' },
      target: { type: String, default: null },
      params: { type: Map, of: String, default: {} }
    },
    totalNotified: { type: Number, default: 0 },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Location Targeting
    visibilityScope: {
      type: String,
      enum: ['all', 'state', 'district', 'mandal'],
      default: 'all',
    },
    stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'State', default: null },
    districtId: { type: mongoose.Schema.Types.ObjectId, ref: 'District', default: null },
    mandalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mandal', default: null },
  },
  { timestamps: true }
);

const Broadcast = mongoose.models.Broadcast || mongoose.model('Broadcast', broadcastSchema);

export default Broadcast;

