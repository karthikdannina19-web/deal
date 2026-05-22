import mongoose from 'mongoose';

/**
 * Wallet Transaction Model
 * Ledger tracking user coin credits and debits
 */
const walletTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    transactionType: {
      type: String,
      enum: ['REFERRAL_REWARD', 'REFERRAL_BONUS', 'REDEMPTION_DEBIT', 'BONUS', 'ADMIN_ADJUSTMENT'],
      required: true,
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });

const WalletTransaction = mongoose.models.WalletTransaction || mongoose.model('WalletTransaction', walletTransactionSchema);

export default WalletTransaction;
