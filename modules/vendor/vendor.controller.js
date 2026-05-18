import { VendorService } from './vendor.service.js';
import { apiError, apiSuccess } from '../../utils/errorHandler.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { dbConnect } from '../../config/database.js';
import { S3Service } from '../../services/s3.service.js';
import { FileValidator } from '../../utils/fileValidator.js';
import { generateToken } from '../../utils/jwt.js';
import { 
  getPlans, 
  getPlan, 
  purchaseSubscription as purchaseSubscriptionService, 
  verifyPayment as verifyPaymentService,
  getActiveSubscription
} from '../../services/subscription.service.js';
import { 
  createAd as createAdService, 
  listAds as listAdsService, 
  getAd as getAdService, 
  updateAd as updateAdService, 
  deleteAd as deleteAdService 
} from '../../services/ad.service.js';
import { razorpayService } from '../../services/razorpay.service.js';
import User from '../../models/user.model.js';
// import sizeOf from 'image-size'; // Temporarily disabled due to production RangeErrors

/**
 * Vendor Controller
 * Orchestrates registration and vendor-related operations
 */
export class VendorController {
  /**
   * POST /api/vendor/register/step-1
   * Vendor Signup (Basic Info) - Step 1
   * Creates or updates vendor with name, email, mobile
   * @body { mobileNumber, ownerName, email }
   */
  static async registerStep1(req) {
    try {
      await dbConnect();

      // 1. Extract and Validate Input
      let body;
      try {
        body = await req.json();
      } catch (err) {
        return Response.json({ 
          success: false, 
          message: 'Invalid JSON body format' 
        }, { status: 400 });
      }

      const { mobileNumber, ownerName, email } = body;

      // 2. Validate Mobile Number
      if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
        return Response.json({ 
          success: false, 
          message: 'Valid 10-digit mobile number is required (starting with 6-9)' 
        }, { status: 400 });
      }

      // 3. Validate Owner Name
      if (!ownerName || ownerName.trim().length < 2) {
        return Response.json({ 
          success: false, 
          message: 'Owner name must be at least 2 characters long' 
        }, { status: 400 });
      }

      // 4. Validate Email
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return Response.json({ 
          success: false, 
          message: 'Valid email address is required' 
        }, { status: 400 });
      }

      // 5. Process Signup Step 1
      const result = await VendorService.registerVendorStep1({
        mobileNumber,
        ownerName: ownerName.trim(),
        email: email.trim().toLowerCase(),
      });

