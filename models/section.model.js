import mongoose from 'mongoose';

/**
 * Section Model
 * Represents curated groups of advertisements (e.g., Today's Deals, Trending)
 * with associated media assets and display order.
 */
const sectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // Small icon or representative image for the section
    image: {
      url: String,
      key: String, // S3 key for deletion
    },
    // Large banner shown at the top of the section page/view
    banner: {
      url: String,
      key: String, // S3 key for deletion
    },
    // Display order (1, 2, 3...)
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Statistics (cached for performance)
    adCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
sectionSchema.index({ order: 1 });
sectionSchema.index({ isActive: 1 });

// Pre-validate hook to ensure slug exists before validation
sectionSchema.pre('validate', function () {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

const Section = mongoose.models.Section || mongoose.model('Section', sectionSchema);

export default Section;
