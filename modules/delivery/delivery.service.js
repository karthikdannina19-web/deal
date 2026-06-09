import mongoose from 'mongoose';
import DeliveryRegistration from '../../models/deliveryRegistration.model.js';
import Otp from '../../models/otp.model.js';
import Store from '../../models/store.model.js';
import Vendor from '../../models/vendor.model.js';
import { compareHash, hashData } from '../../utils/hash.js';
import { generateToken } from '../../utils/jwt.js';

const VALID_VEHICLE_TYPES = new Set(['bike', 'scooter', 'auto', 'car', 'van', 'cycle', 'other']);

function normalizeSpaces(value = '') {
  return String(value).trim().replace(/\s+/g, ' ');
}

function normalizeMobile(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (/^[0-9]{10}$/.test(digits)) return digits;
  if (/^91[0-9]{10}$/.test(digits)) return digits.slice(-10);
  if (/^0[0-9]{10}$/.test(digits)) return digits.slice(-10);
  return digits;
}

function normalizeVehicleNumber(value = '') {
  return normalizeSpaces(value).toUpperCase();
}

function buildAddress(parts = []) {
  return parts.filter(Boolean).map(normalizeSpaces).filter(Boolean).join(', ');
}

function formatStoreBranch(store) {
  const address = normalizeSpaces(store.address) || buildAddress([store.mandal, store.district, store.state]);

  return {
    branchId: store._id.toString(),
    branchType: 'store',
    name: store.businessName || 'Unnamed Branch',
    phone: store.phone || '',
    address,
    state: store.state || '',
    district: store.district || '',
    mandal: store.mandal || '',
    status: store.status || '',
    vendorId: store.vendorId?.toString() || null,
  };
}

function formatVendorBranch(vendor) {
  const address =
    normalizeSpaces(vendor.fullAddress) ||
    buildAddress([vendor.location?.mandal, vendor.location?.district, vendor.location?.state]);

  return {
    branchId: vendor._id.toString(),
    branchType: 'vendor',
    name: vendor.storeName || vendor.fullName || 'Unnamed Branch',
    phone: vendor.mobileNumber || '',
    address,
    state: vendor.location?.state || '',
    district: vendor.location?.district || '',
    mandal: vendor.location?.mandal || '',
    status: vendor.status || '',
    vendorId: vendor._id.toString(),
  };
}

function sortBranches(branches) {
  return branches.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) return nameCompare;
    return a.address.localeCompare(b.address);
  });
}

function getDeliveryOtpTarget(mobileNumber) {
  return `delivery:${mobileNumber}`;
}

function formatDeliveryProfile(delivery) {
  return {
    deliveryId: delivery._id.toString(),
    fullName: delivery.fullName,
    mobileNumber: delivery.mobileNumber,
    vehicleType: delivery.vehicleType,
    vehicleNumber: delivery.vehicleNumber,
    assignedBranch: {
      branchId: delivery.assignedBranch.branchId.toString(),
      branchType: delivery.assignedBranch.branchType,
      name: delivery.assignedBranch.name,
      address: delivery.assignedBranch.address || '',
      phone: delivery.assignedBranch.phone || '',
    },
    status: delivery.status,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
  };
}

