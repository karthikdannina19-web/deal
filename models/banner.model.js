import mongoose from 'mongoose';

/**
 * Banner Model
 * Represents promotional banners associated with specific Ad Sections/Tags.
 * Supports multiple banners per tag.
 */
const bannerSchema = new mongoose.Schema(
  {
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
      index: true,
    },
    image: {
      url: { type: String, required: true },
      key: { type: String, required: true }, // S3 key
    },
    title: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    location: {
      type: String,
      trim: true,
      placeholder: 'e.g. Hyderabad, City Center',
    },
    locationLabel: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
      index: true,
    },
    district: {
      type: String,
      trim: true,
      index: true,
    },
    mandal: {
      type: String,
      trim: true,
      index: true,
    },
    locationCoordinates: {
      lat: Number,
      lng: Number,
    },
    viewUrl: {
      type: String,
      trim: true,
      placeholder: 'Link to redirect when clicked',
    },
    whatsappLink: {
      type: String,
      trim: true,
    },
    storeLink: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    isTopBanner: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bannerSchema.index({ section: 1, order: 1 });
bannerSchema.index({ isActive: 1 });

const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

export default Banner;
