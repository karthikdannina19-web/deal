import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    subtitle: { type: String, trim: true, maxlength: 250 },
    category: { type: String, trim: true, index: true },
    imageUrl: { type: String, trim: true },
    couponCode: { type: String, trim: true },
    isCodeUserSpecific: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

couponSchema.index({ order: 1, isActive: 1 });

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
export default Coupon;
