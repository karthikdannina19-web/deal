import mongoose from 'mongoose';

const priorityRuleSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: ['section', 'ad', 'vendor', 'store'],
      required: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    scopeLevel: {
      type: String,
      enum: ['global', 'state', 'district', 'mandal'],
      required: true,
      default: 'global',
      index: true,
    },
    stateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'State',
      index: true,
      default: null,
    },
    districtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'District',
      index: true,
      default: null,
    },
    mandalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Mandal',
      index: true,
      default: null,
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

priorityRuleSchema.index(
  {
    entityType: 1,
    entityId: 1,
    scopeLevel: 1,
    stateId: 1,
    districtId: 1,
    mandalId: 1,
  },
  { unique: true, sparse: true }
);

priorityRuleSchema.index({
  entityType: 1,
  scopeLevel: 1,
  stateId: 1,
  districtId: 1,
  mandalId: 1,
  isActive: 1,
  priority: 1,
});

if (mongoose.models.PriorityRule) {
  delete mongoose.models.PriorityRule;
}

const PriorityRule = mongoose.model('PriorityRule', priorityRuleSchema);

export default PriorityRule;
