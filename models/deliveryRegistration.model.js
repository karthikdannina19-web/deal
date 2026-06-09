import mongoose from 'mongoose';

const deliveryRegistrationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    vehicleType: {
      type: String,
      required: [true, 'Vehicle type is required'],
      enum: ['bike', 'scooter', 'auto', 'car', 'van', 'cycle', 'other'],
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: [true, 'Vehicle number is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    assignedBranch: {
      branchId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      branchType: {
        type: String,
        required: true,
        enum: ['store', 'vendor'],
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
      address: {
        type: String,
        default: '',
        trim: true,
      },
      phone: {
        type: String,
        default: '',
        trim: true,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'inactive'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

deliveryRegistrationSchema.index({ mobileNumber: 1, vehicleNumber: 1 });

const DeliveryRegistration =
  mongoose.models.DeliveryRegistration ||
  mongoose.model('DeliveryRegistration', deliveryRegistrationSchema);

export default DeliveryRegistration;
