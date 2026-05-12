import mongoose from 'mongoose';

/**
 * Review Model
 * Handles ratings and reviews for vendors/stores
 */
const reviewSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true, // Can be disabled by admin moderation
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
