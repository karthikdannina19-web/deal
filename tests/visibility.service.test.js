import test from 'node:test';
import assert from 'node:assert/strict';
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
