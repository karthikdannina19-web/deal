import mongoose from 'mongoose';

/**
 * Category Model
 * Stores business categories for vendors (e.g., Electronics, Fashion, etc.)
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      maxlength: 50,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    iconUrl: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Section',
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
categorySchema.index({ isActive: 1 });
categorySchema.index({ sectionId: 1, visibilityLevel: 1, visibilityStateId: 1, visibilityDistrictId: 1, visibilityMandalId: 1, visibilityEnabled: 1, isActive: 1 });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
