import Vendor from '../../models/vendor.model.js';
import User from '../../models/user.model.js';
import Category from '../../models/category.model.js';
import { dbConnect } from '../../config/database.js';

export class AdminService {
  /**
   * List all vendors with filters
   * @param {Object} filters { status, search, page, limit }
   */
  static async listVendors(filters = {}) {
    await dbConnect();
    const { status, search, page = 1, limit = 10 } = filters;
    
    const query = {};
    
    // Status Filter
    if (status && status !== 'all' && status !== 'undefined') {
      // Map 'pending' from frontend to 'pending_approval' in DB
      query.status = status === 'pending' ? 'pending_approval' : status;
    }

    // Search Filter (Store Name or Owner Name or Email)
    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .populate('userId', 'fullName email phone')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      vendors,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Update Vendor Status (Approve/Reject)
   * @param {string} vendorId 
   * @param {string} status 'active' or 'rejected'
   */
  static async updateVendorStatus(vendorId, status) {
    await dbConnect();
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor not found');

    vendor.status = status;
    await vendor.save();

    // If approved, update the associated user's role to 'vendor'
    if (status === 'active') {
      await User.findByIdAndUpdate(vendor.userId, { 
        role: 'vendor',
        status: 'active' 
      });
    }

    return vendor;
  }

  /**
   * Get Vendor Detail for Review
   * @param {string} vendorId 
   */
  static async getVendorDetail(vendorId) {
    await dbConnect();
    return await Vendor.findById(vendorId)
      .populate('userId', 'fullName email phone')
      .populate('categoryId', 'name');
  }
}
