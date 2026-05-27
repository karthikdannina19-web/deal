import mongoose from 'mongoose';

export const VISIBILITY_LEVELS = ['state', 'district', 'mandal'];

function objectIdOrNull(value) {
  if (!value) return null;
  return typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;
}

export class VisibilityService {
  static validateVisibilityPayload({ visibilityLevel, stateId, districtId, mandalId }) {
    if (!visibilityLevel && !stateId && !districtId && !mandalId) {
      return;
    }

    if (!visibilityLevel) {
      throw new Error('Visibility level is required when a target location is selected');
    }

    if (!VISIBILITY_LEVELS.includes(visibilityLevel)) {
      throw new Error('Invalid visibility level');
    }

    if (!stateId) {
      throw new Error('State is required for visibility');
    }
    if (visibilityLevel === 'district' && !districtId) {
      throw new Error('District is required for district visibility');
    }
    if (visibilityLevel === 'mandal' && !districtId) {
      throw new Error('District is required for mandal visibility');
    }
    if (visibilityLevel === 'mandal' && !mandalId) {
      throw new Error('Mandal is required for mandal visibility');
    }
  }

  static normalizeVisibilityPayload({
    visibilityLevel = null,
    visibilityStateId = null,
    visibilityDistrictId = null,
    visibilityMandalId = null,
    visibilityEnabled = true,
  } = {}) {
    const normalizedLevel = visibilityLevel || null;
    const normalizedStateId = visibilityStateId || null;
    const normalizedDistrictId = visibilityDistrictId || null;
    const normalizedMandalId = visibilityMandalId || null;

    this.validateVisibilityPayload({
      visibilityLevel: normalizedLevel,
      stateId: normalizedStateId,
      districtId: normalizedDistrictId,
      mandalId: normalizedMandalId,
    });

    if (!normalizedLevel) {
      return {
        visibilityLevel: null,
        visibilityStateId: null,
        visibilityDistrictId: null,
        visibilityMandalId: null,
        visibilityEnabled: visibilityEnabled !== false,
      };
    }

    return {
      visibilityLevel: normalizedLevel,
      visibilityStateId: normalizedStateId,
      visibilityDistrictId: normalizedLevel === 'state' ? null : normalizedDistrictId,
      visibilityMandalId: normalizedLevel === 'mandal' ? normalizedMandalId : null,
      visibilityEnabled: visibilityEnabled !== false,
    };
  }

  static deriveFromStore(entity, visibilityLevel) {
    const stateId = entity.storeStateId || entity.visibilityStateId;
    const districtId = entity.storeDistrictId || entity.visibilityDistrictId;
    const mandalId = entity.storeMandalId || entity.visibilityMandalId;

    this.validateVisibilityPayload({ visibilityLevel, stateId, districtId, mandalId });

    return {
      visibilityLevel,
      visibilityStateId: stateId,
      visibilityDistrictId: visibilityLevel === 'state' ? null : districtId,
      visibilityMandalId: visibilityLevel === 'mandal' ? mandalId : null,
      visibilityEnabled: true,
    };
  }

  static buildMatchQuery(location, extraFilters = {}) {
    const locationComplete = !!(location?.stateId && location?.districtId && location?.mandalId);
    const matchers = [
      {
        $or: [
          { visibilityLevel: { $exists: false } },
          { visibilityLevel: null },
          { visibilityStateId: { $exists: false } },
          { visibilityStateId: null },
        ],
      },
    ];

    if (locationComplete) {
      matchers.push(
        {
          visibilityLevel: 'state',
          visibilityStateId: objectIdOrNull(location.stateId),
        },
        {
          visibilityLevel: 'district',
          visibilityStateId: objectIdOrNull(location.stateId),
          visibilityDistrictId: objectIdOrNull(location.districtId),
        },
        {
          visibilityLevel: 'mandal',
          visibilityStateId: objectIdOrNull(location.stateId),
          visibilityDistrictId: objectIdOrNull(location.districtId),
          visibilityMandalId: objectIdOrNull(location.mandalId),
        }
      );
    }

    return {
      ...extraFilters,
      visibilityEnabled: { $ne: false },
      $or: matchers,
    };
  }
}
