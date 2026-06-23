import mongoose from 'mongoose';

const districtSchema = new mongoose.Schema(
  {
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  }
);

districtSchema.index({ stateId: 1, normalizedName: 1 }, { unique: true });

const District = mongoose.models.District || mongoose.model('District', districtSchema);

export default District;
