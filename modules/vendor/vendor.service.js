import Vendor from '../../models/vendor.model.js';
import User from '../../models/user.model.js';
import Category from '../../models/category.model.js';
import Agent from '../../models/agent.model.js';
import Otp from '../../models/otp.model.js';
import Store from '../../models/store.model.js';
import Review from '../../models/review.model.js';
import { generateOtp } from '../../utils/generateOtp.js';
import { hashData, compareHash } from '../../utils/hash.js';
import { generateToken } from '../../utils/jwt.js';
import { dbConnect } from '../../config/database.js';

/**
 * Vendor Service
 * Handles database operations for Vendor management
 */
export class VendorService {
  /**
   * Find a vendor by their associated User ID
   * @param {string} userId
   */
  static async findVendorByUserId(userId) {
    return await Vendor.findOne({ userId });
  }

  /**
   * Upsert Step 1 Registration Data
   * CASE A: Update existing vendor
   * CASE B: Create new vendor
   * @param {Object} data Registration data (userId, fullName, email)
   */
  static async upsertVendorStep1(data) {
    const { userId, fullName, email } = data;

    // Check if vendor already exists for this user
    let vendor = await Vendor.findOne({ userId });

    if (vendor) {
      // CASE A: Update existing record
      vendor.fullName = fullName;
      vendor.email = email;
      vendor.registrationStep = 1; // Explicitly set to 1 for this step
      await vendor.save();
      return { vendor, isNew: false };
    }

    // CASE B: Create new vendor record
    // Need mobileNumber from User model
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const mobileNumber = user.phone || '0000000000'; // Fallback if phone is missing

    // Check if another vendor already uses this mobile number
    const duplicateVendor = await Vendor.findOne({ mobileNumber, userId: { $ne: userId } });
    if (duplicateVendor && duplicateVendor.status !== 'draft') {
      throw new Error('This mobile number is already associated with another vendor profile.');
    }

    vendor = new Vendor({
      userId,
      fullName,
      email,
      mobileNumber,
      registrationStep: 1,
      status: 'draft',
    });

    await vendor.save();

    // Link back to User profile
    user.vendorProfile = vendor._id;
    await user.save();

    return { vendor, isNew: true };
  }

  /**
   * Update Vendor Step 2 Data
   * @param {string} userId
   * @param {Object} stepData Step 2 data
   */
  static async updateVendorStep2(userId, stepData) {
    const { categoryId, storeName, storeAbout, location, media } = stepData;

    // 1. Find vendor
    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      throw new Error('Vendor profile not found. Please complete Step 1 first.');
    }

    // 2. Validate Category
    const category = await Category.findOne({ _id: categoryId, isActive: true });
    if (!category) {
      throw new Error('Invalid or inactive category selected');
    }

    // 3. Update fields
    vendor.categoryId = categoryId;
    vendor.storeName = storeName;
    vendor.storeAbout = storeAbout;
    vendor.location = location;
    vendor.media = media;
    vendor.registrationStep = 2;

