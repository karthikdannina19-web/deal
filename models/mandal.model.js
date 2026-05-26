import mongoose from 'mongoose';

const mandalSchema = new mongoose.Schema(
  {
    districtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'District',
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

mandalSchema.index({ districtId: 1, normalizedName: 1 }, { unique: true });

if (mongoose.models.Mandal) {
  delete mongoose.models.Mandal;
}
const Mandal = mongoose.model('Mandal', mandalSchema);

export default Mandal;
