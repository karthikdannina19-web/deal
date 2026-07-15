import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Vendor from '../models/vendor.model.js';
import Ad from '../models/ad.model.js';
import { VisibilityService } from '../services/visibility.service.js';

dotenv.config({ path: '.env.local', quiet: true });

const applyChanges = process.argv.includes('--apply');

function sameId(left, right) {
  return String(left || '') === String(right || '');
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    family: 4,
  });

  const vendors = await Vendor.find({
    visibilityEnabled: { $ne: false },
  })
    .select('_id visibilityLevel visibilityStateId visibilityDistrictId visibilityMandalId visibilityEnabled storeStateId storeDistrictId storeMandalId')
    .lean();

  let approvedAdsChecked = 0;
  let approvedAdsNeedingSync = 0;
  let approvedAdsUpdated = 0;
  const invalidVendors = [];

  for (const vendor of vendors) {
    let target;
    try {
      target = VisibilityService.inheritFromStore(vendor);
    } catch (error) {
      const approvedCount = await Ad.countDocuments({ vendor: vendor._id, status: 'approved' });
      if (approvedCount > 0) {
        invalidVendors.push({ vendorId: String(vendor._id), approvedCount, message: error.message });
      }
      continue;
    }

    const approvedAds = await Ad.find({ vendor: vendor._id, status: 'approved' })
      .select('_id visibilityLevel visibilityStateId visibilityDistrictId visibilityMandalId visibilityEnabled')
      .lean();

    approvedAdsChecked += approvedAds.length;
    const mismatchedIds = approvedAds
      .filter((ad) => (
        ad.visibilityLevel !== target.visibilityLevel
        || !sameId(ad.visibilityStateId, target.visibilityStateId)
        || !sameId(ad.visibilityDistrictId, target.visibilityDistrictId)
        || !sameId(ad.visibilityMandalId, target.visibilityMandalId)
        || ad.visibilityEnabled !== target.visibilityEnabled
      ))
      .map((ad) => ad._id);

    approvedAdsNeedingSync += mismatchedIds.length;
    if (applyChanges && mismatchedIds.length > 0) {
      const result = await Ad.updateMany(
        { _id: { $in: mismatchedIds } },
        { $set: target }
      );
      approvedAdsUpdated += result.modifiedCount;
    }
  }

  console.log(JSON.stringify({
    mode: applyChanges ? 'apply' : 'dry-run',
    vendorsChecked: vendors.length,
    approvedAdsChecked,
    approvedAdsNeedingSync,
    approvedAdsUpdated,
    invalidVendors,
  }, null, 2));
}

try {
  await main();
} finally {
  await mongoose.disconnect();
}
