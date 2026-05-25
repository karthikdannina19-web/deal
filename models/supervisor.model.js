import mongoose from 'mongoose';

/**
 * Supervisor Model
 * Handles supervisor profiles and unique codes
 */
const supervisorSchema = new mongoose.Schema(
  {
    // Reference to the logged-in user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true, // One user = one supervisor profile
      index: true,
      required: true,
    },
    
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
    },
    
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    supervisorCode: {
      type: String,
      unique: true,
      index: true,
    },

    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },

    totalVendors: {
      type: Number,
      default: 0,
    },

    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate unique 6-digit code before saving
supervisorSchema.pre('save', async function () {
  if (this.isNew || !this.supervisorCode) {
    let unique = false;
    while (!unique) {
      // Generate 6 digit string
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const existing = await mongoose.models.Supervisor.findOne({ supervisorCode: code });
      if (!existing) {
        this.supervisorCode = code;
        unique = true;
      }
    }
  }
});

const Supervisor = mongoose.models.Supervisor || mongoose.model('Supervisor', supervisorSchema);

export default Supervisor;
