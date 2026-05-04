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

      // 3. Robust Parser Selection
      // If header is correct, we call formData() directly to avoid stream consumption issues.
      // If header is NOT multipart (e.g. application/json), we peek at the buffer to catch hidden multiparts.
      const isMultipartHeader = contentType.includes('multipart/form-data');
      console.log(`[DEBUG] Content-Type Header: ${contentType}`);

      if (isMultipartHeader) {
        try {
          console.log(`[DEBUG] Branch: Native Multipart`);
          const formData = await req.formData();
          fullName = formData.get('fullName');
          email = formData.get('email');
          profileImage = formData.get('profileImage');
        } catch (err) {
          console.error('[DEBUG] Native formData() failed:', err);
          return Response.json({ success: false, message: 'Invalid multipart data' }, { status: 400 });
        }
      } else {
        try {
          console.log(`[DEBUG] Branch: Buffer Fallback (Header was not multipart)`);
          const arrayBuffer = await req.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 0 && buffer[0] === 45) { // ASCII 45 is '-'
            console.log(`[DEBUG] Detected hidden multipart in JSON-tagged request`);
            
            // Extract boundary from the first line
            let actualBoundary = '';
            let boundaryEnd = 0;
            for (let i = 0; i < 200 && i < buffer.length; i++) {
              if (buffer[i] === 13 && buffer[i+1] === 10) { boundaryEnd = i; break; }
            }
            if (boundaryEnd > 2) {
              actualBoundary = new TextDecoder().decode(buffer.subarray(2, boundaryEnd));
            }

            const newHeaders = new Headers(req.headers);
            if (actualBoundary) {
              newHeaders.set('content-type', `multipart/form-data; boundary=${actualBoundary}`);
            }

            const parsedReq = new Request(req.url, {
              method: req.method,
              headers: newHeaders,
              body: buffer,
              duplex: 'half'
            });

            const formData = await parsedReq.formData();
            fullName = formData.get('fullName');
            email = formData.get('email');
            profileImage = formData.get('profileImage');
          } else {
            console.log(`[DEBUG] Parsing as standard JSON`);
            const body = JSON.parse(new TextDecoder().decode(buffer));
            fullName = body.fullName;
            email = body.email;
            profileImage = body.profileImage; // Might be a string URL or null
          }
        } catch (err) {
          console.error('[DEBUG] Fallback parsing failed:', err);
          return Response.json({ 
            success: false, 
            message: 'Invalid request body format. Ensure Content-Type is correct.' 
          }, { status: 400 });
        }
      }

      // 4. Common Processing Logic
      updateData = { fullName, email, profileImage };
      console.log(`[DEBUG] Extracted Data:`, { fullName, email, profileImagePresent: !!profileImage });

      // Handle image upload if it's a file object
      if (profileImage && typeof profileImage !== 'string' && profileImage.name) {
        try {
          const uploadResult = await S3Service.upload(profileImage, 'profiles');
          updateData.profileImage = uploadResult.url;
          console.log(`[DEBUG] S3 Upload Success: ${updateData.profileImage}`);
        } catch (uploadError) {
          console.error('[DEBUG] S3 Upload Error:', uploadError);
          return Response.json({ success: false, message: 'Failed to upload profile image' }, { status: 500 });
        }
      } else if (typeof profileImage === 'string' && profileImage.startsWith('http')) {
        console.log(`[DEBUG] Using existing image URL`);
      } else {
        delete updateData.profileImage;
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
