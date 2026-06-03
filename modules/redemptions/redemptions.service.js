import User from '../../models/user.model.js';
import Vendor from '../../models/vendor.model.js';
import RedemptionRequest from '../../models/redemptionRequest.model.js';
import WalletTransaction from '../../models/walletTransaction.model.js';
import VendorTransaction from '../../models/vendorTransaction.model.js';
import mongoose from 'mongoose';
import { hashData, compareHash } from '../../utils/hash.js';

/**
 * Redemptions Service
 * Manages vendor redemption requests, user approval workflows, and transaction ledgers
 */
export class RedemptionsService {
  static formatUserName(user) {
    return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  }

  static formatVendorActivity(request) {
    const user = request.user || {};
    return {
      _id: request._id?.toString(),
      userName: this.formatUserName(user),
      userUniqueCode: request.userUniqueCode || user.uniqueRedeemCode || user.referralCode || '',
      coinAmount: request.coinAmount || 0,
      mobileNumber: user.phone || '',
      status: request.status === 'APPROVED' ? 'success' : request.status === 'PENDING' ? 'otp_pending' : request.status === 'REJECTED' ? 'failed' : request.status,
      createdAt: request.createdAt
    };
  }

  static async sendOtpForRequest(request, user) {
    const now = new Date();

    if (request.otpLastSentAt) {
      const secondsSinceLastOtp = (now - new Date(request.otpLastSentAt)) / 1000;
      if (secondsSinceLastOtp < 30) {
        throw new Error(`Please wait ${Math.ceil(30 - secondsSinceLastOtp)} seconds before requesting a new OTP.`);
      }
    }

    if ((request.otpResendCount || 0) >= 3) {
      throw new Error('Maximum OTP resend limit reached for this request.');
    }

    const plainOtp = '1234';
    request.otp = await hashData(plainOtp);
    request.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    request.otpLastSentAt = now;
    request.otpResendCount = (request.otpResendCount || 0) + 1;
    request.attempts = 0;
    request.status = 'otp_pending';
    await request.save();

    const message = `Hello ${user.firstName || 'User'}, your OTP for redeeming ${request.coinAmount} coins is ${plainOtp}. It expires in 5 minutes.`;
    console.log('--------------------------------------------------');
    console.log(`[SMS GATEWAY MOCK] To: ${user.phone}`);
    console.log(`Message: ${message}`);
    console.log('--------------------------------------------------');
  }

  /**
   * Vendor requests to redeem coins from a user
   * @param {string} vendorUserId - User ID of the Vendor
   * @param {string} userUniqueCode 
   * @param {number} coinAmount 
   */
  static async requestRedeem(vendorUserId, userUniqueCode, coinAmount) {
    const normalizedCode = String(userUniqueCode || '').trim().toUpperCase();

    // 1. Fetch Vendor
    const vendor = await Vendor.findOne({ userId: vendorUserId });
    if (!vendor) throw new Error('Vendor profile not found');
    if (vendor.status !== 'active') throw new Error('Vendor account is not active');

    // 2. Fetch User by redemption code or referral code. The vendor app currently labels this as referral code.
    const user = await User.findOne({
      $or: [
        { uniqueRedeemCode: normalizedCode },
        { referralCode: normalizedCode }
      ]
    });
    if (!user) throw new Error('User not found with the provided code');
    if (user.status !== 'active') throw new Error('User account is currently not active');

    // 3. Balance verification
    if (user.coinBalance < coinAmount) {
      throw new Error(`User does not have enough coins. Available: ${user.coinBalance}`);
    }

    // 4. Create OTP pending request
    const request = new RedemptionRequest({
      user: user._id,
      vendor: vendor._id,
      coinAmount,
      userUniqueCode: normalizedCode,
      status: 'otp_pending'
    });
    await request.save();
    await this.sendOtpForRequest(request, user);

    // 5. Send Real-time Push Notification to user
    try {
      const { PushNotificationService } = await import('../../services/push-notification.service.js');
      const tokens = PushNotificationService.extractValidTokensFromUsers([user]);
      if (tokens.length > 0) {
        await PushNotificationService.sendToTokens(tokens, {
          title: 'Redemption OTP Sent',
          body: `Share the OTP only if you want "${vendor.storeName}" to redeem ${coinAmount} coins.`,
          type: 'redemption_request',
          metadata: {
            requestId: request._id.toString(),
            coinAmount: coinAmount.toString()
          }
        });
      }
    } catch (err) {
      console.error('Failed to send push notification to user:', err.message);
    }

    return {
      _id: request._id.toString(),
      userUniqueCode: normalizedCode,
      coinAmount: request.coinAmount,
      userName: this.formatUserName(user),
      mobileNumber: user.phone || '',
      status: request.status,
      createdAt: request.createdAt
    };
  }

