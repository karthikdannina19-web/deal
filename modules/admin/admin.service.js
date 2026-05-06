import Vendor from '../../models/vendor.model.js';
import User from '../../models/user.model.js';
import Category from '../../models/category.model.js';
import Ad from '../../models/ad.model.js';
import Payment from '../../models/payment.model.js';
import UserSubscription from '../../models/userSubscription.model.js';
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
  static async updateVendorStatus(vendorId, status, reason = '') {
    await dbConnect();
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor not found');

    vendor.status = status;
    vendor.rejectionReason = status === 'rejected' ? String(reason || '').trim() : '';
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

  /**
   * Get Admin Dashboard Statistics
   */
  static async getDashboardStats() {
    await dbConnect();
    
    const [
      totalUsers,
      totalVendors,
      totalAds,
      pendingAds,
      totalRevenueData,
      activeSubscriptions
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Vendor.countDocuments({ status: 'active' }),
      Ad.countDocuments({ status: 'approved' }),
      Ad.countDocuments({ status: 'pending' }),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      UserSubscription.countDocuments({ status: 'active' })
    ]);

    const totalRevenue = totalRevenueData.length > 0 ? totalRevenueData[0].total / 100 : 0; // Convert paise to INR

    return {
      totalUsers,
      totalVendors,
      totalAds,
      pendingAds,
      totalRevenue,
      activeSubscriptions
    };
  }

  /**
   * List all users with filters
   * @param {Object} filters { search, page, limit }
   */
  static async listUsers(filters = {}) {
    await dbConnect();
    const { search, page = 1, limit = 20 } = filters;
    
    const query = { role: 'user' };
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * List all payments with pagination
   * @param {Object} filters { page, limit }
   */
  static async listPayments(filters = {}) {
    await dbConnect();
    const { page = 1, limit = 20 } = filters;
    
    const total = await Payment.countDocuments();
    const payments = await Payment.find()
      .populate('vendorId', 'storeName fullName')
      .populate('planId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      payments,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }
}
