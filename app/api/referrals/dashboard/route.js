import { dbConnect } from '@/config/database';
import { authenticate } from '@/middleware/auth.middleware';
import User from '@/models/user.model';
import ReferralLog from '@/models/referralLog.model';
import ReferralSetting from '@/models/referralSetting.model';

function buildUserName(user) {
  if (!user) return 'Unknown User';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.phone || user.email || 'Unknown User';
}

function formatJoinedAt(dateValue) {
  const date = new Date(dateValue);
  const datePart = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `Joined on ${datePart}, ${timePart}`;
}

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
    const [user, settings, logs] = await Promise.all([
      User.findById(userId).select('referralCode coinBalance firstName lastName'),
      ReferralSetting.findOne().lean(),
      ReferralLog.find({ referrerId: userId })
        .sort({ createdAt: -1 })
        .populate('newUserId', 'firstName lastName phone email')
        .lean(),
    ]);

    if (!user) {
      return Response.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const coinsForReferrer = settings?.coinsForReferrer ?? settings?.coinsPerReferral ?? 500;
    const coinsForReferred = settings?.coinsForReferred ?? 0;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rhock.vercel.app';
    const referralCode = user.referralCode || 'N/A';
    const shareUrl = `${baseUrl}/register?ref=${encodeURIComponent(referralCode)}`;
    const activity = logs.map((log) => {
      const referredUserName = buildUserName(log.newUserId);
      const amount = log.coinsGivenToReferrer || 0;

      return {
        id: log._id.toString(),
        type: 'referral_reward',
        referredUserName,
        title: referredUserName,
        subtitle: formatJoinedAt(log.createdAt),
        amount,
        isPositive: amount >= 0,
        createdAt: new Date(log.createdAt).toISOString(),
      };
    });

    const totalReferrals = logs.length;
    const totalReferralCoins = logs.reduce((sum, log) => sum + (log.coinsGivenToReferrer || 0), 0);

    return Response.json({
      success: true,
      data: {
        referralCode,
        availableCoins: user.coinBalance || 0,
        balance: user.coinBalance || 0,
        totalReferrals,
        totalReferralCoins,
        coinsForReferrer,
        coinsForReferred,
        shareMessage: `Use my referral code ${referralCode} to join Rhock Deals`,
        shareUrl,
        infoText: 'Coins are digital rewards you can redeem at any partner vendor during your purchase.',
        activity,
        recentActivity: activity,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching referrals dashboard:', error);
    return Response.json({
      success: false,
      message: 'Failed to fetch referrals dashboard',
    }, { status: 500 });
  }
}
