import mongoose from 'mongoose';
import { validateLocationName } from '../utils/location-name.js';

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
      validate: {
        validator(value) {
          return validateLocationName(value).valid;
        },
        message: 'Mandal name must be plain text, not an object or object-like string',
      },
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

const Mandal = mongoose.models.Mandal || mongoose.model('Mandal', mandalSchema);

export default Mandal;
