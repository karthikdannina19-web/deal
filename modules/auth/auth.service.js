import User from '@/models/user.model.js';
import Otp from '@/models/otp.model.js';
import { generateOtp } from '@/utils/generateOtp.js';
import { hashData, compareHash } from '@/utils/hash.js';
import { generateToken } from '@/utils/jwt.js';
import { dbConnect } from '@/config/database.js';
import { ReferralsService } from '@/modules/referrals/referrals.service.js';

function normalizeMobileNumber(mobileNumber) {
  const digits = String(mobileNumber || '').replace(/\D/g, '');
  if (/^[0-9]{10}$/.test(digits)) return digits;
  if (/^91[0-9]{10}$/.test(digits)) return digits.slice(-10);
  if (/^0[0-9]{10}$/.test(digits)) return digits.slice(-10);
  return digits;
}

export class AuthService {
  /**
   * Send OTP to a vendor's mobile number
   * @param {string} mobileNumber 
   */
  static async sendVendorOtp(mobileNumber) {
    const normalizedPhone = normalizeMobileNumber(mobileNumber);
    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      throw new Error('Invalid mobile number');
    }

    await dbConnect();

    // 1. Check Rate Limiter (Max 5 OTPs per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let otpRecord = await Otp.findOne({ target: normalizedPhone, type: 'phone' });

    if (otpRecord) {
      if (otpRecord.updatedAt >= oneHourAgo) {
        if (otpRecord.attempts >= 5) {
          throw new Error('Rate limit exceeded. Please try again after an hour.');
        }
        otpRecord.attempts += 1;
      } else {
        otpRecord.attempts = 1;
      }
    } else {
      otpRecord = new Otp({
        target: normalizedPhone,
        type: 'phone',
        attempts: 1,
      });
    }

    // 2. Determine Role (from User model if exists)
    const user = await User.findOne({ phone: normalizedPhone, status: { $ne: 'deleted' } });
    if (!user) {
      throw new Error('Account not found. Please register.');
    }
    let role = user.role;

    // 3. Generate and Hash OTP
    const plainOtp = "1234"; // Hardcoded to 1234 for now as per user request
    const hashedOtp = await hashData(plainOtp);

    // 4. Update the DB record (5 min expiry)
    otpRecord.code = hashedOtp;
    otpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    otpRecord.isVerified = false;
    
    await otpRecord.save();

    // 5. Simulate sending OTP
    console.log(`[SIMULATION] Sending OTP ${plainOtp} to mobile number ${mobileNumber}`);

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  /**
   * Check if user exists by mobile number
   * @param {string} mobileNumber 
   */
  static async checkUser(mobileNumber) {
    const normalizedPhone = normalizeMobileNumber(mobileNumber);
    await dbConnect();
    const user = await User.findOne({ phone: normalizedPhone, status: { $ne: 'deleted' } });
    return { exists: !!user };
  }

  /**
   * Register a new user
   * @param {Object} userData 
   */
  static async registerUser(userData) {
    const { fullName, email, mobileNumber, state, district, mandal, referralCode, profileImage } = userData;
    const effectiveReferralCode = referralCode?.trim() || userData.ref?.trim() || userData.referrerCode?.trim() || userData.code?.trim();
    const normalizedPhone = normalizeMobileNumber(mobileNumber);

    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      throw new Error('Invalid mobile number');
    }

    await dbConnect();

    // 1. Check if user already exists
    const existingUser = await User.findOne({ phone: normalizedPhone, status: { $ne: 'deleted' } });
    if (existingUser) {
      throw new Error('User already exists with this mobile number');
    }

    // 2. Parse name
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // 3. Create User in pending status
    const user = new User({
      firstName,
      lastName,
      email,
      phone: normalizedPhone,
      state,
      district,
      mandal,
      profileImage: profileImage || '', // Optional profile picture
      role: 'user',
      status: 'pending', // Will become active after OTP verification
      profileCompleted: true // Since they provided all details during registration
    });

    // 4. Handle Referral (Optional)
    if (effectiveReferralCode) {
       const referrer = await User.findOne({ 
         $or: [{ referralCode: effectiveReferralCode }, { phone: effectiveReferralCode }] 
       });
       if (referrer) {
         user.referredBy = referrer._id;
       }
    }

    await user.save();

    // 5. Automatically trigger Send OTP for the new user
    await this.sendVendorOtp(mobileNumber);

    return {
      success: true,
      message: 'Registration successful. OTP has been sent to your mobile number.'
    };
  }

  /**
   * Verify OTP and Login/Register
   * @param {string} mobileNumber
   * @param {string} otpCode
   */
  static async verifyVendorOtp(mobileNumber, otpCode) {
    const normalizedPhone = normalizeMobileNumber(mobileNumber);
    // 1. Validate Input
    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      throw new Error('Invalid mobile number');
    }
    if (!otpCode || !/^\d{4}$/.test(otpCode)) {
      throw new Error('OTP must be 4 digits');
    }

    await dbConnect();

    // 2. Find OTP Record
    const otpRecord = await Otp.findOne({ target: normalizedPhone, type: 'phone' });
    
    if (!otpRecord) {
      throw new Error('Invalid or expired OTP');
    }

    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new Error('Invalid or expired OTP');
    }

    // 3. Compare OTP
    const isMatch = await compareHash(otpCode, otpRecord.code);
    
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      
      if (otpRecord.attempts > 5) {
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }
      throw new Error('Invalid or expired OTP');
    }

    // 4. Find User by phone (ignore deleted accounts)
    let user = await User.findOne({ phone: normalizedPhone, status: { $ne: 'deleted' } });
    let isNewUser = false;

    if (user) {
      // CASE A: User Exists
      const wasPending = user.status === 'pending';
      user.phoneVerified = true;
      if (user.status === 'pending') {
        user.status = 'active';
      }
      await user.save();

      if (wasPending && user.referredBy && !user.referralUsed) {
        try {
          await ReferralsService.handleReferralSignup(user._id, { referrerId: user.referredBy });
        } catch (err) {
          console.warn('[Referral Signup] Failed to apply referral after OTP verification:', err.message);
        }
      }
    } else {
      // CASE B: User Does Not Exist (Legacy / Auto-register)
      // Note: In the new flow, checkUser prevents getting here without registration,
      // but we keep this for backward compatibility or direct API calls.
      isNewUser = true;
      user = new User({
        phone: normalizedPhone,
        role: 'user',
        phoneVerified: true,
        status: 'active'
      });
      await user.save();
    }

    // 5. Generate JWT Token
    const jwtPayload = {
      userId: user._id.toString(),
      role: user.role,
      mobileNumber: user.phone
    };
    const token = generateToken(jwtPayload);

    // 6. Delete OTP After Success
    await Otp.deleteOne({ _id: otpRecord._id });

    return {
      success: true,
      message: isNewUser ? 'Registration successful' : 'Login successful',
      isNewUser,
      token,
      user: {
        _id: user._id.toString(),
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        mobileNumber: user.phone,
        state: user.state || '',
        district: user.district || '',
        mandal: user.mandal || '',
        profileImage: user.profileImage || '',
        role: user.role,
        isVerified: user.phoneVerified,
        coinBalance: user.coinBalance || 0,
        profileCompleted: true 
      }
    };
  }
}
