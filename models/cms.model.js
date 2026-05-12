import mongoose from 'mongoose';

/**
 * CMS Page Model
 * Handles dynamic pages like Terms & Conditions, Privacy Policy, About Us
 */
const cmsPageSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true, // Stores the HTML content from WYSIWYG editor
    },
    contentType: {
      type: String,
      enum: ['html', 'json'],
      default: 'html',
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

const CmsPage = mongoose.models.CmsPage || mongoose.model('CmsPage', cmsPageSchema);

export default CmsPage;
