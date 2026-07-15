import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { VisibilityService } from '../services/visibility.service.js';

test('extracts partial auth location without requiring all hierarchy levels', () => {
  const location = VisibilityService.getLocationFromAuthUser({
    stateId: 'state-1',
    districtId: 'district-1',
  });

  assert.deepEqual(location, {
    stateId: 'state-1',
    districtId: 'district-1',
    mandalId: null,
  });
});

test('coupon visibility query only includes the exact selected hierarchy', () => {
  const stateId = new mongoose.Types.ObjectId();
  const districtId = new mongoose.Types.ObjectId();
  const mandalId = new mongoose.Types.ObjectId();
  const query = VisibilityService.buildCouponVisibilityQuery({ stateId, districtId, mandalId });

  assert.deepEqual(query.$or, [
    { visibilityScope: 'all' },
    { visibilityScope: { $exists: false } },
    { visibilityScope: null },
    { visibilityScope: 'state', stateId },
    { visibilityScope: 'district', stateId, districtId },
    { visibilityScope: 'mandal', stateId, districtId, mandalId },
  ]);
});
