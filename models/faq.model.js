import mongoose from 'mongoose';

/**
 * FAQ Model
 * Handles dynamic Frequently Asked Questions
 */
const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true, // Supports HTML or plain text
    },
    category: {
      type: String,
      default: 'general',
      index: true,
      trim: true,
      lowercase: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Faq = mongoose.models.Faq || mongoose.model('Faq', faqSchema);

export default Faq;
