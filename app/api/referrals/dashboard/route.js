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
        referredUserName: newUserName || 'Unknown User',
        amount: log.coinsGivenToReferrer || 0,
        type: 'referral_reward',
        createdAt: log.createdAt.toISOString()
      };
    });

    const totalReferrals = logs.length;
    const totalReferralCoins = logs.reduce((sum, log) => sum + log.coinsGivenToReferrer, 0);

    return Response.json({
      success: true,
      message: 'Referrals dashboard fetched successfully',
      data: {
        referralCode: user.referralCode || 'N/A',
        availableCoins: user.coinBalance || 0,
        totalReferrals,
        totalReferralCoins,
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
