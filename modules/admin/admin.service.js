import User from '../../models/user.model.js';
import Vendor from '../../models/vendor.model.js';
import Ad from '../../models/ad.model.js';
import Payment from '../../models/payment.model.js';
import CoinTransaction from '../../models/coinTransaction.model.js';
import Store from '../../models/store.model.js';
import { compareHash } from '../../utils/hash.js';
import { generateToken } from '../../utils/jwt.js';

/**
 * Admin Service
 * Handles core system-wide management and statistics retrieval
 */
export class AdminService {
  /**
   * Fetch real-time dashboard statistics and metrics
   * @returns {Object} Dashboard metrics
   */
  static async getDashboardStats() {
    // We use Promise.all to fetch all metrics concurrently for optimal performance
    const [
      totalUsers,
      totalVendors,
      activeVendors,
      activeAds,
      revenueResult,
      coinsResult
    ] = await Promise.all([
      // 1. Core Counts
      User.countDocuments({ role: 'user' }),
      Vendor.countDocuments(),
      Vendor.countDocuments({ status: 'active' }),
      Ad.countDocuments({ status: 'approved' }),

      // 2. Revenue Calculation (Sum of all paid transactions)
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // 3. Coin Circulation Tracking (Aggregated from both Users and Vendors)
      Promise.all([
        User.aggregate([{ $group: { _id: null, total: { $sum: '$coinBalance' } } }]),
        Vendor.aggregate([{ $group: { _id: null, total: { $sum: '$coinBalance' } } }])
      ])
    ]);

    // Format Revenue (Paise to INR)
    const totalRevenuePaise = revenueResult[0]?.total || 0;
    const totalRevenue = totalRevenuePaise / 100;

    // Sum Coins Circulation
    const userCoins = coinsResult[0][0]?.total || 0;
    const vendorCoins = coinsResult[1][0]?.total || 0;
    const totalCoins = userCoins + vendorCoins;

    return {
      totalUsers,
      totalVendors,
      activeVendors,
      activeAds,
      totalRevenue,
      totalCoins
    };
  }

  /**
   * Fetch vendors with dynamic filtering and pagination
   * @param {Object} options - { status, search, page, limit }
   */
  static async getVendors({ status, search, page = 1, limit = 10 }) {
    const query = {};

    // 1. Status Filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // 2. Search Logic (Fuzzy search by storeName or owner name)
    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .populate('userId', 'firstName lastName email mobileNumber')
        .populate('categoryId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Vendor.countDocuments(query)
    ]);

    return {
      vendors,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update vendor status (Approve, Reject, Suspend, Activate)
   * @param {string} vendorId 
   * @param {string} status - 'active', 'rejected', or 'suspended'
   */
  static async updateVendorStatus(vendorId, status) {
    if (!['active', 'rejected', 'suspended'].includes(status)) {
      throw new Error('Invalid status update action');
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { status },
      { new: true, runValidators: true }
    );

    if (!vendor) {
      throw new Error('Vendor profile not found');
    }

    // Log the action
    try {
      const AuditLog = (await import('../../models/auditLog.model.js')).default;
      await new AuditLog({
        action: `VENDOR_STATUS_UPDATE_${status.toUpperCase()}`,
        userId: null, // Ideally the admin's ID
        role: 'admin',
        entityId: vendor._id,
        entityType: 'vendor',
        actionType: 'update',
        severity: 'medium',
        metadata: { newStatus: status }
      }).save();
    } catch (logError) {
      console.warn('[AuditLog Error] Failed to log vendor status change', logError.message);
    }

    return vendor;
  }

  /**
   * Fetch all users with search and pagination
   */
  static async getUsers({ search, page = 1, limit = 10 }) {
    const query = { role: 'user' };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    return {
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Review an Ad (Approve/Reject)
   */
  static async reviewAd(adminId, adId, action, reason) {
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const ad = await Ad.findByIdAndUpdate(
      adId,
      { 
        status,
        rejectionReason: action === 'reject' ? reason : undefined,
        reviewedAt: new Date(),
        reviewedBy: adminId
      },
      { new: true }
    );

    if (!ad) throw new Error('Ad not found');

    return ad;
  }

  /**
   * Fetch all ads with status filtering
   */
  static async getAds({ status, page = 1, limit = 20 }) {
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [ads, total] = await Promise.all([
      Ad.find(query)
        .populate('vendorId', 'storeName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Ad.countDocuments(query)
    ]);

    return {
      ads,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Fetch all platform payments
   */
  static async getPayments({ page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find()
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments()
    ]);

    return {
      payments,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Fetch coin economy transactions
   */
  static async getCoinTransactions({ page = 1, limit = 20 }) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      CoinTransaction.find()
        .populate('vendorId', 'storeName')
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CoinTransaction.countDocuments()
    ]);

    // Format for easier UI consumption
    const formatted = transactions.map(tx => ({
      _id: tx._id,
      type: 'transfer',
      senderName: tx.userId?.firstName + ' ' + tx.userId?.lastName,
      receiverName: tx.vendorId?.storeName,
      coins: tx.coins,
      status: tx.status,
      createdAt: tx.createdAt
    }));

    return {
      transactions: formatted,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Admin Login via Email and Password
   * @param {string} email 
   * @param {string} password 
   */
  static async loginAdmin(email, password) {
    // 1. Find User by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // 2. Verify Role
    if (user.role !== 'admin') {
      throw new Error('Access denied. Not an admin.');
    }

    // 3. Compare Password
    const isMatch = await compareHash(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    // 4. Generate Token
    const token = generateToken({
      userId: user._id.toString(),
      role: 'admin',
      email: user.email
    });

    return {
      success: true,
      message: 'Admin login successful',
      token,
      admin: {
        adminId: user._id.toString(),
        role: user.role
      }
    };
  }

  /**
   * Fetch all stores with status filtering
   * @param {Object} options - { status, page, limit }
   */
  static async getStores({ status, page = 1, limit = 20 }) {
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('vendorId', 'storeName mobileNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(query)
    ]);

    return {
      stores,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Review a Store (Approve/Reject)
   * Approving a store also activates the associated vendor
   * @param {string} storeId 
   * @param {string} action - 'approve' or 'reject'
   */
  static async reviewStore(storeId, action) {
    const status = action === 'approve' ? 'active' : 'rejected';

    // 1. Find and update store
    const store = await Store.findByIdAndUpdate(
      storeId,
      { status },
      { new: true }
    );

    if (!store) {
      throw new Error('Store not found');
    }

    // 2. If approved, also activate the associated vendor
    if (action === 'approve') {
      await Vendor.findByIdAndUpdate(
        store.vendorId,
        { status: 'active' }
      );
    }

    return store;
  }

  /**
   * Review an Offer (Approve/Reject)
   * @param {string} offerId 
   * @param {string} action - 'approve' or 'reject'
   */
  static async reviewOffer(offerId, action) {
    const status = action === 'approve' ? 'approved' : 'rejected';

    const offer = await Ad.findByIdAndUpdate(
      offerId,
      { status },
      { new: true }
    );

    if (!offer) {
      throw new Error('Offer not found');
    }

    return offer;
  }
}
