import { AdminService } from './admin.service.js';
import User from '../../models/user.model.js';
import { generateToken } from '../../utils/jwt.js';
import { dbConnect } from '../../config/database.js';

export class AdminController {
  /**
   * Admin Login
   * POST /api/admin/login
   */
  static async login(req) {
    try {
      await dbConnect();
      const body = await req.json();
      const { email, password } = body;

      if (!email || !password) {
        return Response.json({ success: false, message: 'Email and password are required' }, { status: 400 });
      }

      // Find user with password
      const user = await User.findOne({ email }).select('+password');
      if (!user || user.role !== 'admin') {
        return Response.json({ success: false, message: 'Invalid admin credentials' }, { status: 401 });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return Response.json({ success: false, message: 'Invalid admin credentials' }, { status: 401 });
      }

      // Generate Token
      const token = generateToken({ 
        id: user._id, 
        role: user.role,
        email: user.email 
      });

      return Response.json({
        success: true,
        message: 'Admin logged in successfully',
        token,
        admin: {
          id: user._id,
          fullName: user.fullName,
          email: user.email
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[AdminController.login Error]', error);
      return Response.json({ success: false, message: 'Internal server error' }, { status: 500 });
    }
  }

  /**
   * List Vendors with filters
   * GET /api/admin/vendors
   */
  static async getVendors(req) {
    try {
      const { searchParams } = new URL(req.url);
      const filters = {
        status: searchParams.get('status'),
        search: searchParams.get('search'),
        page: searchParams.get('page'),
        limit: searchParams.get('limit')
      };
      
      const result = await AdminService.listVendors(filters);
      return Response.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Update Vendor Status (Approve/Reject)
   * PATCH /api/admin/vendors/[id]
   */
  static async updateVendorStatus(req, { params }) {
    try {
      const { id } = await params;
      const body = await req.json();
      const { status, reason } = body; // 'active' or 'rejected'

      if (!['active', 'rejected', 'suspended'].includes(status)) {
        return Response.json({ success: false, message: 'Invalid status' }, { status: 400 });
      }

      const vendor = await AdminService.updateVendorStatus(id, status, reason);
      return Response.json({ 
        success: true, 
        message: `Vendor ${status === 'active' ? 'approved' : status} successfully`,
        data: vendor 
      }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Create Subscription Plan (Admin)
   * POST /api/admin/subscription-plans
   */
  static async createSubscriptionPlan(req) {
    try {
      await dbConnect();
      const body = await req.json();
      const { createPlan } = await import('../../services/subscription.service.js');
      const plan = await createPlan(body);
      return Response.json({ success: true, message: 'Plan created successfully', data: plan }, { status: 201 });
    } catch (error) {
      const status = error.statusCode || 500;
      return Response.json({ success: false, message: error.message }, { status });
    }
  }

  /**
   * Get Subscription Plans (Admin)
   * GET /api/admin/subscription-plans
   */
  static async getSubscriptionPlans(req) {
    try {
      await dbConnect();
      const { getPlans } = await import('../../services/subscription.service.js');
      const plans = await getPlans();
      return Response.json({ success: true, data: plans }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Get Pending Ads
   * GET /api/admin/ads
   */
  static async getPendingAds(req) {
    try {
      await dbConnect();
      const { listAds } = await import('../../services/ad.service.js');
      
      const { searchParams } = new URL(req.url);
      const page = searchParams.get('page') || 1;
      const limit = searchParams.get('limit') || 20;

      // Filter for pending ads
      const result = await listAds({ status: 'pending' }, page, limit);
      return Response.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Approve/Reject Ad
   * PATCH /api/admin/ads/[id]/approve
   */
  static async approveAd(req, { params }) {
    try {
      await dbConnect();
      const { id } = await params;
      const body = await req.json();
      const { action, notes } = body; // 'approve' or 'reject'

      // We need adminId. The token should ideally be parsed.
      // For now, we can extract from authorization header if needed, 
      // or we just pass a default admin id if auth middleware isn't perfectly injecting it here.
      // Let's assume auth middleware provides it if we use it, or we decode the token.
      import { verifyToken } from '../../utils/jwt.js';
      const authHeader = req.headers.get('authorization');
      let adminId = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = (await import('../../utils/jwt.js')).verifyToken(token);
          adminId = decoded.id;
        } catch (e) {
          // ignore
        }
      }

      const { moderateAd } = await import('../../services/ad.service.js');
      const ad = await moderateAd(id, action, adminId, notes);
      
      return Response.json({ 
        success: true, 
        message: `Ad ${action}d successfully`,
        data: ad 
      }, { status: 200 });
    } catch (error) {
      const status = error.statusCode || 500;
      return Response.json({ success: false, message: error.message }, { status });
    }
  }
}
