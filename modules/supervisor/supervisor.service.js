import Supervisor from '../../models/supervisor.model.js';
import User from '../../models/user.model.js';
import Vendor from '../../models/vendor.model.js';
import { dbConnect } from '../../config/database.js';

export class SupervisorService {
  /**
   * Create a new supervisor
   */
  static async createSupervisor(data, adminId) {
    await dbConnect();
    const { fullName, username, password, phoneNumber, email, status } = data;

    // Check if username already exists
    const existingSupervisor = await Supervisor.findOne({ username: username.toLowerCase() });
    if (existingSupervisor) {
      throw new Error('Username already exists');
    }
    
    // Check if user with email or phone already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone: phoneNumber },
      ],
      status: { $ne: 'deleted' }
    });
    
    if (existingUser) {
      throw new Error('User with this email or phone already exists');
    }

    // Create User record for auth
    const user = new User({
      firstName: fullName,
      email: email?.toLowerCase(),
      phone: phoneNumber,
      password: password,
      role: 'supervisor',
      status: 'active',
    });
    await user.save();

    // Create Supervisor profile
    const supervisor = new Supervisor({
      userId: user._id,
      fullName,
      username: username.toLowerCase(),
      email: email?.toLowerCase(),
      phoneNumber,
      status: status || 'active',
      createdByAdmin: adminId,
    });
    
    await supervisor.save();
    return supervisor;
  }

  /**
   * List all supervisors with vendor counts
   */
  static async listSupervisors(filters = {}) {
    await dbConnect();
    const { status, search, page = 1, limit = 20 } = filters;
    
    const query = { is_deleted: false };
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { supervisorCode: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Supervisor.countDocuments(query);
    const supervisors = await Supervisor.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
      
    // Fetch vendor stats for each supervisor
    const supervisorsWithStats = await Promise.all(supervisors.map(async (sup) => {
      const vendorStats = await Vendor.aggregate([
        { $match: { supervisorId: sup._id, is_deleted: { $ne: true }, account_status: { $ne: 'DELETED' } } },
        {
          $group: {
            _id: '$approvalStatus',
            count: { $sum: 1 }
          }
        }
      ]);
      
      let totalVendors = 0;
      let approvedVendors = 0;
      let pendingVendors = 0;
      
      vendorStats.forEach(stat => {
        totalVendors += stat.count;
        if (stat._id === 'approved') approvedVendors += stat.count;
        if (stat._id === 'pending') pendingVendors += stat.count;
      });
      
      return {
        ...sup,
        totalVendors,
        approvedVendors,
        pendingVendors,
      };
    }));

    return {
      supervisors: supervisorsWithStats,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get single supervisor details with full analytics
   */
  static async getSupervisorDetail(id) {
    await dbConnect();
    const supervisor = await Supervisor.findOne({ _id: id, is_deleted: false }).lean();
    if (!supervisor) {
      throw new Error('Supervisor not found');
    }
    
    const vendorStats = await Vendor.aggregate([
      { $match: { supervisorId: supervisor._id, is_deleted: { $ne: true }, account_status: { $ne: 'DELETED' } } },
      {
        $group: {
          _id: '$approvalStatus',
          count: { $sum: 1 }
        }
      }
    ]);
    
    let totalVendors = 0;
    let approvedVendors = 0;
    let pendingVendors = 0;
    let rejectedVendors = 0;
    
    vendorStats.forEach(stat => {
      totalVendors += stat.count;
      if (stat._id === 'approved') approvedVendors += stat.count;
      if (stat._id === 'pending') pendingVendors += stat.count;
      if (stat._id === 'rejected') rejectedVendors += stat.count;
    });
    
    return {
      ...supervisor,
      analytics: {
        totalVendors,
        approvedVendors,
        pendingVendors,
        rejectedVendors
      }
    };
  }

  /**
   * Update supervisor details
   */
  static async updateSupervisor(id, data) {
    await dbConnect();
    const supervisor = await Supervisor.findOne({ _id: id, is_deleted: false });
    if (!supervisor) throw new Error('Supervisor not found');
    
    const { fullName, phoneNumber, email, password } = data;
    
    if (fullName) supervisor.fullName = fullName;
    if (phoneNumber) supervisor.phoneNumber = phoneNumber;
    if (email) supervisor.email = email.toLowerCase();
    
    await supervisor.save();
    
    // Update linked user
    const user = await User.findById(supervisor.userId);
    if (user) {
      if (fullName) user.firstName = fullName;
      if (phoneNumber) user.phone = phoneNumber;
      if (email) user.email = email.toLowerCase();
      if (password) {
        user.password = password; // Will be hashed by pre-save hook
      }
      await user.save();
    }
    
    return supervisor;
  }

  /**
   * Toggle status
   */
  static async toggleSupervisorStatus(id, status) {
    await dbConnect();
    const supervisor = await Supervisor.findOne({ _id: id, is_deleted: false });
    if (!supervisor) throw new Error('Supervisor not found');
    
    if (['active', 'inactive'].includes(status)) {
      supervisor.status = status;
      await supervisor.save();
      
      // Sync user status (inactive users cannot login)
      const user = await User.findById(supervisor.userId);
      if (user) {
        user.status = status === 'active' ? 'active' : 'suspended';
        await user.save();
      }
    }
    
    return supervisor;
  }

  /**
   * Delete supervisor (soft)
   */
  static async deleteSupervisor(id) {
    await dbConnect();
    const supervisor = await Supervisor.findById(id);
    if (!supervisor) throw new Error('Supervisor not found');
    
    supervisor.is_deleted = true;
    supervisor.status = 'inactive';
    await supervisor.save();
    
    // Suspend associated user
    const user = await User.findById(supervisor.userId);
    if (user) {
      user.status = 'deleted';
      user.deletedAt = new Date();
      await user.save();
    }
    
    // Detach vendors mapped to this supervisor?
    // According to reqs: "Deleted Supervisor: Vendors remain but supervisor mapping becomes null."
    await Vendor.updateMany(
      { supervisorId: supervisor._id },
      { $set: { supervisorId: null, supervisorCode: null } }
    );
    
    return true;
  }

  /**
   * Get vendors for a specific supervisor
   */
  static async getSupervisorVendors(supervisorId, filters = {}) {
    await dbConnect();
    const { status, search, page = 1, limit = 20 } = filters;
    
    const query = { 
      supervisorId,
      is_deleted: { $ne: true },
      account_status: { $ne: 'DELETED' }
    };
    
    if (status && status !== 'all') {
      query.approvalStatus = status;
    }
    
    if (search) {
      query.$or = [
        { storeName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const total = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .populate('userId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
      
    // Fetch subscription plan for each
    const UserSubscription = (await import('../../models/userSubscription.model.js')).default;
    const vendorsWithPlans = await Promise.all(vendors.map(async (v) => {
      const activeSub = await UserSubscription.findOne({
        $or: [{ vendor: v._id }, { user: v.userId?._id || v.userId }],
        status: { $in: ['active', 'trial'] }
      }).populate('plan', 'name').lean();
      
      return {
        ...v,
        plan: activeSub?.planSnapshot?.name || activeSub?.plan?.name || 'Free',
      };
    }));
      
    return {
      vendors: vendorsWithPlans,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Validate supervisor code (For Vendor Registration)
   */
  static async validateSupervisorCode(code) {
    await dbConnect();
    const supervisor = await Supervisor.findOne({ 
      supervisorCode: code, 
      is_deleted: false,
      status: 'active'
    });
    
    if (!supervisor) {
      return { valid: false };
    }
    
    return {
      valid: true,
      supervisorId: supervisor._id,
      name: supervisor.fullName
    };
  }

  /**
   * Get supervisor dashboard data
   */
  static async getDashboardData(supervisorId) {
    const detail = await this.getSupervisorDetail(supervisorId);
    return {
      supervisorCode: detail.supervisorCode,
      fullName: detail.fullName,
      stats: detail.analytics
    };
  }
}