    await vendor.save();
    return vendor;
  }

  /**
   * Complete Vendor Registration (Step 3)
   * @param {string} userId
   * @param {Object} stepData Step 3 data
   */
  static async completeRegistrationStep3(userId, stepData) {
    const { locationCoordinates, fullAddress, agentCode } = stepData;

    // 1. Find vendor
    const vendor = await Vendor.findOne({ userId });
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }

    // 2. Validate current progress
    if (vendor.registrationStep < 2) {
      throw new Error('Please complete Step 2 first');
    }

    // 3. Validate Agent Code (if provided)
    let agent = null;
    if (agentCode) {
      agent = await Agent.findOne({ code: agentCode.toUpperCase(), isActive: true });
      if (!agent) {
        throw new Error('Invalid or inactive agent code');
      }
    }

    // 4. Update vendor
    vendor.locationCoordinates = locationCoordinates;
    vendor.fullAddress = fullAddress;
    vendor.agentCode = agentCode ? agentCode.toUpperCase() : undefined;
    vendor.registrationStep = 3;
    vendor.status = 'pending_approval';

    await vendor.save();

    // 5. If agent exists, link vendor
    if (agent) {
      if (!agent.assignedVendors.includes(vendor._id)) {
        agent.assignedVendors.push(vendor._id);
        await agent.save();
      }
    }

    return vendor;
  }

  /**
   * Create or Update Store Details
   * @param {string} userId 
   * @param {Object} data 
   */
  static async createStore(userId, data) {
    const { 
      businessName, category, phone, email, address, 
      state, district, mandal, location, businessHours, images 
    } = data;

    // 1. Check if phone number is already taken by another active/pending vendor
    const existingVendor = await Vendor.findOne({ mobileNumber: phone, userId: { $ne: userId } });
    if (existingVendor && existingVendor.status !== 'draft') {
      throw new Error('This phone number is already registered with another vendor account.');
    }

    // 2. Find or create the category by name
    let categoryObj = await Category.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') } });
    if (!categoryObj) {
      // For this flow, we'll create the category if it doesn't exist, or we could throw an error
      categoryObj = new Category({ name: category });
      await categoryObj.save();
    }

    // 2. Prepare update data
    const updateData = {
      storeName: businessName,
      categoryId: categoryObj._id,
      mobileNumber: phone,
      email: email,
      fullAddress: address,
      location: { state, district, mandal },
      locationCoordinates: {
        type: 'Point',
        coordinates: [location.lng, location.lat] // GeoJSON format: [lng, lat]
      },
      workingHours: businessHours,
      'media.images': images,
      status: 'pending_approval',
      registrationStep: 3 // Mark as fully submitted
    };

    // 3. Upsert vendor record for this user
    let vendor = await Vendor.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    return vendor;
  }

  /**
   * Vendor Registration Step 1: Basic Details
   * Creates or updates vendor with basic info
   * @param {Object} data { ownerName, mobileNumber, email }
   */
  static async registerVendorStep1(data) {
    const { ownerName, mobileNumber, email } = data;

    await dbConnect();
    
    // 1. Check if vendor already exists and has completed registration (not deleted or draft)
    const existingVendor = await Vendor.findOne({ mobileNumber, status: { $ne: 'deleted' } });
    if (existingVendor && existingVendor.status !== 'draft') {
      throw new Error('An account with this mobile number already exists. Please log in.');
    }

    // 2. Find or create User with this mobile number (ignore deleted)
    let user = await User.findOne({ phone: mobileNumber, status: { $ne: 'deleted' } });
    
    if (!user) {
      // Create new user for this vendor
      user = new User({
        phone: mobileNumber,
        email: email,
        role: 'vendor',
        status: 'active',
        phoneVerified: false
      });
      await user.save();
      console.log(`[Vendor] Created new user for mobile: ${mobileNumber}`);
    } else {
      // Update role if needed
      if (user.role === 'user') {
        user.role = 'vendor';
      }
      // Update email if provided
      if (email && !user.email) {
        user.email = email;
      }
      await user.save();
      console.log(`[Vendor] Updated existing user for mobile: ${mobileNumber}`);
    }

    // 2. Find or create Vendor profile
    let vendor = await Vendor.findOne({ userId: user._id });
    let isNew = false;
    
    if (vendor) {
      // CASE: Update existing vendor
      vendor.fullName = ownerName;
      vendor.email = email;
      vendor.mobileNumber = mobileNumber;
      console.log(`[Vendor] Updated existing vendor profile`);
    } else {
      // CASE: Create new vendor
      vendor = new Vendor({
        userId: user._id,
        fullName: ownerName,
        email: email,
        mobileNumber: mobileNumber,
        status: 'draft',
        registrationStep: 1
      });
      isNew = true;
      console.log(`[Vendor] Created new vendor profile`);
    }

    await vendor.save();

    // Link vendor profile to user
    if (!user.vendorProfile || user.vendorProfile.toString() !== vendor._id.toString()) {
      user.vendorProfile = vendor._id;
      await user.save();
    }

    return { vendor, user, isNew };
  }

  /**
   * Vendor Registration Step 2: Business Details
   * @param {Object} data { vendorId, storeName, category, storeAbout, state, district, mandal, thumbnailUrl, bannerUrl }
   */
  static async registerVendorStep2(data) {
    const { 
      vendorId, storeName, category, storeAbout, 
      state, district, mandal, 
      thumbnailUrl, thumbnailKey, 
      bannerUrl, bannerKey 
    } = data;

    await dbConnect();

    // 1. Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found. Please complete Step 1 first.');
    }

    // 2. Resolve Category (search by name or ID)
    let categoryObj;
    if (category && category.match && category.match(/^[0-9a-fA-F]{24}$/)) {
      // It's a valid MongoDB ObjectId
      categoryObj = await Category.findById(category);
    } else {
      // Search by name
      categoryObj = await Category.findOne({ 
        name: { $regex: new RegExp(`^${category}$`, 'i') },
        isActive: true 
      });
    }

    if (!categoryObj) {
      // Create new category if it doesn't exist
      categoryObj = new Category({ 
        name: category,
        isActive: true 
      });
      await categoryObj.save();
      console.log(`[Vendor] Created new category: ${category}`);
    }

    // 3. Update vendor with step 2 details
    vendor.storeName = storeName;
    vendor.categoryId = categoryObj._id;
    vendor.storeAbout = storeAbout;
    vendor.location = {
      state,
      district,
      mandal
    };
    vendor.media = {
      thumbnailUrl: thumbnailUrl || vendor.media?.thumbnailUrl || '',
      thumbnailKey: thumbnailKey || vendor.media?.thumbnailKey || '',
      bannerUrl: bannerUrl || vendor.media?.bannerUrl || '',
      bannerKey: bannerKey || vendor.media?.bannerKey || '',
      images: vendor.media?.images || []
    };
    vendor.registrationStep = 2;

    await vendor.save();
    console.log(`[Vendor Step 2] Updated store details for vendor ${vendorId}`);

    return vendor;
  }

  /**
   * Vendor Registration Step 3: Location + Final Submit
   * @param {Object} data { vendorId, fullAddress, locationCoordinates, agentCode }
   */
  static async registerVendorStep3(data) {
    const { vendorId, fullAddress, locationCoordinates, agentCode } = data;

    await dbConnect();

    // 1. Find vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // 2. Validate registration progress
    if (vendor.registrationStep < 2) {
      throw new Error('Please complete Step 2 (Business Details) first');
    }

    // 3. Validate agent code if provided
    let agent = null;
    if (agentCode && agentCode.trim()) {
      agent = await Agent.findOne({ 
        code: agentCode.trim().toUpperCase(), 
        isActive: true 
      });
      
      if (!agent) {
        throw new Error('Invalid or inactive agent code');
      }
    }

    // 4. Update vendor with location details
    vendor.fullAddress = fullAddress;
    vendor.locationCoordinates = {
      type: 'Point',
      coordinates: locationCoordinates && locationCoordinates.length === 2 
        ? [locationCoordinates[0], locationCoordinates[1]]  // [lng, lat]
        : [0, 0]
    };
    
    if (agentCode && agentCode.trim()) {
      vendor.agentCode = agentCode.trim().toUpperCase();
    }

    // 5. Finalize registration
    vendor.status = 'pending_approval';
    vendor.registrationStep = 3;

    await vendor.save();
    console.log(`[Vendor Step 3] Completed registration for vendor ${vendorId} - Status: pending_approval`);

    // 6. Link vendor to agent if applicable
    if (agent && !agent.assignedVendors.includes(vendor._id)) {
      agent.assignedVendors.push(vendor._id);
      await agent.save();
      console.log(`[Vendor] Linked vendor ${vendorId} to agent ${agent.code}`);
    }

    return vendor;
  }

  /**
   * Get Vendor Profile by ID or User ID
   * @param {string} id Vendor ID or User ID
   * @param {boolean} isUserId If true, id is User ID
   */
  static async getVendorProfile(id, isUserId = false) {
    await dbConnect();
    const query = isUserId ? { userId: id } : { _id: id };
    return await Vendor.findOne(query).populate('categoryId', 'name');
  }

  /**
   * Update Vendor Profile
   * @param {string} vendorId 
   * @param {Object} updateData 
   */
  static async updateVendorProfile(vendorId, updateData) {
    await dbConnect();
    
    // Clean and Map update data (handle aliases)
    const { 
      fullName, ownerName,
      email, 
      storeName, 
      categoryId, category,
      storeAbout, 
      state, district, mandal, 
      fullAddress, 
      locationCoordinates, location,
      thumbnailUrl, thumbnailKey, 
      bannerUrl, bannerKey,
      website, instagram, linkedin, youtube, facebook,
      agentCode
    } = updateData;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor not found');

    // Handle Aliases
    if (fullName || ownerName) vendor.fullName = fullName || ownerName;
    if (email) vendor.email = email;
    if (storeName) vendor.storeName = storeName;
    if (storeAbout) vendor.storeAbout = storeAbout;
    if (fullAddress) vendor.fullAddress = fullAddress;
    if (agentCode) vendor.agentCode = agentCode;

    // Social Links
    if (website !== undefined) vendor.website = website;
    if (instagram !== undefined) vendor.instagram = instagram;
    if (linkedin !== undefined) vendor.linkedin = linkedin;
    if (youtube !== undefined) vendor.youtube = youtube;
    if (facebook !== undefined) vendor.facebook = facebook;
    
    // Category Handling (ID or Name)
    if (categoryId) {
      vendor.categoryId = categoryId;
    } else if (category) {
      // Search or create category by name
      let categoryObj = await Category.findOne({ 
        name: { $regex: new RegExp(`^${category}$`, 'i') },
        isActive: true 
      });
      if (!categoryObj) {
        categoryObj = new Category({ name: category, isActive: true });
        await categoryObj.save();
      }
      vendor.categoryId = categoryObj._id;
    }

    // Location (State/District/Mandal)
    if (state || district || mandal) {
      vendor.location = {
        state: state || vendor.location?.state,
        district: district || vendor.location?.district,
        mandal: mandal || vendor.location?.mandal
      };
    }

    // GeoJSON Location
    if (locationCoordinates) {
      vendor.locationCoordinates = {
        type: 'Point',
        coordinates: locationCoordinates
      };
    } else if (location && location.type === 'Point' && location.coordinates) {
      vendor.locationCoordinates = location;
    }

    // Media
    if (thumbnailUrl || bannerUrl || thumbnailKey || bannerKey) {
      vendor.media = {
        thumbnailUrl: thumbnailUrl || vendor.media?.thumbnailUrl || '',
        thumbnailKey: thumbnailKey || vendor.media?.thumbnailKey || '',
        bannerUrl: bannerUrl || vendor.media?.bannerUrl || '',
        bannerKey: bannerKey || vendor.media?.bannerKey || '',
        images: vendor.media?.images || []
      };
    }

    await vendor.save();
    
    // Return populated profile
    return await Vendor.findById(vendorId).populate('categoryId', 'name');
  }

  /**
   * Check if a vendor exists by mobile number
   * Returns vendor details if exists
   * @param {string} mobileNumber 
   */
  static async checkVendorExists(mobileNumber) {
    await dbConnect();
    const vendor = await Vendor.findOne({ mobileNumber, status: { $ne: 'deleted' } }).select('_id status registrationStep');
    
    if (!vendor) {
      return { 
        exists: false, 
        message: 'Vendor not found - please register' 
      };
    }
    
    return { 
      exists: true, 
      vendorId: vendor._id.toString(),
      status: vendor.status,
      registrationStep: vendor.registrationStep,
      message: 'Vendor found'
    };
  }

  /**
   * Send OTP to vendor for login
   * Only works for existing vendors (new vendors must register first)
   * @param {string} mobileNumber 
   */
  static async sendVendorOtp(mobileNumber) {
    await dbConnect();

    // 1. Check if vendor exists
    const vendor = await Vendor.findOne({ mobileNumber });
    if (!vendor) {
      // Don't reveal that vendor doesn't exist - redirect to register
      throw new Error('Vendor not found. Please register using /register');
    }

    // 2. Status Check - Optional: We could block suspended/rejected here, 
    // but the user wants them to reach the OTP page.
    // We will allow all statuses for now, and handle status-based access in the frontend.
    
    // 3. Generate OTP (hardcoded '1234' for testing)
    const plainOtp = '1234';
    const hashedOtp = await hashData(plainOtp);

    // 3. Save OTP record with 5-minute expiry
    await Otp.findOneAndUpdate(
      { target: mobileNumber, type: 'phone' },
      { 
        code: hashedOtp, 
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: false,
        attempts: 0
      },
      { upsert: true, new: true }
    );

    // 4. Log for development
    console.log(`[SIMULATION] Vendor OTP for ${mobileNumber}: ${plainOtp}`);

    return { 
      success: true, 
      message: 'OTP sent successfully to your mobile number',
      mobileNumber: mobileNumber
    };
  }

  /**
   * Verify OTP and generate JWT token for vendor login
   * @param {string} mobileNumber 
   * @param {string} otpCode 
   */
  static async verifyVendorOtp(mobileNumber, otpCode) {
    await dbConnect();

    // 1. Find OTP record
    const otpRecord = await Otp.findOne({ target: mobileNumber, type: 'phone' });
    if (!otpRecord) {
      throw new Error('OTP not found or has expired. Please request a new OTP.');
    }

    // 2. Check OTP expiry
    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new Error('OTP has expired. Please request a new OTP.');
    }

    // 3. Check max attempts
    if (otpRecord.attempts >= 3) {
      throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    // 4. Verify OTP
    const isMatch = await compareHash(otpCode, otpRecord.code);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new Error(`Invalid OTP. Attempt ${otpRecord.attempts} of 3.`);
    }

    // 5. Find Vendor
    const vendor = await Vendor.findOne({ mobileNumber });
    if (!vendor) {
      throw new Error('Vendor profile not found. Please register first.');
    }

    // 6. Find associated User
    const user = await User.findById(vendor.userId);
    if (!user) {
      throw new Error('Associated user account not found.');
    }

    // 7. Generate JWT Token
    const token = generateToken({
      userId: user._id.toString(),
      vendorId: vendor._id.toString(),
      role: 'vendor',
      mobileNumber: vendor.mobileNumber,
      email: vendor.email
    });

    // 8. Clean up OTP record
    await Otp.deleteOne({ _id: otpRecord._id });

    console.log(`[Vendor Login] Successful login for vendor ${vendor._id} (${mobileNumber})`);

    return {
      success: true,
      message: 'Login successful',
      token,
      vendor: {
        vendorId: vendor._id.toString(),
        mobileNumber: vendor.mobileNumber,
        email: vendor.email,
        storeName: vendor.storeName || 'Not Set',
        status: vendor.status,
        registrationStep: vendor.registrationStep
      }
    };
  }

  /**
   * Create a new Store (Protected)
   * ONLY ACTIVE vendors can create stores
   * @param {string} vendorId 
   * @param {Object} storeData 
   */
  static async createStore(vendorId, storeData) {
    await dbConnect();

    // 1. Fetch and Validate Vendor Status
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      throw new Error('Vendor profile not found');
    }

    // Check if a store already exists with this phone number
    const existingStore = await Store.findOne({ phone: storeData.phone });
    if (existingStore) {
      throw new Error('A store with this phone number already exists.');
    }

    if (vendor.status !== 'active') {
      const error = new Error('Vendor not active');
      error.statusCode = 403;
      throw error;
    }

    // 2. Map and Validate Input
    const { 
      businessName, category, phone, email, address, 
      state, district, mandal, location, businessHours, images 
    } = storeData;

    if (!businessName || !category || !phone || !address || !location) {
      throw new Error('Missing required store details');
    }

    // 3. Create Store Record
    const store = new Store({
      vendorId,
      businessName,
      category,
      phone,
      email,
      address,
      state,
      district,
      mandal,
      location: {
        type: 'Point',
        coordinates: [location.lng, location.lat] // [lng, lat]
      },
      businessHours,
      images,
      status: 'pending_approval'
    });

    await store.save();
    return store;
  }

  /**
   * Delete Vendor Account (Soft Delete)
   * @param {string} userId 
   * @param {string} vendorId 
   * @param {string} reason 
   */
  static async deleteVendorAccount(userId, vendorId, reason = '') {
    await dbConnect();
    const timestamp = Date.now();

    // 1. Update Vendor Status & Suffix Identifiers
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) throw new Error('Vendor profile not found');

    if (vendor.status !== 'deleted') {
      if (vendor.email) vendor.email = `${vendor.email}_del_${timestamp}`;
      if (vendor.mobileNumber) vendor.mobileNumber = `${vendor.mobileNumber}_del_${timestamp}`;
      if (vendor.slug) vendor.slug = `${vendor.slug}_del_${timestamp}`;
      
      vendor.status = 'deleted';
      vendor.deletedAt = new Date();
      vendor.deletionReason = reason;
      await vendor.save();
    }

    // 2. Update User Status & Suffix Identifiers
    const user = await User.findById(userId);
    if (user && user.status !== 'deleted') {
      if (user.email) user.email = `${user.email}_del_${timestamp}`;
      if (user.phone) user.phone = `${user.phone}_del_${timestamp}`;
      if (user.referralCode) user.referralCode = `${user.referralCode}_del_${timestamp}`;

      user.status = 'deleted';
      user.deletedAt = new Date();
      user.fcmTokens = []; 
      await user.save();
    }

    console.log(`[Vendor Deletion] Account deleted for vendor ${vendorId} (User: ${userId}) - Identifiers suffixed`);
    return { success: true };
  }

  /**
   * Get Vendor Reviews with Aggregation
   * @param {string} vendorId
   * @param {number} page
   * @param {number} limit
   */
  static async getVendorReviews(vendorId, page = 1, limit = 10) {
    await dbConnect();

    // 1. Get Summary Stats (Aggregation)
    const summaryData = await Review.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId), isActive: true } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        }
      }
    ]);

    const summary = summaryData.length > 0 ? {
      averageRating: Number(summaryData[0].averageRating.toFixed(1)),
      totalReviews: summaryData[0].totalReviews,
      ratingBreakdown: {
        '5': summaryData[0].rating5,
        '4': summaryData[0].rating4,
        '3': summaryData[0].rating3,
        '2': summaryData[0].rating2,
        '1': summaryData[0].rating1,
      }
    } : {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
    };

    // 2. Fetch Paginated Reviews
    const total = summary.totalReviews;
    const reviews = await Review.find({ vendorId, isActive: true })
      .populate('userId', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Format for app
    const formattedReviews = reviews.map(r => {
      const msPerMinute = 60 * 1000;
      const msPerHour = msPerMinute * 60;
      const msPerDay = msPerHour * 24;
      const msPerMonth = msPerDay * 30;
      const msPerYear = msPerDay * 365;

      const elapsed = new Date() - new Date(r.createdAt);
      let relativeTime = '';

      if (elapsed < msPerMinute) relativeTime = Math.round(elapsed/1000) + ' seconds ago';
      else if (elapsed < msPerHour) relativeTime = Math.round(elapsed/msPerMinute) + ' minutes ago';
      else if (elapsed < msPerDay) relativeTime = Math.round(elapsed/msPerHour) + ' hours ago';
      else if (elapsed < msPerMonth) relativeTime = Math.round(elapsed/msPerDay) + ' days ago';
      else if (elapsed < msPerYear) relativeTime = Math.round(elapsed/msPerMonth) + ' months ago';
      else relativeTime = Math.round(elapsed/msPerYear) + ' years ago';

      return {
        id: r._id.toString(),
        customerName: r.userId ? `${r.userId.firstName || ''} ${r.userId.lastName || ''}`.trim() : 'Anonymous',
        customerAvatar: r.userId?.profileImage || '',
        rating: r.rating,
        review: r.reviewText,
        createdAt: r.createdAt,
        relativeTime
      };
    });

    return {
      summary,
      reviews: formattedReviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        hasMore: (page * limit) < total
      }
    };
  }
}
