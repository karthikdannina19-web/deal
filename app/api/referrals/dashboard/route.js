import { dbConnect } from '@/config/database';
import { authenticate } from '@/middleware/auth.middleware';
import User from '@/models/user.model';
import ReferralLog from '@/models/referralLog.model';

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
    const user = await User.findById(userId).select('referralCode coinBalance firstName lastName');

    if (!user) {
      return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const logs = await ReferralLog.find({ referrerId: userId })
      .sort({ createdAt: -1 })
      .populate('newUserId', 'firstName lastName profileImage')
      .lean();

    const activity = logs.map(log => {
      const newUserName = log.newUserId ? `${log.newUserId.firstName || ''} ${log.newUserId.lastName || ''}`.trim() : 'Unknown User';
      return {
        id: log._id,
        type: 'referral_success',
        title: 'Referral Reward',
        subtitle: `Invited ${newUserName || 'a friend'}`,
        amount: log.coinsGivenToReferrer,
        isPositive: true,
        date: log.createdAt.toISOString()
      };
    });

    const totalReferrals = logs.length;
    const totalReferralCoins = logs.reduce((sum, log) => sum + log.coinsGivenToReferrer, 0);
    const domain = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com';

    return Response.json({
      success: true,
      message: 'Referrals dashboard fetched successfully',
      data: {
        referralCode: user.referralCode || 'N/A',
        shareMessage: `Use my referral code ${user.referralCode} to get free coins!`,
        shareUrl: `${domain}/invite/${user.referralCode}`,
        banner: {
          badgeText: 'Earn Coins',
          title: 'Invite Friends & Earn',
          subtitle: 'Get 500 coins for every friend who joins using your code.',
          rewardText: '500 Coins',
          imageUrl: `${domain}/images/referral-banner.png`, // Placeholder
          ctaLabel: 'Share Now'
        },
        wallet: {
          availableCoins: user.coinBalance || 0
        },
        totalReferrals,
        totalReferralCoins,
        infoText: 'Coins will be credited once your friend signs up.',
        termsText: 'Terms and Conditions apply. Subject to fair use policy.',
        activity
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching referrals dashboard:', error);
    return Response.json({
      success: false,
      message: 'Failed to fetch referrals dashboard'
    }, { status: 500 });
  }
}
