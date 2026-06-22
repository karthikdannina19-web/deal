import mongoose from 'mongoose';

/**
 * Store Model
 * Stores details for individual vendor outlets/stores
 */
const storeSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    mandal: { type: String, trim: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    businessHours: {
      type: String,
      trim: true,
    },
    images: [{ type: String }],
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending_approval', 'active', 'rejected'],
      default: 'pending_approval',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Geo-spatial index for location-based searches
storeSchema.index({ location: '2dsphere' });

const Store = mongoose.models.Store || mongoose.model('Store', storeSchema);

export default Store;
