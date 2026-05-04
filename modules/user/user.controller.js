import { UserService } from '@/modules/user/user.service.js';
import { authenticate, authorize } from '@/middleware/auth.middleware.js';
import { dbConnect } from '@/config/database.js';
import { S3Service } from '@/services/s3.service.js';

/**
 * User Controller
 * Orchestrates user-specific requests
 */
export class UserController {
  /**
   * GET /api/user/profile
   * Fetches profile details for the currently logged-in user
   * @param {Request} req - The incoming Next.js request
   */
  static async getProfile(req) {
    try {
      // Ensure database connectivity
      await dbConnect();

      // 1. Authentication Layer (JWT)
      const { user: authUser, error: authError } = await authenticate(req);
      if (authError) return authError;

      // 2. Authorization Layer (Role Check)
      // Both standard users and vendors are allowed to view their user-level profile
      const roleError = authorize(authUser, ['user', 'vendor']);
      if (roleError) return roleError;

      // 3. Business Logic Layer
      const user = await UserService.getUserProfile(authUser.id);
      
      if (!user) {
        return Response.json({ 
          success: false, 
          message: 'User account not found' 
        }, { status: 404 });
      }

      // 4. Response Mapping (Data Transformation)
      // We map the database internal fields to the requested public API contract
      return Response.json({
        success: true,
        user: {
          userId: user._id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
          email: user.email || '',
          profileImage: user.profileImage || '',
          mobileNumber: user.phone || '',
          referralCode: user.referralCode || '',
          coinsBalance: user.coinBalance || 0,
          joinedAt: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : ''
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[UserController.getProfile Error]', error);
      
      return Response.json({ 
        success: false, 
        message: 'Internal server error occurred while fetching profile' 
      }, { status: 500 });
    }
  }

  /**
   * PUT /api/user/update-profile
   * Updates basic user info (Name, Email, Image)
   * @param {Request} req 
   */
  static async updateProfile(req) {
    try {
      await dbConnect();

      // 1. Logging for backend debugging (requested by user)
      const contentType = req.headers.get('content-type') || '';
      console.log(`[DEBUG] Update Profile Request Headers:`);
      console.log(` - content-type: ${contentType}`);

      // 2. Authenticate
      const { user: authUser, error: authError } = await authenticate(req);
      if (authError) {
        console.warn('[DEBUG] Authentication failed for update-profile');
        return authError;
      }

      let updateData = {};
      let fullName, email, profileImage;

      // 3. Robust Parsing based on Content-Type
      // We prioritize req.formData() for multipart/form-data as it is the "real" parser in Next.js App Router
      if (contentType.includes('multipart/form-data')) {
        try {
          const formData = await req.formData();
          
          fullName = formData.get('fullName');
          email = formData.get('email');
          profileImage = formData.get('profileImage'); // Can be a File object or string

          console.log(`[DEBUG] Multipart parse results:`);
          console.log(` - fullName: ${fullName}`);
          console.log(` - email: ${email}`);
          console.log(` - profileImage present: ${!!profileImage}`);
          if (profileImage && typeof profileImage !== 'string') {
            console.log(` - profileImage type: ${profileImage.type}, size: ${profileImage.size}`);
          }

          updateData = { fullName, email, profileImage };

          // Handle image upload if it's a file
          if (profileImage && typeof profileImage !== 'string' && profileImage.name) {
            const uploadResult = await S3Service.upload(profileImage, 'profiles');
            updateData.profileImage = uploadResult.url;
            console.log(`[DEBUG] Profile image uploaded to S3: ${updateData.profileImage}`);
          } else if (typeof profileImage === 'string' && profileImage.startsWith('http')) {
            // Keep existing URL if passed as string
            console.log(`[DEBUG] Using existing profile image URL`);
          } else {
            // No new image or invalid format
            delete updateData.profileImage;
          }
        } catch (formDataError) {
          console.error('[DEBUG] req.formData() failed:', formDataError);
          return Response.json({ 
            success: false, 
            message: 'Failed to parse multipart data. Ensure the boundary is correct.' 
          }, { status: 400 });
        }
      } else {
        // Assume JSON if not multipart
        try {
          const body = await req.json();
          fullName = body.fullName;
          email = body.email;
          
          console.log(`[DEBUG] JSON parse results:`, body);
          updateData = { fullName, email };
        } catch (jsonError) {
          console.error(`[DEBUG] JSON parse failed:`, jsonError);
          return Response.json({ 
            success: false, 
            message: 'Invalid JSON body. For image uploads, use multipart/form-data.' 
          }, { status: 400 });
        }
      }

      // 3. Update (Mobile number is NOT passed here, ensuring it cannot be changed)
      const updatedUser = await UserService.updateProfile(authUser.id, updateData);

      return Response.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          name: `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim(),
          email: updatedUser.email,
          profileImage: updatedUser.profileImage,
          profileCompleted: updatedUser.profileCompleted
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[UserController.updateProfile Error]', error);
      return Response.json({ 
        success: false, 
        message: error.message || 'Internal server error' 
      }, { status: 500 });
    }
  }

  /**
   * POST /api/user/apply-referral
   * Validates and applies a referral code to reward both the referrer and the new user.
   * @param {Request} req - The incoming Next.js request containing the referral code in the body.
   */
  static async applyReferral(req) {
    try {
      // Ensure database connectivity
      await dbConnect();

      // 1. Security check: Must be a logged-in user
      const { user: authUser, error: authError } = await authenticate(req);
      if (authError) return authError;

      // 2. Access control: Only 'user' role can apply referrals
      const roleError = authorize(authUser, ['user']);
      if (roleError) return roleError;

      // 3. Input validation
      let referralCode, deviceId;
      try {
        const body = await req.json();
        referralCode = body.referralCode;
        deviceId = body.deviceId;
      } catch (err) {
        return Response.json({ 
          success: false, 
          message: 'Invalid request body' 
        }, { status: 400 });
      }

      if (!referralCode) {
        return Response.json({ 
          success: false, 
          message: 'Referral code is required' 
        }, { status: 400 });
      }

      // Extract IP Address
      const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

      // 4. Invoke Service (Transactional)
      const reward = await UserService.applyReferral(authUser.id, referralCode, { deviceId, ipAddress });

      // 5. Build and return success response
      return Response.json({
        success: true,
        message: 'Referral applied successfully',
        reward: {
          referrerCoins: reward.referrerCoins,
          newUserCoins: reward.newUserCoins
        }
      }, { status: 200 });

    } catch (error) {
      console.error('[UserController.applyReferral Error]', error);

      // Handle specific business logic failures gracefully
      const badRequestMessages = [
        'User account not found',
        'Referral code already applied for this account',
        'The provided referral code is invalid',
        'You cannot refer yourself'
      ];

      if (badRequestMessages.includes(error.message)) {
        return Response.json({ 
          success: false, 
          message: error.message 
        }, { status: 400 });
      }

      // Standard error response for unexpected failures
      return Response.json({ 
        success: false, 
        message: 'Unable to apply referral at this time' 
      }, { status: 500 });
    }
  }
}