export class DeliveryService {
  static async listBranches({ search = '', limit = 100 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 250);
    const trimmedSearch = normalizeSpaces(search);
    const textFilter = trimmedSearch
      ? {
          $or: [
            { businessName: { $regex: trimmedSearch, $options: 'i' } },
            { storeName: { $regex: trimmedSearch, $options: 'i' } },
            { fullAddress: { $regex: trimmedSearch, $options: 'i' } },
            { address: { $regex: trimmedSearch, $options: 'i' } },
            { district: { $regex: trimmedSearch, $options: 'i' } },
          ],
        }
      : {};

    const [stores, vendors] = await Promise.all([
      Store.find({
        status: { $ne: 'rejected' },
        ...(trimmedSearch
          ? {
              $or: [
                { businessName: { $regex: trimmedSearch, $options: 'i' } },
                { address: { $regex: trimmedSearch, $options: 'i' } },
                { district: { $regex: trimmedSearch, $options: 'i' } },
                { mandal: { $regex: trimmedSearch, $options: 'i' } },
                { state: { $regex: trimmedSearch, $options: 'i' } },
              ],
            }
          : {}),
      })
        .select('_id vendorId businessName phone address state district mandal status')
        .limit(safeLimit)
        .lean(),
      Vendor.find({
        status: { $ne: 'deleted' },
        is_deleted: { $ne: true },
        account_status: { $ne: 'DELETED' },
        storeName: { $exists: true, $ne: '' },
        ...textFilter,
      })
        .select('_id storeName fullName mobileNumber fullAddress location status')
        .limit(safeLimit)
        .lean(),
    ]);

    const branchesByKey = new Map();

    for (const branch of stores.map(formatStoreBranch)) {
      branchesByKey.set(`${branch.branchType}:${branch.branchId}`, branch);
    }

    for (const branch of vendors.map(formatVendorBranch)) {
      branchesByKey.set(`${branch.branchType}:${branch.branchId}`, branch);
    }

    return sortBranches([...branchesByKey.values()]).slice(0, safeLimit);
  }

  static async resolveBranch(branchId, branchType) {
    if (!mongoose.Types.ObjectId.isValid(branchId)) {
      throw new Error('Invalid assigned branch');
    }

    if (branchType === 'store') {
      const store = await Store.findOne({ _id: branchId, status: { $ne: 'rejected' } })
        .select('_id vendorId businessName phone address state district mandal status')
        .lean();
      if (!store) throw new Error('Assigned branch not found');
      return formatStoreBranch(store);
    }

    if (branchType === 'vendor') {
      const vendor = await Vendor.findOne({
        _id: branchId,
        status: { $ne: 'deleted' },
        is_deleted: { $ne: true },
        account_status: { $ne: 'DELETED' },
      })
        .select('_id storeName fullName mobileNumber fullAddress location status')
        .lean();
      if (!vendor) throw new Error('Assigned branch not found');
      return formatVendorBranch(vendor);
    }

    throw new Error('Invalid assigned branch type');
  }

  static validateRegistrationPayload(body = {}) {
    const fullName = normalizeSpaces(body.fullName);
    const mobileNumber = normalizeMobile(body.mobileNumber);
    const vehicleType = normalizeSpaces(body.vehicleType).toLowerCase();
    const vehicleNumber = normalizeVehicleNumber(body.vehicleNumber);
    const assignedBranchId = normalizeSpaces(body.assignedBranchId || body.branchId);
    const assignedBranchType = normalizeSpaces(body.assignedBranchType || body.branchType).toLowerCase();

    if (!fullName || fullName.length < 2) throw new Error('Full name is required');
    if (!/^\+?[0-9]{10,15}$/.test(mobileNumber)) throw new Error('Valid mobile number is required');
    if (!VALID_VEHICLE_TYPES.has(vehicleType)) throw new Error('Valid vehicle type is required');
    if (!vehicleNumber || vehicleNumber.length < 4) throw new Error('Vehicle number is required');
    if (!assignedBranchId || !assignedBranchType) throw new Error('Assigned branch is required');

    return {
      fullName,
      mobileNumber,
      vehicleType,
      vehicleNumber,
      assignedBranchId,
      assignedBranchType,
    };
  }

  static async register(body = {}) {
    const payload = this.validateRegistrationPayload(body);
    const branch = await this.resolveBranch(payload.assignedBranchId, payload.assignedBranchType);

    const existingRegistration = await DeliveryRegistration.findOne({
      mobileNumber: payload.mobileNumber,
      status: { $nin: ['rejected', 'inactive'] },
    });

    if (existingRegistration) {
      existingRegistration.fullName = payload.fullName;
      existingRegistration.vehicleType = payload.vehicleType;
      existingRegistration.vehicleNumber = payload.vehicleNumber;
      existingRegistration.assignedBranch = {
        branchId: branch.branchId,
        branchType: branch.branchType,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      };
      await existingRegistration.save();
      return existingRegistration.toObject();
    }

    const registration = await DeliveryRegistration.create({
      fullName: payload.fullName,
      mobileNumber: payload.mobileNumber,
      vehicleType: payload.vehicleType,
      vehicleNumber: payload.vehicleNumber,
      assignedBranch: {
        branchId: branch.branchId,
        branchType: branch.branchType,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
      },
    });

    return registration.toObject();
  }

