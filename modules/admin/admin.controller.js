import { AdminService } from './admin.service.js';
import User from '@/models/user.model.js';
import { generateToken } from '@/utils/jwt.js';
import { dbConnect } from '@/config/database.js';
import { authenticate, authorize } from '@/middleware/auth.middleware.js';
import { createPlan, getPlans } from '@/services/subscription.service.js';
import { listAds, moderateAd, assignSectionToAd, adminDeleteAd } from '@/services/ad.service.js';
import { verifyToken } from '@/utils/jwt.js';

export class AdminController {
  static async requireAdmin(req) {
    await dbConnect();
    const { user, error: authError } = await authenticate(req);
    if (authError) {
      return { error: authError };
    }

    const roleError = authorize(user, ['admin']);
    if (roleError) {
      return { error: roleError };
    }

    return { user };
  }

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
      const { error } = await this.requireAdmin(req);
      if (error) return error;

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
      const { error } = await this.requireAdmin(req);
      if (error) return error;

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
      console.log('[AdminController.createSubscriptionPlan] Body:', body);
      
      const plan = await createPlan(body);
      return Response.json({ success: true, message: 'Plan created successfully', data: plan }, { status: 201 });
    } catch (error) {
      console.error('[AdminController.createSubscriptionPlan Error]', error);
      const status = error.statusCode || 500;
      return Response.json({ success: false, message: error.message || 'Internal server error' }, { status });
    }
  }

  /**
   * Get Subscription Plans (Admin)
   * GET /api/admin/subscription-plans
   */
  static async getSubscriptionPlans(req) {
    try {
      await dbConnect();
      const plans = await getPlans();
      return Response.json({ success: true, data: plans }, { status: 200 });
    } catch (error) {
      console.error('[AdminController.getSubscriptionPlans Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Get Ads (Admin)
   * GET /api/admin/ads
   */
  static async getAds(req) {
    try {
      await dbConnect();
      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status');
      const search = searchParams.get('search');
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 20;

      const query = { all: true }; // show all ads
      if (status) {
        if (status.includes(',')) {
          query.status = { $in: status.split(',') };
        } else {
          query.status = status;
        }
      }
      if (search) {
        query.search = search;
      }

      const result = await listAds(query, page, limit);
      return Response.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
      console.error('[AdminController.getAds Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Assign Section to Ad
   * PATCH /api/admin/ads/[id]/section
   */
  static async updateAdSection(req, { params }) {
    try {
      await dbConnect();
      const { id } = await params;
      const { sectionId } = await req.json();

      if (!id) {
        return Response.json({ success: false, message: 'Ad ID is required' }, { status: 400 });
      }

      const ad = await assignSectionToAd(id, sectionId);
      
      return Response.json({ 
        success: true, 
        message: 'Section assigned successfully',
        data: ad 
      }, { status: 200 });
    } catch (error) {
      const status = error.statusCode || 500;
      return Response.json({ success: false, message: error.message }, { status });
    }
  }

  /**
   * DELETE /api/admin/ads/[id]
   */
  static async deleteAd(req, { params }) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const { id } = await params;
      if (!id) {
        return Response.json({ success: false, message: 'Ad ID is required' }, { status: 400 });
      }

      const result = await adminDeleteAd(id);

      return Response.json({
        success: true,
        message: 'Ad deleted successfully',
        data: {
          adId: result.ad._id,
          status: result.ad.status,
          creditRefunded: result.refund.refunded,
          creditsRefunded: result.refund.creditsRefunded,
        },
        remainingCredits: result.refund.remainingCredits,
        creditSummary: result.refund.creditSummary,
      }, { status: 200 });
    } catch (error) {
      const status = error.statusCode || 500;
      return Response.json({ success: false, message: error.message }, { status });
    }
  }

  /**
   * Approve/Reject Ad
   * PATCH /api/admin/ads/[id]/approve
   */
  static async approveAd(req, { params }) {
    try {
      await dbConnect();
      const resolvedParams = await params;
      const id = resolvedParams.id || resolvedParams.adId;

      if (!id) {
        return Response.json({ success: false, message: 'Ad ID is required' }, { status: 400 });
      }

      const body = await req.json();
      const action = body.action || body.status; // Support both 'action' and 'status' from frontend
      const notes = body.notes || 'Admin moderation';
      const sectionId = body.hasOwnProperty('sectionId') ? body.sectionId : undefined;
      const category = body.hasOwnProperty('category') ? body.category : undefined;

      const authHeader = req.headers.get('authorization');
      let adminId = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = verifyToken(token);
          adminId = decoded.id;
        } catch (e) {
          // ignore
        }
      }

      const ad = await moderateAd(id, action, adminId, notes, sectionId, category);
      
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

  /**
   * Alias for approveAd to support review route
   */
  static async reviewAd(req, context) {
    return this.approveAd(req, context);
  }

  /**
   * Get Admin Dashboard Stats
   * GET /api/admin/dashboard/stats
   */
  static async getDashboardStats(req) {
    try {
      const stats = await AdminService.getDashboardStats();
      return Response.json({ success: true, data: stats }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Get All Users
   * GET /api/admin/users
   */
  static async getUsers(req) {
    try {
      const { searchParams } = new URL(req.url);
      const filters = {
        search: searchParams.get('search'),
        page: searchParams.get('page'),
        limit: searchParams.get('limit')
      };
      
      const result = await AdminService.listUsers(filters);
      return Response.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Get All Payments
   * GET /api/admin/payments
   */
  static async getPayments(req) {
    try {
      const { searchParams } = new URL(req.url);
      const filters = {
        page: searchParams.get('page'),
        limit: searchParams.get('limit')
      };
      
      const result = await AdminService.listPayments(filters);
      return Response.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Get Dashboard Analytics
   * GET /api/admin/dashboard/analytics
   */
  static async getAnalytics(req) {
    try {
      const data = await AdminService.getAnalytics();
      return Response.json({ success: true, data }, { status: 200 });
    } catch (error) {
      console.error('[AdminController.getAnalytics Error]', error);
      return Response.json({ 
        success: false, 
        message: error.message || 'Failed to generate analytics data' 
      }, { status: 500 });
    }
  }

  /**
   * Get Deleted Vendors
   * GET /api/admin/vendors/deleted
   */
  static async getDeletedVendors(req) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const { searchParams } = new URL(req.url);
      const filters = {
        search: searchParams.get('search'),
        page: searchParams.get('page') || 1,
        limit: searchParams.get('limit') || 10
      };
      
      const result = await AdminService.listDeletedVendors(filters);
      return Response.json({ success: true, ...result }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * Restore Deleted Vendor
   * POST /api/admin/vendors/restore
   */
  static async restoreVendor(req) {
    try {
      const { error } = await this.requireAdmin(req);
      if (error) return error;

      const body = await req.json();
      const { vendorId } = body;

      if (!vendorId) {
        return Response.json({ success: false, message: 'Vendor ID is required' }, { status: 400 });
      }

      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
      const deviceInfo = req.headers.get('user-agent') || 'Unknown Device';

      const restoredVendor = await AdminService.restoreVendorAccount(vendorId, ipAddress, deviceInfo);

      return Response.json({
        success: true,
        message: 'Vendor profile restored successfully.',
        data: restoredVendor
      }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
