import { ReferralsService } from './referrals.service.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { dbConnect } from '../../config/database.js';
import ReferralSetting from '../../models/referralSetting.model.js';
import Referral from '../../models/referral.model.js';
import User from '../../models/user.model.js';

/**
 * Referrals Controller
 * Route handlers for referral generation, mapping, settings updates, and stats
 */
export class ReferralsController {
  /**
   * POST /api/referral/generate-link
   */
  static async generateLink(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const result = await ReferralsService.generateLink(user.id);
      return Response.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
      console.error('[ReferralsController generateLink Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/referral/history
   */
  static async getHistory(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const referrals = await ReferralsService.getHistory(user.id);
      return Response.json({ success: true, referrals }, { status: 200 });
    } catch (error) {
      console.error('[ReferralsController getHistory Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/referral/tree
   */
  static async getTree(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const tree = await ReferralsService.getTree(user.id);
      return Response.json({ success: true, tree }, { status: 200 });
    } catch (error) {
      console.error('[ReferralsController getTree Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  // ==========================================
  //               ADMIN ENDPOINTS
  // ==========================================

  /**
   * GET /api/admin/referrals
   */
  static async getAdminReferrals(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || '';
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '10', 10);

      const skip = (page - 1) * limit;

      let matchQuery = {};
      if (search) {
        const users = await User.find({
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }).select('_id');
        const userIds = users.map(u => u._id);
        matchQuery = {
          $or: [
            { referrer: { $in: userIds } },
            { referred: { $in: userIds } }
          ]
        };
      }

      const total = await Referral.countDocuments(matchQuery);
      const referrals = await Referral.find(matchQuery)
        .populate('referrer', 'firstName lastName email referralCode')
        .populate('referred', 'firstName lastName email referralCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalPages = Math.ceil(total / limit);

      // Fetch global setting for display
      let settings = await ReferralSetting.findOne();
      if (!settings) {
        settings = new ReferralSetting();
        await settings.save();
      }

      return Response.json({
        success: true,
        referrals,
        settings,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[ReferralsController getAdminReferrals Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/admin/referral-tree
   */
  static async getAdminReferralTree(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      // Group referrals to find high referrers
      const topReferrers = await Referral.aggregate([
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const trees = [];
      for (const ref of topReferrers) {
        if (!ref._id) continue;
        try {
          const tree = await ReferralsService.getTree(ref._id);
          trees.push(tree);
        } catch (err) {
          console.error(`Failed to generate tree for referrer ${ref._id}:`, err.message);
        }
      }

      return Response.json({ success: true, trees }, { status: 200 });
    } catch (error) {
      console.error('[ReferralsController getAdminReferralTree Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * POST /api/admin/referral/settings
   */
  static async saveAdminSettings(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['admin']);
      if (roleError) return roleError;

      const body = await req.json();
      const { coinsPerReferral, coinsForReferrer, coinsForReferred, dailyReferralLimit, maxReferralLimit, activationCondition, expiryDays } = body;

      let settings = await ReferralSetting.findOne();
      if (!settings) {
        settings = new ReferralSetting();
      }

      // Support both new explicit fields and legacy alias
      if (coinsForReferrer !== undefined) settings.coinsForReferrer = coinsForReferrer;
      if (coinsForReferred !== undefined) settings.coinsForReferred = coinsForReferred;
      if (coinsPerReferral !== undefined) {
        settings.coinsPerReferral = coinsPerReferral;
        // keep coinsForReferrer in sync for legacy callers
        settings.coinsForReferrer = coinsPerReferral;
      }
      if (dailyReferralLimit !== undefined) settings.dailyReferralLimit = dailyReferralLimit;
      if (maxReferralLimit !== undefined) settings.maxReferralLimit = maxReferralLimit;
      if (activationCondition !== undefined) settings.activationCondition = activationCondition;
      if (expiryDays !== undefined) settings.expiryDays = expiryDays;

      await settings.save();

      return Response.json({ success: true, message: 'Settings saved successfully', settings }, { status: 200 });
    } catch (error) {
      console.error('[ReferralsController saveAdminSettings Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
