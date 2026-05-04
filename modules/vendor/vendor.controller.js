import { VendorService } from './vendor.service.js';
import { apiError, apiSuccess } from '../../utils/errorHandler.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { dbConnect } from '../../config/database.js';
import { S3Service } from '../../services/s3.service.js';
import { FileValidator } from '../../utils/fileValidator.js';
import { generateToken } from '../../utils/jwt.js';

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
        state, district, mandal, thumbnailUrl, bannerUrl 
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
        bannerUrl
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
   * POST /api/vendor/store/create
   * Vendor Creates Store
   * AUTH: Vendor Token Required
   */
  static async createStore(req) {
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

      // 3. Create Store
      const vendor = await VendorService.createStore(user.id, body);

      return Response.json({
        success: true,
        message: 'Store created successfully',
        storeId: vendor._id,
        status: vendor.status
      }, { status: 200 });

    } catch (error) {
      console.error('[VendorController.createStore Error]', error);
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
      return Response.json({
        success: true,
        exists: result.exists,
        vendorId: result.vendorId || null,
        status: result.status || null,
        message: result.exists ? 'Vendor found' : 'Vendor not found - please register'
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
      }, { status: 400 });
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
}