  static async resendVendorRedeemOtp(vendorUserId, requestId) {
    const vendor = await Vendor.findOne({ userId: vendorUserId });
    if (!vendor) throw new Error('Vendor profile not found');

    const request = await RedemptionRequest.findOne({ _id: requestId, vendor: vendor._id }).populate('user', 'firstName lastName phone uniqueRedeemCode referralCode status');
    if (!request) throw new Error('Redemption request not found');
    if (request.status !== 'otp_pending') throw new Error(`Cannot resend OTP for request with status: ${request.status}`);

    await this.sendOtpForRequest(request, request.user);

    return this.formatVendorActivity(request);
  }

  static async verifyVendorRedeemOtp(vendorUserId, requestId, otp, idempotencyKey = null) {
    const vendor = await Vendor.findOne({ userId: vendorUserId });
    if (!vendor) throw new Error('Vendor profile not found');

    const request = await RedemptionRequest.findOne({ _id: requestId, vendor: vendor._id });
    if (!request) throw new Error('Redemption request not found');

    if (request.status === 'success' || request.status === 'APPROVED') {
      return {
        _id: request._id.toString(),
        coinAmount: request.coinAmount,
        status: 'success',
        alreadyProcessed: true,
        createdAt: request.createdAt
      };
    }

    if (request.status !== 'otp_pending') throw new Error(`Invalid request state: ${request.status}`);
    if (!request.otp || !request.otpExpiry) throw new Error('OTP has not been generated for this request');

    if (new Date() > request.otpExpiry) {
      request.status = 'failed';
      await request.save();
      throw new Error('OTP has expired');
    }

    if ((request.attempts || 0) >= 5) {
      request.status = 'failed';
      await request.save();
      throw new Error('Maximum verification attempts exceeded');
    }

    const isMatch = await compareHash(String(otp), request.otp);
    if (!isMatch) {
      request.attempts = (request.attempts || 0) + 1;
      await request.save();
      throw new Error('Invalid OTP');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const lockedRequest = await RedemptionRequest.findOne({ _id: requestId, vendor: vendor._id }).session(session);
      if (!lockedRequest) throw new Error('Redemption request not found');
      if (lockedRequest.status === 'success' || lockedRequest.status === 'APPROVED') {
        await session.commitTransaction();
        return {
          _id: lockedRequest._id.toString(),
          coinAmount: lockedRequest.coinAmount,
          status: 'success',
          alreadyProcessed: true,
          createdAt: lockedRequest.createdAt
        };
      }
      if (lockedRequest.status !== 'otp_pending') throw new Error(`Invalid request state: ${lockedRequest.status}`);

      const user = await User.findById(lockedRequest.user).session(session);
      const lockedVendor = await Vendor.findById(lockedRequest.vendor).session(session);
      if (!user || !lockedVendor) throw new Error('User or Vendor record missing');
      if (user.coinBalance < lockedRequest.coinAmount) throw new Error('User has insufficient balance for this redemption');

      const userOldBalance = user.coinBalance || 0;
      const vendorOldBalance = lockedVendor.coinBalance || 0;

      user.coinBalance = userOldBalance - lockedRequest.coinAmount;
      lockedVendor.coinBalance = vendorOldBalance + lockedRequest.coinAmount;
      lockedRequest.status = 'success';
      lockedRequest.approvedAt = new Date();

      await user.save({ session });
      await lockedVendor.save({ session });
      await lockedRequest.save({ session });

      await new WalletTransaction({
        user: user._id,
        type: 'debit',
        amount: lockedRequest.coinAmount,
        balanceBefore: userOldBalance,
        balanceAfter: user.coinBalance,
        transactionType: 'REDEMPTION_DEBIT',
        referenceId: lockedRequest._id
      }).save({ session });

      await new VendorTransaction({
        vendor: lockedVendor._id,
        amount: lockedRequest.coinAmount,
        type: 'credit',
        redemptionRequest: lockedRequest._id
      }).save({ session });

      const AuditLog = (await import('../../models/auditLog.model.js')).default;
      await new AuditLog({
        action: 'COIN_REDEMPTION_OTP_VERIFIED',
        userId: user._id,
        role: 'user',
        entityId: lockedRequest._id,
        entityType: 'redemption_request',
        actionType: 'update',
        severity: 'low',
        metadata: { vendorId: lockedVendor._id, amount: lockedRequest.coinAmount, idempotencyKey }
      }).save({ session });

      await session.commitTransaction();

      return {
        _id: lockedRequest._id.toString(),
        coinAmount: lockedRequest.coinAmount,
        status: 'success',
        createdAt: lockedRequest.createdAt
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * User approves a redemption request
   * @param {string} userId 
   * @param {string} requestId 
   */
  static async approveRedemption(userId, requestId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const request = await RedemptionRequest.findById(requestId).session(session);
      if (!request) throw new Error('Redemption request not found');
      if (request.status !== 'PENDING') throw new Error('Request has already been processed');
      if (request.user.toString() !== userId.toString()) {
        throw new Error('Unauthorized to approve this request');
      }

      const user = await User.findById(userId).session(session);
      const vendor = await Vendor.findById(request.vendor).session(session);

      if (!user || !vendor) throw new Error('User or Vendor record missing');

      // Final balance verification under transactional lock
      if (user.coinBalance < request.coinAmount) {
        throw new Error('Insufficient balance for redemption approval');
      }

      const userOldBalance = user.coinBalance;
      const vendorOldBalance = vendor.coinBalance || 0;

      // Double-entry transfer
      user.coinBalance = userOldBalance - request.coinAmount;
      vendor.coinBalance = vendorOldBalance + request.coinAmount;

      request.status = 'APPROVED';
      request.approvedAt = new Date();

      // Save documents
      await user.save({ session });
      await vendor.save({ session });
      await request.save({ session });

      // Create transaction history ledgers
      const userTx = new WalletTransaction({
        user: user._id,
        type: 'debit',
        amount: request.coinAmount,
        balanceBefore: userOldBalance,
        balanceAfter: user.coinBalance,
        transactionType: 'REDEMPTION_DEBIT',
        referenceId: request._id
      });
      await userTx.save({ session });

      const vendorTx = new VendorTransaction({
        vendor: vendor._id,
        amount: request.coinAmount,
        type: 'credit',
        redemptionRequest: request._id
      });
      await vendorTx.save({ session });

      // Audit Log log entries
      const AuditLog = (await import('../../models/auditLog.model.js')).default;
      await new AuditLog({
        action: 'COIN_REDEMPTION_APPROVED',
        userId: user._id,
        role: 'user',
        entityId: request._id,
        entityType: 'redemption_request',
        actionType: 'update',
        severity: 'low',
        metadata: { vendorId: vendor._id, amount: request.coinAmount }
      }).save({ session });

      // Push Notification to Vendor's user account
      try {
        const vendorUser = await User.findById(vendor.userId).session(session);
        if (vendorUser) {
          const { PushNotificationService } = await import('../../services/push-notification.service.js');
          const tokens = PushNotificationService.extractValidTokensFromUsers([vendorUser]);
          if (tokens.length > 0) {
            await PushNotificationService.sendToTokens(tokens, {
              title: 'Redemption Request Approved',
              body: `User has approved your request. ${request.coinAmount} coins have been added to your wallet.`,
              type: 'redemption_approved',
              metadata: {
                requestId: request._id.toString()
              }
            });
          }
        }
      } catch (err) {
        console.error('Failed to notify vendor of approved request:', err.message);
      }

      await session.commitTransaction();
      return request;

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * User rejects a redemption request
   * @param {string} userId 
   * @param {string} requestId 
   */
  static async rejectRedemption(userId, requestId) {
    const request = await RedemptionRequest.findById(requestId);
    if (!request) throw new Error('Redemption request not found');
    if (request.status !== 'PENDING') throw new Error('Request has already been processed');
    if (request.user.toString() !== userId.toString()) {
      throw new Error('Unauthorized to reject this request');
    }

    request.status = 'REJECTED';
    request.rejectedAt = new Date();
    await request.save();

    // Push Notification to Vendor User
    try {
      const vendor = await Vendor.findById(request.vendor);
      if (vendor) {
        const vendorUser = await User.findById(vendor.userId);
        if (vendorUser) {
          const { PushNotificationService } = await import('../../services/push-notification.service.js');
          const tokens = PushNotificationService.extractValidTokensFromUsers([vendorUser]);
          if (tokens.length > 0) {
            await PushNotificationService.sendToTokens(tokens, {
              title: 'Redemption Request Rejected',
              body: `The user has rejected your request to redeem ${request.coinAmount} coins.`,
              type: 'redemption_rejected',
              metadata: {
                requestId: request._id.toString()
              }
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to notify vendor of rejected request:', err.message);
    }

    return request;
  }

  /**
   * Get pending redemption requests for user
   * @param {string} userId 
   */
  static async getPending(userId) {
    const pending = await RedemptionRequest.find({ user: userId, status: 'PENDING' })
      .populate('vendor', 'storeName profileImage')
      .sort({ createdAt: -1 });
    return pending;
  }

  /**
   * Get historical redemption logs for a vendor
   * @param {string} vendorUserId 
   */
  static async getVendorHistory(vendorUserId) {
    const vendor = await Vendor.findOne({ userId: vendorUserId });
    if (!vendor) throw new Error('Vendor profile not found');

    const activityRecords = await RedemptionRequest.find({ vendor: vendor._id })
      .populate('user', 'firstName lastName email phone uniqueRedeemCode referralCode')
      .sort({ createdAt: -1 });

    const totalRedeemedResult = await RedemptionRequest.aggregate([
      { $match: { vendor: vendor._id, status: { $in: ['success', 'APPROVED'] } } },
      { $group: { _id: null, total: { $sum: '$coinAmount' } } }
    ]);

    const usersRedeemedResult = await RedemptionRequest.distinct('user', {
      vendor: vendor._id,
      status: { $in: ['success', 'APPROVED'] }
    });

    return {
      wallet: {
        balance: vendor.coinBalance || 0,
        totalRedeemed: totalRedeemedResult[0]?.total || 0,
        usersRedeemed: usersRedeemedResult.length,
        storeName: vendor.storeName || ''
      },
      activity: activityRecords.map((request) => this.formatVendorActivity(request))
    };
  }

  /**
   * Dynamic stats summary of a User's coin wallet
   * @param {string} userId 
   */
  static async getUserWalletStats(userId) {
    const user = await User.findById(userId).select('coinBalance');
    if (!user) throw new Error('User not found');

    const credits = await WalletTransaction.aggregate([
      { $match: { user: user._id, type: 'credit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const debits = await WalletTransaction.aggregate([
      { $match: { user: user._id, type: 'debit' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pending = await RedemptionRequest.aggregate([
      { $match: { user: user._id, status: 'PENDING' } },
      { $group: { _id: null, total: { $sum: '$coinAmount' } } }
    ]);

    return {
      balance: user.coinBalance || 0,
      totalEarned: credits[0]?.total || 0,
      totalSpent: debits[0]?.total || 0,
      pendingRedemption: pending[0]?.total || 0
    };
  }
}
