import User from '../../models/user.model.js';
import Vendor from '../../models/vendor.model.js';
import ReferralLog from '../../models/referralLog.model.js';
import Referral from '../../models/referral.model.js';
import ReferralSetting from '../../models/referralSetting.model.js';
import WalletTransaction from '../../models/walletTransaction.model.js';
import mongoose from 'mongoose';

/**
 * User Service
 * Handles business logic for user profile and wallet data
 */
export class UserService {
  /**
   * Fetch a user's core profile data by their ID
   * @param {string} userId - The unique identifier of the user
   * @returns {Object|null} Sanitized user data
   */
  static async getUserProfile(userId) {
    // We only select the non-sensitive fields required for the profile view
    const user = await User.findById(userId)
      .select('firstName lastName email profileImage phone referralCode coinBalance location createdAt')
      .lean();

    return user;
  }

  /**
   * Update user profile details (Name, Email, Image, onboarding status)
   * @param {string} userId 
   * @param {Object} updateData { name, email, profileImage }
   */
  static async updateProfile(userId, { fullName, email, profileImage }) {
    const updateFields = { profileCompleted: true };

    if (fullName) {
      const nameParts = fullName.trim().split(' ');
      updateFields.firstName = nameParts[0];
      updateFields.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
    }

    if (email) {
      updateFields.email = email.toLowerCase().trim();
    }

    if (profileImage) {
      updateFields.profileImage = profileImage;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { returnDocument: 'after' }
    ).select('firstName lastName email phone profileImage profileCompleted');

    if (!user) throw new Error('User account not found');

    return user;
  }

  /**
   * Save or update the user's GPS location and address details
   * @param {string} userId 
   * @param {Object} locationData 
   */
  static async saveLocation(userId, locationData) {
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          location: {
            ...locationData,
            lastUpdated: new Date()
          }
        } 
      },
      { returnDocument: 'after' }
    ).select('location');

    if (!user) throw new Error('User account not found');

    return user.location;
  }

  /**
   * Apply a referral code and reward both users using an atomic transaction
   * @param {string} newUserId 
   * @param {string} referralCode 
   * @param {Object} metadata { deviceId, ipAddress }
   */
  static async applyReferral(newUserId, referralCode, { deviceId, ipAddress } = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Fetch the new user applying the code
      const newUser = await User.findById(newUserId).session(session);
      if (!newUser) throw new Error('User account not found');

      // 2. Abuse Prevention: Only one referral allowed per user
      if (newUser.referredBy || newUser.referralUsed) {
        throw new Error('Referral code already applied for this account');
      }

      // 2a. Abuse Prevention: Device limits (Max 2 per day)
      if (deviceId) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const deviceUsageCount = await ReferralLog.countDocuments({
          deviceId,
          createdAt: { $gte: startOfDay }
        }).session(session);

        if (deviceUsageCount >= 2) {
          throw new Error('Maximum referral limit reached for this device today');
        }
      }

      // 3. Identification: Find the referrer owning the code
      const referrer = await User.findOne({ referralCode }).session(session);
      if (!referrer) {
        throw new Error('The provided referral code is invalid');
      }

      // 4. Abuse Prevention: Self-referral is forbidden
      if (referrer._id.toString() === newUserId.toString()) {
        throw new Error('You cannot refer yourself');
      }


      // 5. Fetch settings and apply configured rewards
      let settings = await ReferralSetting.findOne().session(session);
      if (!settings) {
        settings = new ReferralSetting();
        await settings.save({ session });
      }

      const coinsForReferrer = (settings.coinsForReferrer !== undefined) ? settings.coinsForReferrer : settings.coinsPerReferral || 0;
      const coinsForReferred = (settings.coinsForReferred !== undefined) ? settings.coinsForReferred : 0;

      // Update balances and links
      newUser.referredBy = referrer._id;
      newUser.referralUsed = true;
      newUser.deviceId = deviceId;
      newUser.ipAddress = ipAddress;

      const newUserOld = newUser.coinBalance || 0;
      newUser.coinBalance = newUserOld + coinsForReferred;
      await newUser.save({ session, validateBeforeSave: false });

      const refOld = referrer.coinBalance || 0;
      referrer.coinBalance = refOld + coinsForReferrer;
      await referrer.save({ session, validateBeforeSave: false });

      // 6. Create Referral record
      const referralObj = new Referral({
        referrer: referrer._id,
        referred: newUser._id,
        rewardCoins: coinsForReferrer,
        status: 'completed'
      });
      await referralObj.save({ session });

      // 7. Ledger entries
      const refTx = new WalletTransaction({
        user: referrer._id,
        type: 'credit',
        amount: coinsForReferrer,
        balanceBefore: refOld,
        balanceAfter: refOld + coinsForReferrer,
        transactionType: 'REFERRAL_REWARD',
        referenceId: referralObj._id
      });
      await refTx.save({ session });

      if (coinsForReferred > 0) {
        const newUserTx = new WalletTransaction({
          user: newUser._id,
          type: 'credit',
          amount: coinsForReferred,
          balanceBefore: newUserOld,
          balanceAfter: newUserOld + coinsForReferred,
          transactionType: 'REFERRAL_BONUS',
          referenceId: referralObj._id
        });
        await newUserTx.save({ session });
      }

      // 8. Immutable referral log
      const log = new ReferralLog({
        referrerId: referrer._id,
        newUserId: newUser._id,
        coinsGivenToReferrer: coinsForReferrer,
        coinsGivenToUser: coinsForReferred,
        deviceId,
        ipAddress
      });
      await log.save({ session });

      // 8. Finalize Transaction
      await session.commitTransaction();
      
      return {
        referrerCoins: coinsForReferrer,
        newUserCoins: coinsForReferred
      };

    } catch (error) {
      // Rollback all changes if any step fails
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete User Account (Soft Delete)
   * Suffixes identifiers to allow re-registration
   * @param {string} userId 
   */
  static async deleteUserAccount(userId) {
    const timestamp = Date.now();

    const user = await User.findById(userId);
    if (!user) throw new Error('User account not found');

    if (user.status !== 'deleted') {
      if (user.email) user.email = `${user.email}_del_${timestamp}`;
      if (user.phone) user.phone = `${user.phone}_del_${timestamp}`;
      if (user.referralCode) user.referralCode = `${user.referralCode}_del_${timestamp}`;

      user.status = 'deleted';
      user.deletedAt = new Date();
      user.fcmTokens = []; 
      await user.save();
    }

    // Also soft-delete the associated Vendor profile if it exists
    const vendor = await Vendor.findOne({ userId });
    if (vendor && vendor.status !== 'deleted') {
      const parts = (vendor.email || '').split('@');
      const suffixedEmail = parts.length === 2 ? `${parts[0]}+del_${timestamp}@${parts[1]}` : `${vendor.email}_del_${timestamp}`;
      const suffixedMobile = `${vendor.mobileNumber}_del_${timestamp}`;
      const suffixedSlug = vendor.slug ? `${vendor.slug}_del_${timestamp}` : undefined;

      await Vendor.updateOne(
        { _id: vendor._id },
        {
          $set: {
            email: suffixedEmail,
            mobileNumber: suffixedMobile,
            slug: suffixedSlug,
            status: 'deleted',
            deletedAt: new Date(),
            is_deleted: true,
            account_status: 'DELETED'
          }
        }
      );
      console.log(`[User Deletion] Soft-deleted associated vendor profile: ${vendor._id}`);
    }

    console.log(`[User Deletion] Account deleted for user ${userId} - Identifiers suffixed`);
    return { success: true };
  }
}