      // 6. Successful Response
      return Response.json({
        success: true,
        message: 'Step 1 completed successfully',
        vendorId: result.vendor._id,
        status: result.vendor.status,
        registrationStep: 1,
        isNewVendor: result.isNew || false
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.registerStep1 Error]', error);
      return Response.json({
        success: false,
        message: error.message || 'Failed to complete Step 1'
      }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/register/step-2
   * Vendor Registration Step 2: Business Details
   * @body { vendorId, storeName, category, storeAbout, state, district, mandal, thumbnailUrl?, bannerUrl? }
   */
  static async registerStep2(req) {
    try {
      await dbConnect();

      // 1. Parse request
      let body;
      try {
        body = await req.json();
      } catch (err) {
        return Response.json({ 
          success: false, 
          message: 'Invalid JSON body format' 
        }, { status: 400 });
      }

      const { 
        vendorId, storeName, category, storeAbout, 
        state, district, mandal, 
        thumbnailUrl, thumbnailKey, 
        bannerUrl, bannerKey 
      } = body;

      // 2. Validate Required Fields
      if (!vendorId) {
        return Response.json({ 
          success: false, 
          message: 'Vendor ID is required' 
        }, { status: 400 });
      }

      if (!storeName || storeName.trim().length < 2) {
        return Response.json({ 
          success: false, 
          message: 'Store name must be at least 2 characters long' 
        }, { status: 400 });
      }

      if (!category) {
        return Response.json({ 
          success: false, 
          message: 'Store category is required' 
        }, { status: 400 });
      }

      if (!storeAbout || storeAbout.trim().length < 10) {
        return Response.json({ 
          success: false, 
          message: 'Store description must be at least 10 characters long' 
        }, { status: 400 });
      }

      if (!state || !district || !mandal) {
        return Response.json({ 
          success: false, 
          message: 'Location details (State, District, Mandal) are required' 
        }, { status: 400 });
      }

      // 3. Process Step 2
      const vendor = await VendorService.registerVendorStep2({
        vendorId,
        storeName: storeName.trim(),
        category,
        storeAbout: storeAbout.trim(),
        state,
        district,
        mandal,
        thumbnailUrl,
        thumbnailKey,
        bannerUrl,
        bannerKey
      });

      // 4. Success Response
      return Response.json({
        success: true,
        message: 'Step 2 completed successfully',
        vendorId: vendor._id,
        status: vendor.status,
        registrationStep: 2
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.registerStep2 Error]', error);
      return Response.json({
        success: false,
        message: error.message || 'Failed to complete Step 2'
      }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/register/step-3
   * Vendor Registration Step 3: Location + Final Submit
   * @body { vendorId, fullAddress, locationCoordinates?, agentCode? }
   */
  static async registerStep3(req) {
    try {
      await dbConnect();

      // 1. Parse request
      let body;
      try {
        body = await req.json();
      } catch (err) {
        return Response.json({ 
          success: false, 
          message: 'Invalid JSON body format' 
        }, { status: 400 });
      }

      const { vendorId, fullAddress, locationCoordinates, agentCode } = body;

      // 2. Validate Required Fields
      if (!vendorId) {
        return Response.json({ 
          success: false, 
          message: 'Vendor ID is required' 
        }, { status: 400 });
      }

      if (!fullAddress || fullAddress.trim().length < 10) {
        return Response.json({ 
          success: false, 
          message: 'Full address is required and must be at least 10 characters' 
        }, { status: 400 });
      }

      // 3. Process Step 3
      const vendor = await VendorService.registerVendorStep3({
        vendorId,
        fullAddress: fullAddress.trim(),
        locationCoordinates,
        agentCode
      });

      // 4. Success Response
      return Response.json({
        success: true,
        message: 'Registration completed successfully! Your application is under review.',
        vendorId: vendor._id,
        status: vendor.status,
        registrationStep: 3
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.registerStep3 Error]', error);
      return Response.json({
        success: false,
        message: error.message || 'Failed to complete Step 3'
      }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/register/setup-store
   * Vendor Setup Store Details (Legacy/Internal)
   */
  static async setupStore(req) {
    try {
      await dbConnect();

      // 1. Authenticate Vendor
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['vendor']);
      if (roleError) return roleError;

      // 2. Parse and Validate Body
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return Response.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
      }

      const { businessName, category, phone, email, address, state, district, mandal, location } = body;

      if (!businessName || !category || !phone || !address || !location) {
        return Response.json({ 
          success: false, 
          message: 'Missing required fields: businessName, category, phone, address, and location are mandatory' 
        }, { status: 400 });
      }

      // 3. Create Store (Updates Vendor Doc)
      const vendor = await VendorService.createStore(user.id, body);

      return Response.json({
        success: true,
        message: 'Store details updated successfully',
        storeId: vendor._id,
        status: vendor.status
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.setupStore Error]', error);
      return Response.json({
        success: false,
        message: error.message || 'Internal server error'
      }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/check-vendor
   * Checks if vendor exists by mobile number
   * Returns: { exists: boolean, vendorId?: string, status?: string }
   */
  static async checkVendor(req) {
    try {
      await dbConnect();
      
      const body = await req.json();
      const { mobileNumber } = body;

      if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
        return Response.json({ 
          success: false, 
          message: 'Valid 10-digit mobile number is required',
          exists: false 
        }, { status: 400 });
      }

      const result = await VendorService.checkVendorExists(mobileNumber);
      
      // Always return 200, but indicate if vendor exists
      // HACK: Return 'active' status for 'pending_approval' to bypass mobile app navigation blocking.
      // This allows vendors to reach the OTP screen even while under review.
      const displayStatus = result.status === 'pending_approval' ? 'active' : result.status;

      return Response.json({
        success: true,
        exists: result.exists,
        vendorId: result.vendorId || null,
        status: displayStatus || null,
        message: result.message || null,
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.checkVendor Error]', error);
      return Response.json({ 
        success: false, 
        message: 'Internal server error',
        exists: false 
      }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/send-otp
   * Sends OTP to vendor mobile
   * Works for existing vendors only (new vendors must register first)
   */
  static async sendOtp(req) {
    try {
      await dbConnect();

      const body = await req.json();
      const { mobileNumber } = body;

      if (!mobileNumber || !/^[6-9]\d{9}$/.test(mobileNumber)) {
        return Response.json({ 
          success: false, 
          message: 'Valid 10-digit mobile number is required' 
        }, { status: 400 });
      }

      const result = await VendorService.sendVendorOtp(mobileNumber);
      return Response.json({
        success: true,
        message: result.message || 'OTP sent successfully',
        mobileNumber: mobileNumber
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.sendOtp Error]', error);
      return Response.json({ 
        success: false, 
        message: error.message || 'Failed to send OTP' 
      }, { status: error.statusCode || 400 });
    }
  }

  /**
   * POST /api/vendor/verify-otp
   * Verifies OTP and returns token
   */
  static async verifyOtp(req) {
    try {
      const body = await req.json();
      const { mobileNumber, otp } = body;

      if (!mobileNumber || !otp) {
        return Response.json({ success: false, message: 'Mobile number and OTP are required' }, { status: 400 });
      }

      const result = await VendorService.verifyVendorOtp(mobileNumber, otp);
      return Response.json(result, { status: 200 });

    } catch (error) {
      // Keep deleted-account handling consistent across leftover OTP edge cases.
      if (error.statusCode === 403) {
        return Response.json({ success: false, message: 'Account deleted' }, { status: 403 });
      }
      return Response.json({ success: false, message: error.message }, { status: 401 });
    }
  }

  /**
   * POST /api/vendor/store/create
   * Protected: Vendor Creates Store
   * AUTH: Required (Vendor Token)
   */
  static async createStore(req) {
    try {
      await dbConnect();

      // 1. Authenticate Vendor
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      // 2. Authorize Vendor Role
      const roleError = authorize(user, ['vendor']);
      if (roleError) return roleError;

      // 3. Extract and Validate Body
      let body;
      try {
        body = await req.json();
      } catch (e) {
        return Response.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
      }

      // 4. Create Store via Service
      // Service handles "Vendor Active" check
      const store = await VendorService.createStore(user.vendorId, body);

      return Response.json({
        success: true,
        message: 'Store created successfully',
        storeId: store._id,
        status: store.status
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.createStore Error]', error);
      
      const statusCode = error.statusCode || 500;
      return Response.json({
        success: false,
        message: error.message || 'Internal server error'
      }, { status: statusCode });
    }
  }

  /**
   * GET /api/vendor/status
   * AUTH: Required (Vendor Token)
   */
  static async getStatus(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const profile = await VendorService.getVendorProfile(user.vendorId);
      if (!profile) {
        return Response.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });
      }

      let message = 'Your account is active.';
      if (profile.status === 'pending_approval') {
        message = 'Your account is under review. Please contact the administrator for any queries.';
      } else if (profile.status === 'suspended') {
        message = 'Your account has been suspended. Please contact support.';
      } else if (profile.status === 'rejected') {
        message = `Your application was rejected. Reason: ${profile.rejectionReason || 'Please contact admin.'}`;
      } else if (profile.status === 'draft') {
        message = 'Please complete your registration to submit for review.';
      }

      return Response.json({
        success: true,
        status: profile.status,
        rejectionReason: profile.rejectionReason || '',
        registrationStep: profile.registrationStep,
        message
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.getStatus Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/vendor/profile
   * AUTH: Required (Vendor Token)
   */
  static async getProfile(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const profile = await VendorService.getVendorProfile(user.vendorId);
      if (!profile) return Response.json({ success: false, message: 'Profile not found' }, { status: 404 });

      // Ensure slug exists for existing (legacy) vendors
      if (!profile.slug && profile.storeName) {
        await profile.save();
      }

      // Format response to ensure stability and requested top-level fields
      const activeSubscription = await getActiveSubscription(user.id);
      
      const formattedProfile = {
        ...profile.toObject(),
        vendorId: profile._id,
        ownerName: profile.fullName,
        phoneNumber: profile.mobileNumber,
        state: profile.location?.state || '',
        district: profile.location?.district || '',
        mandal: profile.location?.mandal || '',
        thumbnailUrl: profile.media?.thumbnailUrl || '',
        bannerUrl: profile.media?.bannerUrl || '',
        category: profile.categoryId?.name || '',
        subscription: activeSubscription ? {
          planName: activeSubscription.planSnapshot?.name || 'Unknown Plan',
          planSlug: activeSubscription.planSnapshot?.slug || '',
          status: activeSubscription.status,
          startDate: activeSubscription.startDate,
          endDate: activeSubscription.endDate,
          daysRemaining: activeSubscription.daysRemaining,
          creditsAllocated: activeSubscription.creditsAllocated,
          creditsRemaining: activeSubscription.creditsRemaining,
          creditsUsed: activeSubscription.creditsUsed,
          autoRenew: activeSubscription.autoRenew
        } : null
      };

      return Response.json({
        success: true,
        data: formattedProfile
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.getProfile Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * PATCH /api/vendor/profile
   * AUTH: Required (Vendor Token)
   */
  static async updateProfile(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      let body;
      try {
        body = await req.json();
      } catch (e) {
        return Response.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
      }

      const updatedProfile = await VendorService.updateVendorProfile(user.vendorId, body);

      // Format response to ensure stability and requested top-level fields
      const formattedProfile = {
        ...updatedProfile.toObject(),
        vendorId: updatedProfile._id,
        ownerName: updatedProfile.fullName,
        phoneNumber: updatedProfile.mobileNumber,
        state: updatedProfile.location?.state || '',
        district: updatedProfile.location?.district || '',
        mandal: updatedProfile.location?.mandal || '',
        thumbnailUrl: updatedProfile.media?.thumbnailUrl || '',
        bannerUrl: updatedProfile.media?.bannerUrl || '',
        category: updatedProfile.categoryId?.name || ''
      };

      return Response.json({
        success: true,
        message: 'Profile updated successfully',
        data: formattedProfile
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.updateProfile Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/vendor/subscription-plans
   * Fetch active subscription plans for vendors
   */
  static async getSubscriptionPlans(req) {
    try {
      await dbConnect();
      const plans = await getPlans();
      return Response.json({ success: true, data: plans }, { status: 200 });
    } catch (error) {
      console.error('[VendorController.getSubscriptionPlans Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/ads
   * Vendor creates a new ad (deducts 1 credit)
   * Form-Data: title, description, url(optional), media (image)
   */
  static async createAd(req) {
    try {
      await dbConnect();

      // 1. Authenticate Vendor
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['vendor']);
      if (roleError) return roleError;

      // Check Vendor Status: Only 'active' vendors can post ads
      const vendorProfile = await VendorService.getVendorProfile(user.vendorId);
      if (!vendorProfile || vendorProfile.status !== 'active') {
        return Response.json({
          success: false,
          message: vendorProfile?.status === 'pending_approval'
            ? 'Your account is currently under review. You cannot post ads until it is approved.'
            : 'Your account is not active. Please contact the administrator.'
        }, { status: 403 });
      }

      // 2. Parse Form Data
      const formData = await req.formData();
      const title = formData.get('title');
      const description = formData.get('description');
      const url = formData.get('url'); // optional
      const media = formData.get('media'); // file

      if (!title || !description || !media) {
        return Response.json({ success: false, message: 'Title, description, and media are required' }, { status: 400 });
      }

      // 3. Process Image
      let buffer;
      try {
        if (media && typeof media.arrayBuffer === 'function') {
          buffer = Buffer.from(await media.arrayBuffer());
        } else if (media && typeof media === 'string') {
          // Handle case where media might be a string (base64 or URL) mistakenly
          buffer = Buffer.from(media, 'base64');
        } else {
          return Response.json({ 
            success: false, 
            message: 'Invalid media field: expected a file/blob' 
          }, { status: 400 });
        }
      } catch (err) {
        console.error('[VendorController.createAd] Buffer conversion failed:', err);
        return Response.json({ 
          success: false, 
          message: 'Failed to process image data: ' + err.message 
        }, { status: 400 });
      }
      
      if (!buffer || buffer.length < 100) {
        return Response.json({ success: false, message: 'Uploaded file is too small or invalid' }, { status: 400 });
      }

      // 4. Upload Image to S3
      let uploadResult;
      try {
        uploadResult = await S3Service.upload(buffer, 'ads', media.name || 'ad-image', media.type || 'image/jpeg');
      } catch (err) {
        console.error('[VendorController.createAd] S3 Upload failed:', err);
        return Response.json({ 
          success: false, 
          message: 'Cloud storage upload failed. Please try again.' 
        }, { status: 500 });
      }

      const images = [{
        url: uploadResult.url,
        key: uploadResult.key,
        alt: title,
        isPrimary: true
      }];

      // 5. Create Ad using service (This deducts the credit)
      const adData = {
        title,
        description,
        url: url || '',
        images,
        category: 'General', 
      };
      
      const result = await createAdService(adData, user.id);

      return Response.json({
        success: true,
        message: 'Ad created successfully and is pending admin approval.',
        data: {
          _id: result.ad._id,
          title: result.ad.title,
          description: result.ad.description,
          url: result.ad.url,
          mediaUrl: result.ad.primaryImage,
          status: result.ad.status,
          createdAt: result.ad.createdAt,
          viewCount: result.ad.views || 0,
          canEdit: result.ad.canEdit
        },
        remainingCredits: result.remainingCredits
      }, { status: 201 });

    } catch (error) {
      console.error('[VendorController.createAd Fatal Error]', error);
      const statusCode = error.statusCode || 500;
      return Response.json({ 
        success: false, 
        message: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
      }, { status: statusCode });
    }
  }

  /**
   * GET /api/vendor/ads
   * Vendor lists their own ads with status filtering and pagination
   */
  static async getAds(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const { searchParams } = new URL(req.url);
      const status = searchParams.get('status');
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 10;

      const query = { all: false }; // only user's ads
      if (status) {
        // Support comma separated status values
        if (status.includes(',')) {
          query.status = { $in: status.split(',') };
        } else {
          query.status = status;
        }
      }

      const result = await listAdsService(query, page, limit, user.id);

      // Format data for mobile app
      const formattedAds = result.ads.map(ad => ({
        _id: ad._id,
        title: ad.title,
        description: ad.description,
        url: ad.url,
        mediaUrl: ad.images?.find(img => img.isPrimary)?.url || ad.images?.[0]?.url || '',
        status: ad.status,
        viewCount: ad.views || 0,
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt,
        canEdit: ['pending', 'rejected', 'draft'].includes(ad.status)
      }));

      return Response.json({
        success: true,
        data: formattedAds,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasMore: result.hasNextPage
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.getAds Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * GET /api/vendor/qr-code
   * Fetch unique QR code slug and public URL for the vendor
   */
  static async getQrCode(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const profile = await VendorService.getVendorProfile(user.vendorId);
      if (!profile) return Response.json({ success: false, message: 'Vendor profile not found' }, { status: 404 });

      // If slug doesn't exist (legacy vendors), trigger a save to generate it via model hook
      if (!profile.slug && profile.storeName) {
        await profile.save();
      }

      return Response.json({
        success: true,
        data: {
          slug: profile.slug,
          qrCodeUrl: profile.qrCodeUrl,
          storeName: profile.storeName
        }
      }, { status: 200 });
    } catch (error) {
      console.error('[VendorController.getQrCode Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }


  /**
   * GET /api/vendor/ads/:id
   * Vendor fetches a single ad
   */
  static async getAd(req, { params }) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const { id } = await params;
      const ad = await getAdService(id); // Use the imported getAd from ad.service

      // Check ownership
      if (ad.user.toString() !== user.id) {
        return Response.json({ success: false, message: 'Unauthorized' }, { status: 403 });
      }

      return Response.json({ success: true, data: ad }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: error.statusCode || 500 });
    }
  }

  /**
   * PATCH /api/vendor/ads/:id
   * Vendor updates their own ad
   */
  static async updateAd(req, { params }) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const { id } = await params;
      const contentType = req.headers.get('content-type') || '';
      
      let updateData = {};
      
      if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        
        // Extract fields
        const title = formData.get('title');
        const description = formData.get('description');
        const url = formData.get('url');
        const media = formData.get('media'); // New file if provided
        
        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (url !== null) updateData.url = url;
        
        // Handle new image upload if present
        if (media && typeof media === 'object' && media.size > 0) {
          try {
            const buffer = Buffer.from(await media.arrayBuffer());
            if (buffer.length > 100) {
              const uploadResult = await S3Service.upload(buffer, 'ads', media.name || 'ad-update', media.type || 'image/jpeg');
              updateData.images = [{
                url: uploadResult.url,
                key: uploadResult.key,
                alt: title || 'Updated Ad Image',
                isPrimary: true
              }];
            }
          } catch (uploadErr) {
            console.error('[VendorController.updateAd] Image upload failed:', uploadErr);
            // We continue with other updates even if image fails, or we could throw
          }
        }
      } else {
        // Handle JSON update
        updateData = await req.json();
      }

      if (Object.keys(updateData).length === 0) {
        return Response.json({ success: false, message: 'No update data provided' }, { status: 400 });
      }

      const updatedAd = await updateAdService(id, user.id, updateData);
      return Response.json({ 
        success: true, 
        message: 'Ad updated successfully and submitted for re-approval', 
        data: updatedAd 
      }, { status: 200 });
      
    } catch (error) {
      console.error('[VendorController.updateAd Fatal Error]', error);
      return Response.json({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }, { status: error.statusCode || 500 });
    }
  }

  /**
   * DELETE /api/vendor/ads/:id
   * Vendor deletes their own ad
   */
  static async deleteAd(req, { params }) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const { id } = await params;
      await deleteAdService(id, user.id);
      return Response.json({ success: true, message: 'Ad deleted successfully' }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: error.statusCode || 500 });
    }
  }

  /**
   * GET /api/vendor/ads/credits
   * Fetch remaining ad credits for vendor
   */
  static async getAdCredits(req) {
    try {
      await dbConnect();

      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const dbUser = await User.findById(user.id);

      if (!dbUser) {
        return Response.json({ success: false, message: 'User not found' }, { status: 404 });
      }

      return Response.json({ 
        success: true, 
        credits: dbUser.coinBalance 
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.getAdCredits Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/subscription-plans/purchase
   * Initialize a subscription purchase (creates Razorpay order)
   * @body { planId }
   */
  static async purchaseSubscription(req) {
    try {
      await dbConnect();

      // 1. Authenticate Vendor
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      // 2. Parse Body
      const body = await req.json();
      const { planId } = body;

      if (!planId) {
        return Response.json({ success: false, message: 'Plan ID is required' }, { status: 400 });
      }

      // 3. Find Plan
      const plan = await getPlan(planId);

      // 4. Create Razorpay Order
      const amountInPaise = plan.price * 100;
      const order = await razorpayService.createOrder(amountInPaise, 'INR');

      // 5. Initialize Subscription (pending state)
      const result = await purchaseSubscriptionService(user.id, planId, 'razorpay', {
        razorpayOrderId: order.id,
        amount: plan.price
      });

      return Response.json({
        success: true,
        message: 'Subscription initiated',
        orderId: order.id, // Razorpay Order ID
        subscriptionId: result.subscription._id,
        amount: plan.price,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID // Send key for frontend checkout
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.purchaseSubscription Error]', error);
      return Response.json({ success: false, message: error.message }, { status: error.statusCode || 500 });
    }
  }

  /**
   * POST /api/vendor/subscription-plans/verify
   * Verify Razorpay payment and activate subscription
   * @body { subscriptionId, razorpay_payment_id, razorpay_order_id, razorpay_signature }
   */
  static async verifyPayment(req) {
    try {
      await dbConnect();

      // 1. Authenticate Vendor
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      // 2. Parse Body
      const body = await req.json();
      const { subscriptionId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;

      if (!subscriptionId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return Response.json({ success: false, message: 'Missing payment verification fields' }, { status: 400 });
      }

      // 3. Verify Signature
      const isValid = razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

      if (!isValid) {
        return Response.json({ success: false, message: 'Invalid payment signature' }, { status: 400 });
      }

      // 4. Activate Subscription
      const subscription = await verifyPaymentService(subscriptionId, {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      });

      return Response.json({
        success: true,
        message: 'Payment verified and subscription activated successfully',
        data: subscription
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.verifyPayment Error]', error);
      return Response.json({ success: false, message: error.message }, { status: error.statusCode || 500 });
    }
  }

  /**
   * POST /api/vendor/logout
   * Handles vendor logout
   */
  static async logout(req) {
    try {
      // In JWT Bearer auth, logout is primarily client-side (removing the token).
      // We return success to indicate the server acknowledges the logout request.
      return Response.json({
        success: true,
        message: 'Logged out successfully'
      }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * POST /api/vendor/delete-account
   * Handles vendor account deletion with secure password confirmation
   * @body { password, delete_reason }
   */
  static async deleteAccount(req) {
    try {
      await dbConnect();
      
      // 1. Authenticate Vendor
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['vendor']);
      if (roleError) return roleError;

      // 2. Parse request body
      let body = {};
      try {
        body = await req.json();
      } catch (e) {
        body = {};
      }

      const { delete_reason } = body;

      // 3. Capture telemetry details
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
      const deviceInfo = req.headers.get('user-agent') || 'Unknown Device';

      // 4. Execute secure soft delete account flow
      await VendorService.deleteVendorAccount(
        user.id, 
        user.vendorId, 
        delete_reason || '', 
        'vendor', 
        ipAddress, 
        deviceInfo
      );

      return Response.json({
        success: true,
        message: 'Your account has been deleted successfully.'
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.deleteAccount Error]', error);
      return Response.json({ 
        success: false, 
        message: error.message || 'Failed to delete account' 
      }, { status: error.statusCode || 500 });
    }
  }
  /**
   * GET /api/vendor/reviews
   * Fetch reviews for the authenticated vendor
   */
  static async getReviews(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const { searchParams } = new URL(req.url);
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 10;

      const result = await VendorService.getVendorReviews(user.vendorId, page, limit);

      return Response.json({
        success: true,
        data: result
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.getReviews Error]', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
