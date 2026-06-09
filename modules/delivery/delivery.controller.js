import { dbConnect } from '../../config/database.js';
import { authLimiter, otpLimiter } from '../../middleware/rateLimiter.js';
import { verifyToken } from '../../utils/jwt.js';
import { DeliveryService } from './delivery.service.js';

export class DeliveryController {
  static async listBranches(req) {
    try {
      await dbConnect();
      const { searchParams } = new URL(req.url);
      const search = searchParams.get('search') || '';
      const limit = searchParams.get('limit') || 100;
      const branches = await DeliveryService.listBranches({ search, limit });

      return Response.json(
        {
          success: true,
          message: 'Branches fetched successfully',
          data: {
            branches,
          },
          pagination: null,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[DeliveryController.listBranches Error]', error);
      return Response.json(
        {
          success: false,
          message: 'Failed to fetch branches',
          data: null,
          pagination: null,
        },
        { status: 500 }
      );
    }
  }

  static async register(req) {
    try {
      await dbConnect();
      const body = await req.json().catch(() => ({}));
      const registration = await DeliveryService.register(body);

      return Response.json(
        {
          success: true,
          message: 'Delivery registration submitted successfully',
          data: {
            registration: {
              registrationId: registration._id.toString(),
              fullName: registration.fullName,
              mobileNumber: registration.mobileNumber,
              vehicleType: registration.vehicleType,
              vehicleNumber: registration.vehicleNumber,
              assignedBranch: {
                branchId: registration.assignedBranch.branchId.toString(),
                branchType: registration.assignedBranch.branchType,
                name: registration.assignedBranch.name,
                address: registration.assignedBranch.address,
                phone: registration.assignedBranch.phone,
              },
              status: registration.status,
              createdAt: registration.createdAt,
            },
          },
          pagination: null,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[DeliveryController.register Error]', error);
      const status = error.message.includes('not found') ? 404 : 400;
      return Response.json(
        {
          success: false,
          message: error.message || 'Failed to submit delivery registration',
          data: null,
          pagination: null,
        },
        { status }
      );
    }
  }

  static async checkMobile(req) {
    try {
      await dbConnect();
      const body = await req.json().catch(() => ({}));
      const result = await DeliveryService.checkMobile(body.mobileNumber);
      return Response.json(result, { status: 200 });
    } catch (error) {
      console.error('[DeliveryController.checkMobile Error]', error);
      return Response.json(
        {
          success: false,
          message: error.message || 'Failed to check delivery account',
          data: null,
          pagination: null,
        },
        { status: 400 }
      );
    }
  }

  static async sendOtp(req) {
    try {
      const limitError = await otpLimiter(req);
      if (limitError) return limitError;

      await dbConnect();
      const body = await req.json().catch(() => ({}));
      const result = await DeliveryService.sendOtp(body.mobileNumber);
      return Response.json(result, { status: result.success ? 200 : 404 });
    } catch (error) {
      console.error('[DeliveryController.sendOtp Error]', error);
      return Response.json(
        {
          success: false,
          message: error.message || 'Failed to send OTP',
          data: null,
          pagination: null,
        },
        { status: 400 }
      );
    }
  }

  static async verifyOtp(req) {
    try {
      const limitError = await authLimiter(req);
      if (limitError) return limitError;

      await dbConnect();
      const body = await req.json().catch(() => ({}));
      const { mobileNumber, otp } = body;

      if (!mobileNumber || !otp) {
        return Response.json(
          {
            success: false,
            message: 'Mobile number and OTP are required',
            data: null,
            pagination: null,
          },
          { status: 400 }
        );
      }

      const result = await DeliveryService.verifyOtp(mobileNumber, otp);
      return Response.json(result, { status: result.success ? 200 : 404 });
    } catch (error) {
      console.error('[DeliveryController.verifyOtp Error]', error);
      return Response.json(
        {
          success: false,
          message: error.message || 'Failed to verify OTP',
          data: null,
          pagination: null,
        },
        { status: 401 }
      );
    }
  }

  static async me(req) {
    try {
      await dbConnect();
      const authHeader = req.headers.get('authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        return Response.json(
          {
            success: false,
            message: 'Delivery token required',
            data: null,
            pagination: null,
          },
          { status: 401 }
        );
      }

      let decoded;
      try {
        decoded = verifyToken(authHeader.split(' ')[1]);
      } catch {
        return Response.json(
          {
            success: false,
            message: 'Invalid or expired delivery token',
            data: null,
            pagination: null,
          },
          { status: 401 }
        );
      }

      if (decoded.role !== 'delivery' || !decoded.deliveryId) {
        return Response.json(
          {
            success: false,
            message: 'Delivery token required',
            data: null,
            pagination: null,
          },
          { status: 403 }
        );
      }

      const delivery = await DeliveryService.getProfile(decoded.deliveryId);
      return Response.json(
        {
          success: true,
          message: 'Delivery profile fetched successfully',
          data: { delivery },
          pagination: null,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('[DeliveryController.me Error]', error);
      return Response.json(
        {
          success: false,
          message: error.message || 'Failed to fetch delivery profile',
          data: null,
          pagination: null,
        },
        { status: 400 }
      );
    }
  }
}
