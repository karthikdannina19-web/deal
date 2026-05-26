import mongoose from 'mongoose';

const stateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

if (mongoose.models.State) {
  delete mongoose.models.State;
}
const State = mongoose.model('State', stateSchema);

export default State;
