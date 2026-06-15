import { RedemptionsService } from './redemptions.service.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { dbConnect } from '../../config/database.js';
import RedemptionRequest from '../../models/redemptionRequest.model.js';
import WalletTransaction from '../../models/walletTransaction.model.js';
import VendorTransaction from '../../models/vendorTransaction.model.js';
import Vendor from '../../models/vendor.model.js';
import User from '../../models/user.model.js';
import mongoose from 'mongoose';

/**
 * Redemptions Controller
 * Handles user, vendor, and admin coin wallet operations and double-entry transaction ledgers
 */
export class RedemptionsController {
  /**
   * POST /api/redemption/approve
   */
  static async approve(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const body = await req.json();
      const { requestId } = body;
      if (!requestId) return Response.json({ success: false, message: 'Request ID is required' }, { status: 400 });

      const result = await RedemptionsService.approveRedemption(user.id, requestId);
      return Response.json({ success: true, message: 'Redemption approved successfully', request: result }, { status: 200 });
    } catch (error) {
      console.error('[RedemptionsController approve Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
  }

  /**
   * POST /api/redemption/reject
   */
  static async reject(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const body = await req.json();
      const { requestId } = body;
      if (!requestId) return Response.json({ success: false, message: 'Request ID is required' }, { status: 400 });

      const result = await RedemptionsService.rejectRedemption(user.id, requestId);
      return Response.json({ success: true, message: 'Redemption request rejected', request: result }, { status: 200 });
    } catch (error) {
      console.error('[RedemptionsController reject Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
  }

  /**
   * GET /api/redemption/pending
   */
  static async getPending(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const pending = await RedemptionsService.getPending(user.id);
      return Response.json({ success: true, pending }, { status: 200 });
    } catch (error) {
      console.error('[RedemptionsController getPending Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/wallet/balance
   */
  static async getWalletBalance(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const stats = await RedemptionsService.getUserWalletStats(user.id);

      // Fetch unique redemption code to display
      const fullUser = await User.findById(user.id).select('uniqueRedeemCode');

      return Response.json({
        success: true,
        stats,
        uniqueRedeemCode: fullUser?.uniqueRedeemCode || ''
      }, { status: 200 });
    } catch (error) {
      console.error('[RedemptionsController getWalletBalance Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/wallet/transactions
   */
  static async getWalletTransactions(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const transactions = await WalletTransaction.find({ user: user.id })
        .sort({ createdAt: -1 })
        .limit(50);

      return Response.json({ success: true, transactions }, { status: 200 });
    } catch (error) {
      console.error('[RedemptionsController getWalletTransactions Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  // ==========================================
  //               VENDOR ENDPOINTS
  // ==========================================

  /**
   * POST /api/vendor/redeem/request
   */
  static async vendorRequestRedeem(req) {
    try {
      await dbConnect();
      const { user: vendorUser, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(vendorUser, ['vendor']);
      if (roleError) return roleError;

      const body = await req.json();
      const userCode = body.userUniqueCode || body.referralCode || body.code;
      const parsedCoinAmount = Number(body.coinAmount ?? body.coins);

      if (!userCode || !Number.isFinite(parsedCoinAmount) || parsedCoinAmount <= 0) {
        return Response.json({ success: false, message: 'Valid user code and coin amount are required' }, { status: 400 });
      }

      const request = await RedemptionsService.requestRedeem(vendorUser.id, userCode, parsedCoinAmount);

      return Response.json({
        success: true,
        message: 'OTP sent to user.',
        request
      }, { status: 201 });

    } catch (error) {
      console.error('[RedemptionsController vendorRequestRedeem Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
  }

  /**
   * GET /api/vendor/redemption/history
   */
  static async vendorGetHistory(req) {
    try {
      await dbConnect();
      const { user: vendorUser, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(vendorUser, ['vendor']);
      if (roleError) return roleError;

      const history = await RedemptionsService.getVendorHistory(vendorUser.id);
      return Response.json({
        success: true,
        wallet: history.wallet,
        activity: history.activity,
        history: history.activity
      }, { status: 200 });
    } catch (error) {
      console.error('[RedemptionsController vendorGetHistory Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/redeem/verify-otp
   */
  static async vendorVerifyRedeemOtp(req) {
    try {
      await dbConnect();
      const { user: vendorUser, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(vendorUser, ['vendor']);
      if (roleError) return roleError;

      const body = await req.json();
      const { requestId, otp } = body;
      const idempotencyKey = req.headers.get('x-idempotency-key');

      if (!requestId || !otp) {
        return Response.json({ success: false, message: 'Request ID and OTP are required' }, { status: 400 });
      }

      const result = await RedemptionsService.verifyVendorRedeemOtp(vendorUser.id, requestId, otp, idempotencyKey);

      return Response.json({
        success: true,
        message: 'Coins redeemed successfully.',
        request: result
      }, { status: 200 });
    } catch (error) {
      console.error('[RedemptionsController vendorVerifyRedeemOtp Error]', error);
      const status = error.message.includes('not found') ? 404 : 400;
      return Response.json({ success: false, message: error.message }, { status });
    }
  }

  /**
   * POST /api/vendor/redeem/resend-otp
   */
  static async vendorResendRedeemOtp(req) {
    try {
      await dbConnect();
      const { user: vendorUser, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(vendorUser, ['vendor']);
      if (roleError) return roleError;

      const body = await req.json();
      const { requestId } = body;

      if (!requestId) {
        return Response.json({ success: false, message: 'Request ID is required' }, { status: 400 });
      }

      const request = await RedemptionsService.resendVendorRedeemOtp(vendorUser.id, requestId);

      return Response.json({
        success: true,
        message: 'OTP resent to user.',
        request
      }, { status: 200 });
    } catch (error) {
      console.error('[RedemptionsController vendorResendRedeemOtp Error]', error);
      const status = error.message.includes('not found') ? 404 : 400;
      return Response.json({ success: false, message: error.message }, { status });
    }
  }

  /**
   * GET /api/vendor/wallet
   */
  static async vendorGetWallet(req) {
    try {
      await dbConnect();
      const { user: vendorUser, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(vendorUser, ['vendor']);
      if (roleError) return roleError;

      const vendor = await Vendor.findOne({ userId: vendorUser.id }).select('coinBalance storeName');
      if (!vendor) return Response.json({ success: false, message: 'Vendor not found' }, { status: 404 });

      // Calculate total redeemed summary
      const totalRedeemedResult = await RedemptionRequest.aggregate([
        { $match: { vendor: vendor._id, status: { $in: ['APPROVED', 'success'] } } },
        { $group: { _id: null, total: { $sum: '$coinAmount' } } }
      ]);

      return Response.json({
        success: true,
        balance: vendor.coinBalance || 0,
        storeName: vendor.storeName,
        totalRedeemed: totalRedeemedResult[0]?.total || 0
      }, { status: 200 });

    } catch (error) {
      console.error('[RedemptionsController vendorGetWallet Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  // ==========================================
  //               ADMIN ENDPOINTS
  // ==========================================

  /**
   * GET /api/admin/redemptions
   */
  static async getAdminRedemptions(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status');
      const vendorId = searchParams.get('vendorId');
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const page = parseInt(searchParams.get('page') || '1', 10);
      const isHighValue = searchParams.get('highValue') === 'true';

      const skip = (page - 1) * limit;

      let filterQuery = {};
      if (status) filterQuery.status = status;
      if (vendorId) filterQuery.vendor = vendorId;
      if (isHighValue) filterQuery.coinAmount = { $gte: 200 }; // High value filter threshold

      const total = await RedemptionRequest.countDocuments(filterQuery);
      const redemptions = await RedemptionRequest.find(filterQuery)
        .populate('user', 'firstName lastName email uniqueRedeemCode')
        .populate('vendor', 'storeName contactPhone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit);

      // Circulation telemetry calculations
      const totalApprovedResult = await RedemptionRequest.aggregate([
        { $match: { status: { $in: ['APPROVED', 'success'] } } },
        { $group: { _id: null, total: { $sum: '$coinAmount' } } }
      ]);
      const totalPendingResult = await RedemptionRequest.aggregate([
        { $match: { status: { $in: ['PENDING', 'otp_pending'] } } },
        { $group: { _id: null, total: { $sum: '$coinAmount' } } }
      ]);

      const systemUserCirculation = await User.aggregate([
        { $group: { _id: null, total: { $sum: '$coinBalance' } } }
      ]);
      const systemVendorCirculation = await Vendor.aggregate([
        { $group: { _id: null, total: { $sum: '$coinBalance' } } }
      ]);

      let vendorLifetimeRedeemed = 0;
      if (vendorId) {
        const vendorStats = await RedemptionRequest.aggregate([
          { $match: { vendor: new mongoose.Types.ObjectId(vendorId), status: { $in: ['APPROVED', 'success'] } } },
          { $group: { _id: null, total: { $sum: '$coinAmount' } } }
        ]);
        vendorLifetimeRedeemed = vendorStats[0]?.total || 0;
      }

      return Response.json({
        success: true,
        redemptions,
        stats: {
          totalRedeemed: totalApprovedResult[0]?.total || 0,
          pendingRedemption: totalPendingResult[0]?.total || 0,
          userCirculation: systemUserCirculation[0]?.total || 0,
          vendorCirculation: systemVendorCirculation[0]?.total || 0,
          vendorLifetimeRedeemed
        },
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[RedemptionsController getAdminRedemptions Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/admin/wallet/logs
   */
  static async getAdminWalletLogs(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);

      const skip = (page - 1) * limit;

      const total = await WalletTransaction.countDocuments({});
      const logs = await WalletTransaction.find({})
        .populate('user', 'firstName lastName email referralCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit);

      return Response.json({
        success: true,
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[RedemptionsController getAdminWalletLogs Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/admin/vendors/[id]/redemptions
   * Full lifetime redemption history for a specific vendor (admin-only)
   */
  static async getVendorRedemptionHistory(req, { params }) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      const { id: vendorId } = await params;
      if (!vendorId || !mongoose.Types.ObjectId.isValid(vendorId)) {
        return Response.json({ success: false, message: 'Invalid vendor ID' }, { status: 400 });
      }

      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);
      const statusFilter = searchParams.get('status') || '';
      const skip = (page - 1) * limit;

      const vendorObjId = new mongoose.Types.ObjectId(vendorId);

      // Fetch vendor profile
      const vendor = await Vendor.findById(vendorObjId).select('storeName fullName email mobileNumber coinBalance location fullAddress media');
      if (!vendor) return Response.json({ success: false, message: 'Vendor not found' }, { status: 404 });

      // Build filter
      let filterQuery = { vendor: vendorObjId };
      if (statusFilter) filterQuery.status = statusFilter;

      // Paginated redemption history
      const total = await RedemptionRequest.countDocuments(filterQuery);
      const redemptions = await RedemptionRequest.find(filterQuery)
        .populate('user', 'firstName lastName email uniqueRedeemCode mobileNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit);

      // Lifetime aggregate stats
      const lifetimeStats = await RedemptionRequest.aggregate([
        { $match: { vendor: vendorObjId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalCoins: { $sum: '$coinAmount' },
          },
        },
      ]);

      // Build stats map
      const statsMap = { APPROVED: { count: 0, coins: 0 }, PENDING: { count: 0, coins: 0 }, REJECTED: { count: 0, coins: 0 }, OTHER: { count: 0, coins: 0 } };
      let totalLifetimeCoins = 0;
      let totalLifetimeCount = 0;
      for (const s of lifetimeStats) {
        const key = ['APPROVED', 'success'].includes(s._id) ? 'APPROVED'
          : ['PENDING', 'otp_pending'].includes(s._id) ? 'PENDING'
          : ['REJECTED', 'failed'].includes(s._id) ? 'REJECTED' : 'OTHER';
        statsMap[key].count += s.count;
        statsMap[key].coins += s.totalCoins;
        totalLifetimeCoins += s.totalCoins;
        totalLifetimeCount += s.count;
      }

      // Monthly breakdown (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const monthlyBreakdown = await RedemptionRequest.aggregate([
        { $match: { vendor: vendorObjId, status: { $in: ['APPROVED', 'success'] }, createdAt: { $gte: twelveMonthsAgo } } },
        {
          $group: {
            _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
            count: { $sum: 1 },
            totalCoins: { $sum: '$coinAmount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      return Response.json({
        success: true,
        vendor: {
          _id: vendor._id,
          storeName: vendor.storeName,
          fullName: vendor.fullName,
          email: vendor.email,
          mobileNumber: vendor.mobileNumber,
          coinBalance: vendor.coinBalance,
          location: vendor.location,
          fullAddress: vendor.fullAddress,
          thumbnailUrl: vendor.media?.thumbnailUrl || null,
        },
        redemptions,
        stats: {
          totalLifetimeCoins,
          totalLifetimeCount,
          approved: statsMap.APPROVED,
          pending: statsMap.PENDING,
          rejected: statsMap.REJECTED,
          currentBalance: vendor.coinBalance || 0,
        },
        monthlyBreakdown,
        pagination: { total, page, limit, totalPages },
      }, { status: 200 });

    } catch (error) {
      console.error('[RedemptionsController getVendorRedemptionHistory Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/admin/fraud-analysis
   */
  static async getAdminFraudAnalysis(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      // 1. Scan for accounts repeatedly initiating high value redemptions
      const highValueAlerts = await RedemptionRequest.find({
        coinAmount: { $gte: 500 }
      })
        .populate('user', 'firstName lastName email uniqueRedeemCode isFlagged')
        .populate('vendor', 'storeName')
        .sort({ coinAmount: -1 })
        .limit(10);

      // 2. Scan for users with excessive concurrent redemptions in past 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const duplicateSpikeAlerts = await RedemptionRequest.aggregate([
        { $match: { createdAt: { $gte: yesterday } } },
        { $group: { _id: '$user', count: { $sum: 1 }, totalCoins: { $sum: '$coinAmount' } } },
        { $match: { count: { $gte: 5 } } },
        { $sort: { count: -1 } }
      ]);

      const populatedSpikes = [];
      for (const alert of duplicateSpikeAlerts) {
        if (!alert._id) continue;
        const u = await User.findById(alert._id).select('firstName lastName email uniqueRedeemCode isFlagged');
        populatedSpikes.push({
          user: u,
          count: alert.count,
          totalCoins: alert.totalCoins
        });
      }

      // 3. Scan for multiple vendors using the exact same redemption code repeatedly
      const codeUsageAlerts = await RedemptionRequest.aggregate([
        { $group: { _id: { user: '$user', code: '$userUniqueCode' }, vendors: { $addToSet: '$vendor' }, count: { $sum: 1 } } },
        { $project: { user: '$_id.user', code: '$_id.code', vendorCount: { $size: '$vendors' }, count: 1 } },
        { $match: { vendorCount: { $gte: 2 } } },
        { $sort: { vendorCount: -1 } }
      ]);

      const populatedCodeAlerts = [];
      for (const alert of codeUsageAlerts) {
        if (!alert.user) continue;
        const u = await User.findById(alert.user).select('firstName lastName email uniqueRedeemCode isFlagged');
        populatedCodeAlerts.push({
          user: u,
          code: alert.code,
          vendorCount: alert.vendorCount,
          totalRequests: alert.count
        });
      }

      return Response.json({
        success: true,
        alerts: {
          highValueAlerts,
          populatedSpikes,
          populatedCodeAlerts
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[RedemptionsController getAdminFraudAnalysis Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
