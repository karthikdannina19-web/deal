import User from '@/models/user.model.js';
import Otp from '@/models/otp.model.js';
import { generateOtp } from '@/utils/generateOtp.js';
import { hashData, compareHash } from '@/utils/hash.js';
import { generateToken } from '@/utils/jwt.js';
import { dbConnect } from '@/config/database.js';

export class AuthService {
  /**
   * Send OTP to a vendor's mobile number
   * @param {string} mobileNumber 
   */
  static async sendVendorOtp(mobileNumber) {
    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      throw new Error('Invalid mobile number');
    }

    await dbConnect();

    // 1. Check Rate Limiter (Max 5 OTPs per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let otpRecord = await Otp.findOne({ target: mobileNumber, type: 'phone' });

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
        target: mobileNumber,
        type: 'phone',
        attempts: 1,
      });
    }

    // 2. Determine Role (from User model if exists)
    const user = await User.findOne({ phone: mobileNumber });
    let role = user ? user.role : 'user'; // Default to 'user' for app flow

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
    await dbConnect();
    const user = await User.findOne({ phone: mobileNumber });
    return { exists: !!user };
  }

  /**
   * Register a new user
   * @param {Object} userData 
   */
  static async registerUser(userData) {
    const { fullName, email, mobileNumber, state, district, mandal, referralCode } = userData;

    await dbConnect();

    // 1. Check if user already exists
    const existingUser = await User.findOne({ phone: mobileNumber });
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
      phone: mobileNumber,
      state,
      district,
      mandal,
      role: 'user',
      status: 'pending', // Will become active after OTP verification
      profileCompleted: true // Since they provided all details during registration
    });

    // 4. Handle Referral (Optional)
    if (referralCode) {
       const referrer = await User.findOne({ 
         $or: [{ referralCode }, { phone: referralCode }] 
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
    // 1. Validate Input
    if (!mobileNumber || !/^\d{10}$/.test(mobileNumber)) {
      throw new Error('Invalid mobile number');
    }
    if (!otpCode || !/^\d{4}$/.test(otpCode)) {
      throw new Error('OTP must be 4 digits');
    }

    await dbConnect();

    // 2. Find OTP Record
    const otpRecord = await Otp.findOne({ target: mobileNumber, type: 'phone' });
    
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

    // 4. Find User by phone
    let user = await User.findOne({ phone: mobileNumber });
    let isNewUser = false;

    if (user) {
      // CASE A: User Exists
      user.phoneVerified = true;
      if (user.status === 'pending') {
        user.status = 'active';
      }
      await user.save();
    } else {
      // CASE B: User Does Not Exist (Legacy / Auto-register)
      // Note: In the new flow, checkUser prevents getting here without registration,
      // but we keep this for backward compatibility or direct API calls.
      isNewUser = true;
      user = new User({
        phone: mobileNumber,
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
        mobileNumber: user.phone,
        role: user.role,
        isVerified: user.phoneVerified,
        profileCompleted: true // Forced to true to bypass profile setup screen in the app
      }
    };
  }
}
