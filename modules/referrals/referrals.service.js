import User from '../../models/user.model.js';
import Referral from '../../models/referral.model.js';
import ReferralSetting from '../../models/referralSetting.model.js';
import WalletTransaction from '../../models/walletTransaction.model.js';
import ReferralLog from '../../models/referralLog.model.js';
import mongoose from 'mongoose';

/**
 * Referrals Service
 * Handles user invites, relationship mapping, rewards, and tree nodes structure
 */
export class ReferralsService {
  /**
   * Generates or returns custom shareable registration referral link
   * @param {string} userId 
   */
  static async generateLink(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    if (!user.referralCode) {
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      user.referralCode = `USR-${rand}`;
      await user.save();
    }
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rhock.com';
    const link = `${baseUrl}/register?ref=${user.referralCode}`;
    
    return {
      referralCode: user.referralCode,
      referralLink: link
    };
  }

  /**
   * Get successful referrals history for a user
   * @param {string} userId 
   */
  static async getHistory(userId) {
    const referrals = await Referral.find({ referrer: userId })
      .populate('referred', 'firstName lastName email phone coinBalance')
      .sort({ createdAt: -1 });
    return referrals;
  }

  /**
   * Get dynamic multi-level tree structure for user's referrals (to render on visual graph)
   * @param {string} userId 
   */
  static async getTree(userId) {
    const directReferrals = await Referral.find({ referrer: userId })
      .populate('referred', 'firstName lastName email coinBalance');

    const userObj = await User.findById(userId).select('firstName lastName email');
    const myName = userObj?.firstName ? `${userObj.firstName} ${userObj.lastName || ''}`.trim() : 'User';

    const tree = {
      id: userId.toString(),
      name: myName,
      coinsEarned: directReferrals.reduce((sum, r) => sum + (r.rewardCoins || 0), 0),
      children: []
    };

    for (const r of directReferrals) {
      if (!r.referred) continue;
      
      const childId = r.referred._id;
      const secReferrals = await Referral.find({ referrer: childId })
        .populate('referred', 'firstName lastName email');
      
      tree.children.push({
        id: childId.toString(),
        name: r.referred.firstName ? `${r.referred.firstName} ${r.referred.lastName || ''}`.trim() : 'User',
        coinsEarned: r.rewardCoins,
        children: secReferrals.map(sr => ({
          id: sr.referred?._id?.toString() || 'sec',
          name: sr.referred?.firstName ? `${sr.referred.firstName} ${sr.referred.lastName || ''}`.trim() : 'User',
          coinsEarned: sr.rewardCoins,
          children: []
        }))
      });
    }

    return tree;
  }

  /**
   * Link a new registered user to their referring user
   * @param {string} referredUserId 
   * @param {string} referralCode 
   */
  static async handleReferralSignup(referredUserId, referralCode) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const referrerUser = await User.findOne({ referralCode }).session(session);
      if (!referrerUser) {
        throw new Error('Invalid referral code');
      }

      if (referrerUser._id.toString() === referredUserId.toString()) {
        throw new Error('Self referral is not allowed');
      }

      const referredUser = await User.findById(referredUserId).session(session);
      if (!referredUser) {
        throw new Error('Referred user not found');
      }

      if (referredUser.referredBy) {
        throw new Error('User has already been referred');
      }

      // 1. Fetch settings
      let settings = await ReferralSetting.findOne().session(session);
      if (!settings) {
        settings = new ReferralSetting();
        await settings.save({ session });
      }

      // Check daily limit for referrer
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const dailyCount = await Referral.countDocuments({
        referrer: referrerUser._id,
        createdAt: { $gte: startOfDay }
      }).session(session);

      if (dailyCount >= settings.dailyReferralLimit) {
        console.warn(`Referrer daily limit of ${settings.dailyReferralLimit} reached.`);
        referredUser.referredBy = referrerUser._id;
        referredUser.referralUsed = true;
        await referredUser.save({ session });
        
        const refObj = new Referral({
          referrer: referrerUser._id,
          referred: referredUser._id,
          rewardCoins: 0,
          status: 'pending'
        });
        await refObj.save({ session });
        
        await session.commitTransaction();
        return { success: true, reward: 0 };
      }

      // 2. Perform reward and updates
      referredUser.referredBy = referrerUser._id;
      referredUser.referralUsed = true;

      // Determine coin amounts (support backward compatibility)
      const coinsForReferrer = (settings.coinsForReferrer !== undefined) ? settings.coinsForReferrer : settings.coinsPerReferral || 0;
      const coinsForReferred = (settings.coinsForReferred !== undefined) ? settings.coinsForReferred : 0;

      const refOldBalance = referrerUser.coinBalance || 0;
      referrerUser.coinBalance = refOldBalance + coinsForReferrer;

      const referredOldBalance = referredUser.coinBalance || 0;
      referredUser.coinBalance = referredOldBalance + coinsForReferred;

      // 3. Create referral record
      const referralObj = new Referral({
        referrer: referrerUser._id,
        referred: referredUser._id,
        rewardCoins: coinsForReferrer,
        status: 'completed'
      });
      await referralObj.save({ session });

      // 4. Create wallet transactions for both users
      const txReferrer = new WalletTransaction({
        user: referrerUser._id,
        type: 'credit',
        amount: coinsForReferrer,
        balanceBefore: refOldBalance,
        balanceAfter: refOldBalance + coinsForReferrer,
        transactionType: 'REFERRAL_REWARD',
        referenceId: referralObj._id
      });
      await txReferrer.save({ session });

      if (coinsForReferred > 0) {
        const txReferred = new WalletTransaction({
          user: referredUser._id,
          type: 'credit',
          amount: coinsForReferred,
          balanceBefore: referredOldBalance,
          balanceAfter: referredOldBalance + coinsForReferred,
          transactionType: 'REFERRAL_BONUS',
          referenceId: referralObj._id
        });
        await txReferred.save({ session });
      }

      // 5. Create a referral log for analytics
      try {
        const rlog = new ReferralLog({
          referrerId: referrerUser._id,
          newUserId: referredUser._id,
          coinsGivenToReferrer: coinsForReferrer,
          coinsGivenToUser: coinsForReferred,
          deviceId: referredUser.deviceId,
          ipAddress: referredUser.ipAddress
        });
        await rlog.save({ session });
      } catch (err) {
        console.warn('Failed to save ReferralLog:', err.message);
      }

      await referredUser.save({ session });
      await referrerUser.save({ session });

      // Trigger Push Notification to referrer
      try {
        const { PushNotificationService } = await import('../../services/push-notification.service.js');
        const tokens = PushNotificationService.extractValidTokensFromUsers([referrerUser]);
        if (tokens.length > 0) {
          await PushNotificationService.sendToTokens(tokens, {
            title: 'Coins Received!',
            body: `You earned ${coinsForReferrer} coins for referring ${referredUser.firstName || 'a friend'}!`,
            type: 'referral_reward'
          });
        }
      } catch (err) {
        console.error('Failed to trigger referral push notification:', err.message);
      }

      await session.commitTransaction();
      return { success: true, reward: { referrer: coinsForReferrer, referred: coinsForReferred } };

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }
}
