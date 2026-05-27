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
   * Handles multipart form data with file uploads securely
   * @param {Request} req 
   */
  static async updateProfile(req) {
    try {
      await dbConnect();

      // 1. Logging for backend debugging
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
      const isMultipartHeader = contentType.includes('multipart/form-data');
      console.log(`[DEBUG] Content-Type Header: ${contentType}`);

      if (isMultipartHeader) {
        try {
          console.log(`[DEBUG] Branch: Native Multipart`);
          const formData = await req.formData();
          fullName = formData.get('fullName');
          email = formData.get('email');
          profileImage = formData.get('profileImage');
          
          console.log(`[DEBUG] Extracted from formData:`, {
            fullName,
            email,
            hasProfileImage: !!profileImage,
            profileImageName: profileImage?.name,
            profileImageSize: profileImage?.size,
            profileImageType: profileImage?.type
          });
        } catch (err) {
          console.error('[DEBUG] Native formData() failed:', err.message);
          return Response.json({ 
            success: false, 
            message: 'Invalid multipart data format',
            error: err.message
          }, { status: 400 });
        }
      } else {
        try {
          console.log(`[DEBUG] Branch: Buffer Fallback (Header was not multipart)`);
          const arrayBuffer = await req.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          if (buffer.length > 0 && buffer[0] === 45) { // ASCII 45 is '-' (multipart boundary)
            console.log(`[DEBUG] Detected multipart boundary in buffer, re-parsing as multipart`);
            
            // Extract boundary from the first line
            let actualBoundary = '';
            let boundaryEnd = 0;
            for (let i = 0; i < 200 && i < buffer.length; i++) {
              if (buffer[i] === 13 && buffer[i+1] === 10) { // \r\n
                boundaryEnd = i;
                break;
              }
            }
            if (boundaryEnd > 2) {
              actualBoundary = new TextDecoder().decode(buffer.subarray(2, boundaryEnd));
            }

            const newHeaders = new Headers(req.headers);
            if (actualBoundary) {
              newHeaders.set('content-type', `multipart/form-data; boundary=${actualBoundary}`);
              console.log(`[DEBUG] Set corrected content-type with boundary: ${actualBoundary}`);
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
            console.log(`[DEBUG] Extracted from corrected formData`);
          } else {
            console.log(`[DEBUG] Parsing as JSON`);
            const body = JSON.parse(new TextDecoder().decode(buffer));
            fullName = body.fullName;
            email = body.email;
            profileImage = body.profileImage;
          }
        } catch (err) {
          console.error('[DEBUG] Buffer parsing failed:', err.message, err.stack);
          return Response.json({ 
            success: false, 
            message: 'Invalid request body format. Ensure Content-Type header is correct.',
            error: err.message
          }, { status: 400 });
        }
      }

      // 4. Input Validation
      if (!fullName || !fullName.trim()) {
        return Response.json({
          success: false,
          message: 'Full name is required'
        }, { status: 400 });
      }

      if (!email || !email.includes('@')) {
        return Response.json({
          success: false,
          message: 'Valid email is required'
        }, { status: 400 });
      }

      updateData = { fullName: fullName.trim(), email: email.trim() };
      console.log(`[DEBUG] Extracted Data:`, { 
        fullName: updateData.fullName, 
        email: updateData.email,
        profileImagePresent: !!profileImage,
        profileImageType: typeof profileImage
      });

      // 5. Handle image upload if it's a file object
      if (profileImage) {
        if (typeof profileImage === 'string') {
          // If it's a URL, keep it as is
          if (profileImage.startsWith('http')) {
            console.log(`[DEBUG] Using existing image URL`);
            updateData.profileImage = profileImage;
          } else {
            console.log(`[DEBUG] Ignoring non-URL string for profileImage`);
          }
        } else if (profileImage && profileImage.name && profileImage.size > 0) {
          // It's a file object, upload it
          try {
            console.log(`[DEBUG] Uploading profile image to S3...`);
            const uploadResult = await S3Service.upload(profileImage, 'profiles');
            updateData.profileImage = uploadResult.url;
            console.log(`[DEBUG] S3 Upload Success: ${updateData.profileImage}`);
          } catch (uploadError) {
            console.error('[DEBUG] S3 Upload Error:', {
              message: uploadError.message,
              stack: uploadError.stack,
              fileName: profileImage.name,
              fileSize: profileImage.size
            });
            
            return Response.json({ 
              success: false, 
              message: `Failed to upload profile image: ${uploadError.message}`,
              error: uploadError.message
            }, { status: 500 });
          }
        } else {
          console.log(`[DEBUG] profileImage present but not valid:`, {
            type: typeof profileImage,
            hasName: profileImage?.name,
            hasSize: profileImage?.size,
            size: profileImage?.size
          });
        }
      }

      // 6. Update user profile in database
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
      console.error('[UserController.updateProfile Error]', {
        message: error.message,
        stack: error.stack
      });
      
      return Response.json({ 
        success: false, 
        message: 'Failed to update profile: ' + (error.message || 'Internal server error'),
        error: error.message
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

  /**
   * GET /api/user/location
   * Fetches the saved location for the authenticated user
   */
  static async getLocation(req) {
    try {
      await dbConnect();
      const { user: authUser, error: authError } = await authenticate(req);
      if (authError) return authError;

      const user = await UserService.getUserProfile(authUser.id);
      
      // Re-fetch to include location if getUserProfile doesn't include it by default
      // Actually, let's just use the model directly here or update getUserProfile
      const fullUser = await UserService.getUserProfile(authUser.id); 
      // UserService.getUserProfile currently selects specific fields. 
      // I'll add location to the selection there or fetch it here.
      
      // Let's check user.service.js again to see if I should update getUserProfile selection.
      // Lines 18-19: .select('firstName lastName email profileImage phone referralCode coinBalance createdAt')
      // I'll update it later. For now, let's fetch it here.
      
      const User = (await import('@/models/user.model.js')).default;
      const userData = await User.findById(authUser.id).select('location stateId districtId mandalId');

      return Response.json({
        success: true,
        location: userData?.location || null,
        locationIds: userData ? {
          stateId: userData.stateId || null,
          districtId: userData.districtId || null,
          mandalId: userData.mandalId || null,
        } : null
      }, { status: 200 });

    } catch (error) {
      console.error('[UserController.getLocation Error]', error);
      return Response.json({ success: false, message: 'Failed to fetch location' }, { status: 500 });
    }
  }

  /**
   * PUT /api/user/location
   * Saves or updates the user's current GPS location and address
   */
  static async saveLocation(req) {
    try {
      await dbConnect();
      const { user: authUser, error: authError } = await authenticate(req);
      if (authError) return authError;

      let body;
      try {
        body = await req.json();
      } catch (err) {
        return Response.json({ success: false, message: 'Invalid JSON body' }, { status: 400 });
      }

      const { latitude, longitude, accuracy, label, addressLine, area, city, district, state, mandal, pincode, stateId, districtId, mandalId } = body;
      const hasCoordinates = latitude !== undefined && longitude !== undefined;
      const hasLocationIds = !!(stateId && districtId && mandalId);
      const hasLocationNames = !!(state && district && mandal);

      if (!hasCoordinates && !hasLocationIds && !hasLocationNames) {
        return Response.json({
          success: false,
          message: 'Provide either latitude/longitude or state, district, and mandal'
        }, { status: 400 });
      }

      if ((latitude !== undefined && !Number.isFinite(Number(latitude))) || (longitude !== undefined && !Number.isFinite(Number(longitude)))) {
        return Response.json({ success: false, message: 'Latitude and longitude must be valid numbers' }, { status: 400 });
      }

      const shouldResolve = hasCoordinates && (!hasLocationIds || !hasLocationNames);
      let savedLocation;
      let resolvedLocation = null;

      if (shouldResolve) {
        const resolved = await UserService.resolveAndSaveLocation(authUser.id, { latitude, longitude, accuracy });
        resolvedLocation = {
          state: { id: resolved.state._id, name: resolved.state.name },
          district: { id: resolved.district._id, name: resolved.district.name },
          mandal: { id: resolved.mandal._id, name: resolved.mandal.name },
        };
        const User = (await import('@/models/user.model.js')).default;
        const refreshed = await User.findById(authUser.id).select('location');
        savedLocation = refreshed?.location || null;
      } else {
        const locationData = {
          latitude: hasCoordinates ? Number(latitude) : undefined,
          longitude: hasCoordinates ? Number(longitude) : undefined,
          accuracy,
          label,
          addressLine,
          area,
          city,
          pincode,
        };
        const normalizedLocation = await UserService.normalizeLocationSelection({
          state,
          district,
          mandal,
          stateId,
          districtId,
          mandalId,
        });
        Object.assign(locationData, normalizedLocation);
        savedLocation = await UserService.saveLocation(authUser.id, locationData);
        resolvedLocation = {
          state: { id: normalizedLocation.stateId, name: normalizedLocation.state },
          district: { id: normalizedLocation.districtId, name: normalizedLocation.district },
          mandal: { id: normalizedLocation.mandalId, name: normalizedLocation.mandal },
        };
      }

      return Response.json({
        success: true,
        message: 'Location saved successfully',
        location: savedLocation,
        resolvedLocation
      }, { status: 200 });

    } catch (error) {
      console.error('[UserController.saveLocation Error]', error);
      return Response.json({ success: false, message: 'Failed to save location' }, { status: 500 });
    }
  }

  /**
   * POST /api/user/delete-account
   * Handles standard user account deletion
   */
  static async deleteAccount(req) {
    try {
      await dbConnect();
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      // Both users and vendors can delete their accounts here if they use the user app
      await UserService.deleteUserAccount(user.id);

      return Response.json({
        success: true,
        message: 'Your account has been deleted successfully.'
      }, { status: 200 });

    } catch (error) {
      console.error('[UserController.deleteAccount Error]', error);
      return Response.json({ 
        success: false, 
        message: error.message || 'Failed to delete account' 
      }, { status: 500 });
    }
  }
}
