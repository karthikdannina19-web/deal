import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    subtitle: { type: String, trim: true, maxlength: 250 },
    category: { type: String, trim: true, index: true },
    imageUrl: { type: String, trim: true },
    storeName: { type: String, trim: true },
    terms: { type: String, trim: true, maxlength: 2000 },
    ctaLink: { type: String, trim: true },
    couponCode: { type: String, trim: true },
    isCodeUserSpecific: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
    expiryDate: { type: Date },

    // Location Targeting
    visibilityScope: {
      type: String,
      enum: ['all', 'state', 'district', 'mandal'],
      default: 'all',
      index: true,
    },
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State',
      default: null,
      index: true,
    },
    districtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'District',
      default: null,
      index: true,
    },
    mandalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mandal',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

couponSchema.index({ order: 1, isActive: 1 });
couponSchema.index({ stateId: 1, districtId: 1, mandalId: 1, isActive: 1 });

if (mongoose.models.Coupon) {
  delete mongoose.models.Coupon;
}
const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
