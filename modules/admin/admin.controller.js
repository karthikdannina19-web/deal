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
      const { id } = params;
      const body = await req.json();
      const { status } = body; // 'active' or 'rejected'

      if (!['active', 'rejected', 'suspended'].includes(status)) {
        return Response.json({ success: false, message: 'Invalid status' }, { status: 400 });
      }

      const vendor = await AdminService.updateVendorStatus(id, status);
      return Response.json({ 
        success: true, 
        message: `Vendor ${status === 'active' ? 'approved' : status} successfully`,
        data: vendor 
      }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