  static async findActiveByMobileNumber(mobileNumber) {
    const normalizedMobile = normalizeMobile(mobileNumber);
    if (!/^[0-9]{10}$/.test(normalizedMobile)) {
      throw new Error('Valid mobile number is required');
    }

    return DeliveryRegistration.findOne({
      mobileNumber: normalizedMobile,
      status: { $nin: ['rejected', 'inactive'] },
    }).sort({ createdAt: -1 });
  }

  static async checkMobile(mobileNumber) {
    const delivery = await this.findActiveByMobileNumber(mobileNumber);
    if (!delivery) {
      return {
        success: true,
        exists: false,
        needsRegistration: true,
        message: 'Delivery account not found. Please register.',
      };
    }

    return {
      success: true,
      exists: true,
      needsRegistration: false,
      message: 'Delivery account found',
      delivery: formatDeliveryProfile(delivery),
    };
  }

  static async sendOtp(mobileNumber) {
    const delivery = await this.findActiveByMobileNumber(mobileNumber);
    if (!delivery) {
      return {
        success: false,
        exists: false,
        needsRegistration: true,
        message: 'Delivery account not found. Please register.',
      };
    }

    const plainOtp = '1234';
    const hashedOtp = await hashData(plainOtp);

    await Otp.findOneAndUpdate(
      { target: getDeliveryOtpTarget(delivery.mobileNumber), type: 'phone' },
      {
        code: hashedOtp,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        isVerified: false,
        attempts: 0,
      },
      { upsert: true, returnDocument: 'after' }
    );

    console.log(`[SIMULATION] Delivery OTP for ${delivery.mobileNumber}: ${plainOtp}`);

    return {
      success: true,
      exists: true,
      needsRegistration: false,
      message: 'OTP sent successfully',
      mobileNumber: delivery.mobileNumber,
    };
  }

  static async verifyOtp(mobileNumber, otpCode) {
    const delivery = await this.findActiveByMobileNumber(mobileNumber);
    if (!delivery) {
      return {
        success: false,
        exists: false,
        needsRegistration: true,
        message: 'Delivery account not found. Please register.',
      };
    }

    if (!otpCode || !/^\d{4}$/.test(String(otpCode))) {
      throw new Error('OTP must be 4 digits');
    }

    const otpRecord = await Otp.findOne({
      target: getDeliveryOtpTarget(delivery.mobileNumber),
      type: 'phone',
    });

    if (!otpRecord) {
      throw new Error('OTP not found or has expired. Please request a new OTP.');
    }

    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      throw new Error('OTP has expired. Please request a new OTP.');
    }

    if (otpRecord.attempts >= 3) {
      throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    const isMatch = await compareHash(String(otpCode), otpRecord.code);
    if (!isMatch) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new Error(`Invalid OTP. Attempt ${otpRecord.attempts} of 3.`);
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    const token = generateToken({
      deliveryId: delivery._id.toString(),
      role: 'delivery',
      mobileNumber: delivery.mobileNumber,
    });

    return {
      success: true,
      exists: true,
      needsRegistration: false,
      message: 'Login successful',
      token,
      delivery: formatDeliveryProfile(delivery),
    };
  }

  static async getProfile(deliveryId) {
    if (!mongoose.Types.ObjectId.isValid(deliveryId)) {
      throw new Error('Invalid delivery account');
    }

    const delivery = await DeliveryRegistration.findOne({
      _id: deliveryId,
      status: { $nin: ['rejected', 'inactive'] },
    });

    if (!delivery) {
      throw new Error('Delivery account not found');
    }

    return formatDeliveryProfile(delivery);
  }
}
