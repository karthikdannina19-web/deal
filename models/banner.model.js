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
      required: false,
      index: true,
    },
    tagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
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
    placementType: {
      type: String,
      enum: ['section', 'home_top'],
      default: 'section',
      index: true,
    },
    isTopBanner: {
      type: Boolean,
      default: false,
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
  },
  {
    timestamps: true,
  }
);

// Indexes
bannerSchema.index({ section: 1, order: 1 });
bannerSchema.index({ isActive: 1 });
bannerSchema.index({ placementType: 1, isTopBanner: 1, isActive: 1 });
bannerSchema.index({ visibilityLevel: 1, visibilityStateId: 1, visibilityDistrictId: 1, visibilityMandalId: 1, visibilityEnabled: 1, section: 1, tagId: 1, categoryId: 1, placementType: 1, isActive: 1 });

bannerSchema.pre('validate', function () {
  this.isTopBanner = this.placementType === 'home_top';
});

const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

export default Banner;
