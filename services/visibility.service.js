import mongoose from 'mongoose';

export const VISIBILITY_LEVELS = ['state', 'district', 'mandal'];

function objectIdOrNull(value) {
  if (!value) return null;
  return typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;
}

export class VisibilityService {
  static validateVisibilityPayload({ visibilityLevel, stateId, districtId, mandalId }) {
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
    if (!location?.stateId || !location?.districtId || !location?.mandalId) {
      throw new Error('User location is incomplete');
    }

    return {
      ...extraFilters,
      visibilityEnabled: true,
      $or: [
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
        },
      ],
    };
  }
}
