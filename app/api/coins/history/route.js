import { dbConnect } from '@/config/database';
import { authenticate } from '@/middleware/auth.middleware';
import WalletTransaction from '@/models/walletTransaction.model';
import Referral from '@/models/referral.model';
import User from '@/models/user.model';

export async function GET(req) {
  try {
    await dbConnect();
    const authResult = await authenticate(req);
    if (authResult.error) {
      return Response.json(
        { success: false, message: authResult.error.message },
        { status: authResult.error.statusCode || 401 }
      );
    }

    const userId = authResult.user.id;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select('coinBalance totalCoinsEarned');
    if (!user) {
      return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments({ user: userId })
    ]);

    const referralBonusReferenceIds = transactions
      .filter((tx) => tx.transactionType === 'REFERRAL_BONUS' && tx.referenceId)
      .map((tx) => tx.referenceId);

    const referralDocs = referralBonusReferenceIds.length > 0
      ? await Referral.find({ _id: { $in: referralBonusReferenceIds } })
          .populate('referrer', 'firstName lastName phone')
          .lean()
      : [];

    const referralById = new Map(
      referralDocs.map((referral) => [referral._id.toString(), referral])
    );

    const formattedTransactions = transactions.map(tx => {
      let title = tx.transactionType.replace(/_/g, ' ');
      let subtitle = tx.type === 'credit' ? 'Coins Added' : 'Coins Deducted';
      let type = tx.transactionType.toLowerCase();
      let relatedReferrer = null;

      if (tx.transactionType === 'REFERRAL_REWARD') {
        title = 'Referral Reward';
        subtitle = 'Referral reward credited';
        type = 'referral_reward';
      } else if (tx.transactionType === 'REFERRAL_BONUS') {
        const referral = tx.referenceId ? referralById.get(tx.referenceId.toString()) : null;
        const referrer = referral?.referrer || null;
        const referrerName = `${referrer?.firstName || ''} ${referrer?.lastName || ''}`.trim();

        title = 'Referral Bonus';
        subtitle = referrerName ? `Referred by ${referrerName}` : 'Welcome bonus credited';
        type = 'signup_referral_bonus';

        if (referrer) {
          relatedReferrer = {
            _id: referrer._id,
            name: referrerName || referrer.phone || 'Unknown User',
            fullName: referrerName || referrer.phone || 'Unknown User',
            mobileNumber: referrer.phone || ''
          };
        }
      } else if (tx.transactionType === 'BONUS') {
        title = 'Bonus';
        subtitle = 'Bonus credited';
        type = 'bonus';
      } else if (tx.transactionType === 'REDEMPTION_DEBIT') {
        title = 'Redemption';
        subtitle = 'Coins redeemed';
        type = 'redemption';
      } else if (tx.transactionType === 'ADMIN_ADJUSTMENT') {
        title = 'Adjustment';
        subtitle = 'Admin adjustment';
        type = 'adjustment';
      }

      const responseItem = {
        id: tx._id,
        _id: tx._id,
        title,
        subtitle,
        amount: tx.amount,
        type,
        createdAt: tx.createdAt.toISOString()
      };

      if (relatedReferrer) {
        responseItem.referredBy = relatedReferrer;
        responseItem.referrer = relatedReferrer;
        responseItem.friend = relatedReferrer;
        responseItem.user = relatedReferrer;
        responseItem.referredByName = relatedReferrer.fullName;
        responseItem.referrerName = relatedReferrer.fullName;
        responseItem.friendName = relatedReferrer.fullName;
        responseItem.userName = relatedReferrer.fullName;
        responseItem.customerName = relatedReferrer.fullName;
      }

      return responseItem;
    });

    return Response.json({
      success: true,
      message: 'Coins history fetched successfully',
      data: {
        summary: {
          totalEarned: user.totalCoinsEarned || 0,
          availableBalance: user.coinBalance || 0
        },
        transactions: formattedTransactions
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching coins history:', error);
    return Response.json({
      success: false,
      message: 'Failed to fetch coins history'
    }, { status: 500 });
  }
}
