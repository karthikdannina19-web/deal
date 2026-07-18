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

test('store visibility remains cumulative when a district is selected', () => {
  const stateId = new mongoose.Types.ObjectId();
  const districtId = new mongoose.Types.ObjectId();
  const query = VisibilityService.buildMatchQuery({ stateId, districtId });

  assert.deepEqual(query.$or.slice(-2), [
    { visibilityLevel: 'state', visibilityStateId: stateId },
    {
      visibilityLevel: 'district',
      visibilityStateId: stateId,
      visibilityDistrictId: districtId,
    },
  ]);
  assert.equal(query.$or.some((matcher) => matcher.visibilityLevel === 'mandal'), false);
});

test('store visibility adds mandal scope without dropping broader scopes', () => {
  const stateId = new mongoose.Types.ObjectId();
  const districtId = new mongoose.Types.ObjectId();
  const mandalId = new mongoose.Types.ObjectId();
  const query = VisibilityService.buildMatchQuery({ stateId, districtId, mandalId });
  const levels = query.$or
    .map((matcher) => matcher.visibilityLevel)
    .filter(Boolean);

  assert.deepEqual(levels, ['global', 'state', 'district', 'mandal']);
  assert.deepEqual(query.$or.at(-1), {
    visibilityLevel: 'mandal',
    visibilityStateId: stateId,
    visibilityDistrictId: districtId,
    visibilityMandalId: mandalId,
  });
});
