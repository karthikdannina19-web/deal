import Vendor from '@/models/vendor.model.js';
import User from '@/models/user.model.js';
import Ad from '@/models/ad.model.js';
import '@/models/category.model.js';
import UserSubscription from '@/models/userSubscription.model.js';
import WalletTransaction from '@/models/walletTransaction.model.js';
import VendorTransaction from '@/models/vendorTransaction.model.js';
import VendorAccountLog from '@/models/vendorAccountLog.model.js';
import { dbConnect } from '@/config/database.js';
import { LocationMasterService } from '@/services/location-master.service.js';
import { VisibilityService } from '@/services/visibility.service.js';
import { PriorityService } from '@/services/priority.service.js';
import mongoose from 'mongoose';

export class AdminService {
  static cleanSoftDeletedSuffix(value) {
    if (!value) return value;
    let cleaned = String(value);
    if (cleaned.includes('+del_')) {
      const parts = cleaned.split('+del_');
      if (parts.length === 2) {
        const domain = parts[1].split('@')[1];
        return `${parts[0]}@${domain}`;
      }
    }
    return cleaned.split('_del_')[0];
  }

  static escapeSpreadsheet(value = '') {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  static buildVendorListQuery(filters = {}) {
    const status = filters.status;
    const search = filters.search;
    const visibilityLevel = filters.visibilityLevel;

    const query = {
      is_deleted: { $ne: true },
      account_status: { $ne: 'DELETED' },
      deletedAt: null,
    };

    if (status && status !== 'all' && status !== 'undefined') {
      query.status = status === 'pending' ? 'pending_approval' : status;
    }

    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (visibilityLevel) {
      query.visibilityLevel = visibilityLevel;
    }

    return query;
  }

  static async hydrateVendorList(rawVendors = []) {
    return Promise.all(rawVendors.map(async (v) => {
      const activeSub = await UserSubscription.findOne({
        $or: [
          { vendor: v._id },
          { user: v.userId?._id || v.userId }
        ],
        status: { $in: ['active', 'trial'] },
        endDate: { $gte: new Date() }
      }).select('creditsRemaining creditsAllocated').sort({ createdAt: -1 }).lean();

      const cleanedUser = v.userId ? {
        ...v.userId,
        email: this.cleanSoftDeletedSuffix(v.userId.email),
        phone: this.cleanSoftDeletedSuffix(v.userId.phone)
      } : null;

      return {
        ...v,
        email: this.cleanSoftDeletedSuffix(v.email),
        mobileNumber: this.cleanSoftDeletedSuffix(v.mobileNumber),
        slug: this.cleanSoftDeletedSuffix(v.slug),
        userId: cleanedUser,
        creditsRemaining: activeSub?.creditsRemaining || 0,
        creditsAllocated: activeSub?.creditsAllocated || 0
      };
    }));
  }

  /**
   * List all vendors with filters
   * @param {Object} filters { status, search, page, limit }
   */
  static async listVendors(filters = {}) {
    await dbConnect();
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '10', 10);
    const query = this.buildVendorListQuery(filters);

    const total = await Vendor.countDocuments(query);
    const rawVendors = await Vendor.find(query)
      .populate('userId', 'fullName email phone')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const vendors = await this.hydrateVendorList(rawVendors);

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
  static async updateVendorStatus(vendorId, status, reason = '', visibilityLevel = null, priorityConfig = null) {
    await dbConnect();
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor not found');

    if (status === 'active') {
      if (!vendor.location?.state || !vendor.location?.district || !vendor.location?.mandal) {
        throw new Error('Vendor store location is incomplete');
      }

      await LocationMasterService.syncLegacyLocation(vendor);

      const visibility = visibilityLevel
        ? VisibilityService.deriveFromStore(vendor, visibilityLevel)
        : VisibilityService.normalizeVisibilityPayload();

      vendor.visibilityLevel = visibility.visibilityLevel;
      vendor.visibilityStateId = visibility.visibilityStateId;
      vendor.visibilityDistrictId = visibility.visibilityDistrictId;
      vendor.visibilityMandalId = visibility.visibilityMandalId;
      vendor.visibilityEnabled = visibility.visibilityEnabled;

      if (priorityConfig?.priority) {
        await PriorityService.upsertRule({
          entityType: 'vendor',
          entityId: vendor._id,
          scopeLevel: priorityConfig.scopeLevel || visibility.visibilityLevel || 'global',
          stateId: priorityConfig.stateId ?? visibility.visibilityStateId ?? null,
          districtId: priorityConfig.districtId ?? visibility.visibilityDistrictId ?? null,
          mandalId: priorityConfig.mandalId ?? visibility.visibilityMandalId ?? null,
          priority: priorityConfig.priority,
        });
      }
    }

    vendor.status = status;
    vendor.rejectionReason = status === 'rejected' ? String(reason || '').trim() : '';
    
    if (status === 'active') {
      vendor.approvalStatus = 'approved';
      vendor.approvedAt = new Date();
    } else if (status === 'rejected') {
      vendor.approvalStatus = 'rejected';
    }

    await vendor.save();

    // Keep linked user state aligned with the vendor lifecycle
    if (status === 'active') {
      await User.findByIdAndUpdate(vendor.userId, { 
        role: 'vendor',
        status: 'active' 
      });
      
      if (vendor.supervisorId) {
        const Supervisor = (await import('../../models/supervisor.model.js')).default;
        await Supervisor.findByIdAndUpdate(
          vendor.supervisorId,
          { $inc: { totalVendors: 1 } }
        );
      }
    } else if (status === 'suspended') {
      await User.findByIdAndUpdate(vendor.userId, {
        status: 'suspended'
      });
    }

    return vendor;
  }

  static async exportVendorAudit(filters = {}) {
    await dbConnect();
    const isDeletedExport = filters.status === 'deleted';
    const vendors = isDeletedExport
      ? (await this.listDeletedVendors({ ...filters, page: 1, limit: 5000 })).vendors
      : await (async () => {
          const query = this.buildVendorListQuery(filters);
          const rawVendors = await Vendor.find(query)
            .populate('userId', 'fullName email phone')
            .populate('categoryId', 'name')
            .sort({ createdAt: -1 })
            .lean();
          return this.hydrateVendorList(rawVendors);
        })();

    const header = [
      'Vendor ID',
      'Store Name',
      'Owner Name',
      'Vendor Email',
      'Vendor Phone',
      'User Email',
      'User Phone',
      'Category',
      'Status',
      'Approval Status',
      'Visibility Level',
      'Credits Remaining',
      'Credits Allocated',
      'Coin Balance',
      'Deleted Flag',
      'Deleted Reason',
      'Deleted At',
      'State',
      'District',
      'Mandal',
      'Full Address',
      'Created At',
      'Approved At'
    ];

    const rows = vendors.map((vendor) => ([
      vendor._id?.toString() || '',
      vendor.storeName || '',
      vendor.fullName || '',
      vendor.email || '',
      vendor.mobileNumber || '',
      vendor.userId?.email || '',
      vendor.userId?.phone || '',
      vendor.categoryId?.name || '',
      vendor.status || '',
      vendor.approvalStatus || '',
      vendor.visibilityLevel || '',
      String(vendor.creditsRemaining || 0),
      String(vendor.creditsAllocated || 0),
      String(vendor.coinBalance || 0),
      vendor.is_deleted === true || vendor.status === 'deleted' ? 'Yes' : 'No',
      vendor.deletedReason || vendor.deleted_reason || '',
      vendor.deletedAt ? new Date(vendor.deletedAt).toISOString() : '',
      vendor.location?.state || '',
      vendor.location?.district || '',
      vendor.location?.mandal || '',
      vendor.fullAddress || '',
      vendor.createdAt ? new Date(vendor.createdAt).toISOString() : '',
      vendor.approvedAt ? new Date(vendor.approvedAt).toISOString() : ''
    ]));

    const worksheetRows = [header, ...rows].map((cells, rowIndex) => {
      const cellNodes = cells.map((cell) => {
        const type = rowIndex === 0 ? 'String' : (/^-?\d+(\.\d+)?$/.test(cell) ? 'Number' : 'String');
        return `<Cell><Data ss:Type="${type}">${this.escapeSpreadsheet(cell)}</Data></Cell>`;
      }).join('');

      return `<Row>${cellNodes}</Row>`;
    }).join('');

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Vendor Audit">
    <Table>
      ${worksheetRows}
    </Table>
  </Worksheet>
</Workbook>`;

    return {
      fileName: `vendor-audit-${new Date().toISOString().slice(0, 10)}.xls`,
      content: xml
    };
  }

  static async updateVendorVisibility(vendorId, {
    visibilityLevel,
    visibilityEnabled = true,
    priority = null,
    priorityScopeLevel = null,
  }) {
    await dbConnect();

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor not found');

    if (!vendor.location?.state || !vendor.location?.district || !vendor.location?.mandal) {
      throw new Error('Vendor store location is incomplete');
    }

    await LocationMasterService.syncLegacyLocation(vendor);

    const visibility = visibilityLevel
      ? VisibilityService.deriveFromStore(vendor, visibilityLevel)
      : VisibilityService.normalizeVisibilityPayload({ visibilityEnabled });

    vendor.visibilityLevel = visibility.visibilityLevel;
    vendor.visibilityStateId = visibility.visibilityStateId;
    vendor.visibilityDistrictId = visibility.visibilityDistrictId;
    vendor.visibilityMandalId = visibility.visibilityMandalId;
    vendor.visibilityEnabled = visibility.visibilityEnabled;
    await vendor.save();

    if (priority) {
      await PriorityService.upsertRule({
        entityType: 'vendor',
        entityId: vendor._id,
        scopeLevel: priorityScopeLevel || vendor.visibilityLevel || 'global',
        stateId: vendor.visibilityStateId,
        districtId: vendor.visibilityDistrictId,
        mandalId: vendor.visibilityMandalId,
        priority,
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
    const vendor = await Vendor.findById(vendorId)
      .populate('userId', 'fullName email phone')
      .populate('categoryId', 'name')
      .lean();

    if (!vendor) return null;

    const cleanDel = (val) => {
      if (!val) return val;
      return String(val).split('_del_')[0];
    };

    if (vendor.userId) {
      vendor.userId.email = cleanDel(vendor.userId.email);
      vendor.userId.phone = cleanDel(vendor.userId.phone);
    }

    vendor.email = cleanDel(vendor.email);
    vendor.mobileNumber = cleanDel(vendor.mobileNumber);
    vendor.slug = cleanDel(vendor.slug);

    return vendor;
  }

  /**
   * Get Admin Dashboard Statistics
   */
  static async getDashboardStats() {
    await dbConnect();
    
    const [
      totalUsers,
      totalVendors,
      activeAds,
      pendingAds,
      revenueData,
      activeSubscriptions,
      coinData,
      totalSupervisors,
      activeSupervisors
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Vendor.countDocuments({ status: 'active' }),
      Ad.countDocuments({ status: 'approved' }),
      Ad.countDocuments({ status: 'pending' }),
      UserSubscription.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ]),
      UserSubscription.countDocuments({ status: 'active' }),
      Vendor.aggregate([
        { $group: { _id: null, total: { $sum: '$coinBalance' } } }
      ]),
      (async () => {
        const Supervisor = (await import('../../models/supervisor.model.js')).default;
        return Supervisor.countDocuments({ is_deleted: false });
      })(),
      (async () => {
        const Supervisor = (await import('../../models/supervisor.model.js')).default;
        return Supervisor.countDocuments({ is_deleted: false, status: 'active' });
      })()
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
    const totalCoins = coinData.length > 0 ? coinData[0].total : 0;

    return {
      totalUsers,
      totalVendors,
      activeAds,
      pendingAds,
      totalRevenue,
      totalCoins,
      activeSubscriptions,
      totalSupervisors,
      activeSupervisors
    };
  }

  /**
   * Get Analytics trends for charts (Last 7 days)
   * Optimized with parallel queries and robust date handling
   */
  static async getAnalytics() {
    try {
      await dbConnect();
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0); // Start of the day 7 days ago

      // Run aggregations in parallel to minimize latency
      const [revenueTrends, userTrends] = await Promise.all([
        // 1. Revenue Trends
        UserSubscription.aggregate([
          { 
            $match: { 
              paymentStatus: 'completed',
              createdAt: { $gte: sevenDaysAgo }
            } 
          },
          {
            $group: {
              _id: { 
                $dateToString: { 
                  format: "%Y-%m-%d", 
                  date: { $ifNull: ["$createdAt", new Date()] } 
                } 
              },
              revenue: { $sum: "$finalAmount" }
            }
          },
          { $sort: { _id: 1 } }
        ]),

        // 2. User Growth Trends
        User.aggregate([
          { 
            $match: { 
              role: 'user',
              createdAt: { $gte: sevenDaysAgo }
            } 
          },
          {
            $group: {
              _id: { 
                $dateToString: { 
                  format: "%Y-%m-%d", 
                  date: { $ifNull: ["$createdAt", new Date()] } 
                } 
              },
              users: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ])
      ]);

      // Format for frontend (merge by date)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const results = [];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = days[d.getDay()];
        
        const revEntry = revenueTrends.find(r => r._id === dateStr);
        const userEntry = userTrends.find(u => u._id === dateStr);
        
        results.push({
          name: dayName,
          date: dateStr,
          revenue: revEntry ? revEntry.revenue : 0,
          users: userEntry ? userEntry.users : 0
        });
      }

      return results;
    } catch (error) {
      console.error('[AdminService.getAnalytics Error]', error);
      throw error;
    }
  }

  /**
   * List all users with filters
   * @param {Object} filters { search, page, limit, stateId, districtId, mandalId }
   */
  static async listUsers(filters = {}) {
    await dbConnect();
    const {
      search,
      page = 1,
      limit = 20,
      stateId,
      districtId,
      mandalId,
    } = filters;
    
    const query = { role: 'user' };

    if (districtId && !stateId) {
      throw new Error('State is required when filtering by district');
    }

    if (mandalId && !districtId) {
      throw new Error('District is required when filtering by mandal');
    }

    for (const [label, value] of [
      ['stateId', stateId],
      ['districtId', districtId],
      ['mandalId', mandalId],
    ]) {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${label}`);
      }
    }

    if (stateId || districtId || mandalId) {
      await LocationMasterService.validateHierarchy({ stateId, districtId, mandalId });
    }

    if (mandalId) {
      query.mandalId = mandalId;
    } else if (districtId) {
      query.districtId = districtId;
    } else if (stateId) {
      query.stateId = stateId;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
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
    
    const total = await UserSubscription.countDocuments({ paymentStatus: 'completed' });
    const rawSubscriptions = await UserSubscription.find({ paymentStatus: 'completed' })
      .populate('user', 'fullName email phone')
      .populate('vendor', 'storeName fullName email phone logo')
      .populate('plan', 'name price durationDays creditsIncluded')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Map to the format expected by the frontend payments table
    const payments = await Promise.all(rawSubscriptions.map(async (sub) => {
      // If vendor field is missing, try to find vendor by user ID
      let vendor = sub.vendor;
      if (!vendor && sub.user) {
        vendor = await Vendor.findOne({ userId: sub.user._id }).select('storeName fullName email phone logo').lean();
      }

      return {
        _id: sub._id,
        vendorId: vendor || {
          fullName: sub.user?.fullName || 'Unknown User',
          email: sub.user?.email,
          phone: sub.user?.phone
        },
        planId: {
          name: sub.planSnapshot?.name || sub.plan?.name,
          price: sub.planSnapshot?.price || sub.plan?.price,
          validityDays: sub.planSnapshot?.durationDays || sub.plan?.durationDays,
          credits: sub.planSnapshot?.creditsIncluded || sub.plan?.creditsIncluded
        },
        razorpayOrderId: sub.razorpayOrderId,
        razorpayPaymentId: sub.razorpayPaymentId,
        amount: sub.finalAmount * 100, // Frontend expects paise
        status: sub.paymentStatus === 'completed' ? 'paid' : sub.paymentStatus,
        createdAt: sub.createdAt
      };
    }));

    return {
      payments,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * List all soft-deleted vendors
   * @param {Object} filters { search, page, limit }
   */
  static async listDeletedVendors(filters = {}) {
    await dbConnect();
    const { search, page = 1, limit = 10 } = filters;
    
    const query = { is_deleted: true };
    
    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const total = await Vendor.countDocuments(query);
    const rawVendors = await Vendor.find(query)
      .populate('userId', 'fullName email phone lastLoginAt createdAt')
      .populate('categoryId', 'name')
      .sort({ deletedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
      
    const cleanDel = (val) => {
      if (!val) return val;
      let cleaned = String(val);
      if (cleaned.includes('+del_')) {
        const parts = cleaned.split('+del_');
        if (parts.length === 2) {
          const domain = parts[1].split('@')[1];
          return `${parts[0]}@${domain}`;
        }
      }
      return cleaned.split('_del_')[0];
    };
    
    
    const vendors = await Promise.all(rawVendors.map(async (v) => {
      const walletTxCount = await WalletTransaction.countDocuments({ user: v.userId?._id || v.userId });
      const vendorTxCount = await VendorTransaction.countDocuments({ vendor: v._id });
      const approvedRedemptions = await VendorTransaction.aggregate([
        { $match: { vendor: v._id, type: 'credit' } },
        { $group: { _id: null, totalCredits: { $sum: '$amount' }, totalRedemptions: { $sum: 1 } } }
      ]);
      const latestDeletionLog = await VendorAccountLog.findOne({
        vendor_id: v._id,
        action_type: 'DELETED',
      }).sort({ timestamp: -1 }).lean();
      const totalTransactions = walletTxCount + vendorTxCount;
      
      const cleanedUser = v.userId ? {
        ...v.userId,
        email: cleanDel(v.userId.email),
        phone: cleanDel(v.userId.phone)
      } : null;
      
      return {
        ...v,
        email: cleanDel(v.email),
        mobileNumber: cleanDel(v.mobileNumber),
        slug: cleanDel(v.slug),
        userId: cleanedUser,
        totalTransactions,
        totalRedemptions: approvedRedemptions[0]?.totalRedemptions || 0,
        totalRedeemedCoins: approvedRedemptions[0]?.totalCredits || 0,
        walletBalanceBeforeDelete: v.coinBalance || 0,
        deletedReason: v.deletionReason || v.deleted_reason || latestDeletionLog?.reason || '',
        deletedAt: v.deletedAt || latestDeletionLog?.timestamp || null,
      };
    }));
    
    return {
      vendors,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Restore a soft-deleted vendor profile
   * @param {string} vendorId 
   */
  static async restoreVendorAccount(vendorId, ipAddress = '', deviceInfo = '') {
    await dbConnect();
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor profile not found');
    if (!vendor.is_deleted) throw new Error('Vendor is not deleted.');
    
    const cleanDel = (val) => {
      if (!val) return val;
      let cleaned = String(val);
      if (cleaned.includes('+del_')) {
        const parts = cleaned.split('+del_');
        if (parts.length === 2) {
          const domain = parts[1].split('@')[1];
          return `${parts[0]}@${domain}`;
        }
      }
      return cleaned.split('_del_')[0];
    };
    
    const rawEmail = cleanDel(vendor.email);
    const rawMobile = cleanDel(vendor.mobileNumber);
    const rawSlug = cleanDel(vendor.slug);
    
    // 1. Conflict Check: active Vendor
    const activeVendorConflict = await Vendor.findOne({
      mobileNumber: rawMobile,
      is_deleted: false
    });
    if (activeVendorConflict) {
      throw new Error('Cannot restore vendor. The mobile number is already in use by another active vendor account.');
    }
    
    // 2. Conflict Check: active User
    const activeUserConflict = await User.findOne({
      phone: rawMobile,
      status: { $ne: 'deleted' }
    });
    if (activeUserConflict) {
      throw new Error('Cannot restore vendor. The associated user phone is already in use by another active account.');
    }
    
    const oldStatus = vendor.account_status || 'DELETED';
    
    // 3. Restore Vendor details
    await Vendor.updateOne(
      { _id: vendorId },
      {
        $set: {
          email: rawEmail,
          mobileNumber: rawMobile,
          slug: rawSlug || undefined,
          is_deleted: false,
          account_status: 'ACTIVE',
          status: 'active',
          deletedAt: null,
          deleted_at: null,
          deleted_reason: null,
          deleted_by: null
        }
      }
    );
    
    // 4. Restore User details
    const user = await User.findById(vendor.userId);
    if (user) {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            email: cleanDel(user.email),
            phone: cleanDel(user.phone),
            referralCode: cleanDel(user.referralCode) || undefined,
            uniqueRedeemCode: cleanDel(user.uniqueRedeemCode) || undefined,
            status: 'active',
            role: 'vendor'
          }
        }
      );
    }
    
    // 5. Create Audit Log
    await VendorAccountLog.create({
      vendor_id: vendorId,
      action_type: 'RESTORED',
      action_by: 'admin',
      old_status: oldStatus,
      new_status: 'ACTIVE',
      reason: 'Vendor account restored by admin.',
      ipAddress,
      deviceInfo,
      metadata: {
        restoredAt: new Date().toISOString(),
      }
    });
    
    console.log(`[Admin Restoration] Vendor account ${vendorId} successfully restored!`);
    return vendor;
  }
}
