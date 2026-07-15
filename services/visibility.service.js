import mongoose from 'mongoose';

export const VISIBILITY_LEVELS = ['global', 'state', 'district', 'mandal'];
const VISIBILITY_LEVEL_RANK = {
  global: 0,
  state: 1,
  district: 2,
  mandal: 3,
};

function objectIdOrNull(value) {
  if (!value) return null;
  return typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;
}

export class VisibilityService {
  static validateVisibilityPayload({ visibilityLevel, stateId, districtId, mandalId }) {
    if (!visibilityLevel) {
      throw new Error('Visibility level is required');
    }

    if (!VISIBILITY_LEVELS.includes(visibilityLevel)) {
      throw new Error('Invalid visibility level');
    }

    if (visibilityLevel === 'global') {
      return;
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
    visibilityLevel = 'global',
    visibilityStateId = null,
    visibilityDistrictId = null,
    visibilityMandalId = null,
    visibilityEnabled = true,
  } = {}) {
    const normalizedLevel = visibilityLevel || 'global';
    const normalizedStateId = visibilityStateId || null;
    const normalizedDistrictId = visibilityDistrictId || null;
    const normalizedMandalId = visibilityMandalId || null;

    this.validateVisibilityPayload({
      visibilityLevel: normalizedLevel,
      stateId: normalizedStateId,
      districtId: normalizedDistrictId,
      mandalId: normalizedMandalId,
    });

    if (normalizedLevel === 'global') {
      return {
        visibilityLevel: 'global',
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
    if (!visibilityLevel || visibilityLevel === 'global') {
      return this.normalizeVisibilityPayload({
        visibilityLevel: 'global',
        visibilityEnabled: true,
      });
    }

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

  static getAllowedChildLevels(parentVisibilityLevel = 'global') {
    const parentRank = VISIBILITY_LEVEL_RANK[parentVisibilityLevel || 'global'] ?? 0;
    return VISIBILITY_LEVELS.filter((level) => VISIBILITY_LEVEL_RANK[level] >= parentRank);
  }

  static validateChildVisibilityLevel(parentVisibilityLevel = 'global', childVisibilityLevel = 'global') {
    const allowedLevels = this.getAllowedChildLevels(parentVisibilityLevel);
    const normalizedChildLevel = childVisibilityLevel || 'global';

    if (!allowedLevels.includes(normalizedChildLevel)) {
      throw new Error(
        `Ad visibility cannot be broader than store visibility. Allowed levels: ${allowedLevels.join(', ')}`
      );
    }

    return normalizedChildLevel;
  }

  static getUserLocation(user) {
    if (!user?.stateId) {
      return null;
    }

    return {
      stateId: user.stateId,
      districtId: user?.districtId || null,
      mandalId: user?.mandalId || null,
    };
  }

  static buildMatchQuery(location, extraFilters = {}) {
    const matchers = [
      { visibilityLevel: 'global' },
      { visibilityLevel: { $exists: false } },
      { visibilityLevel: null },
      { visibilityStateId: { $exists: false } },
      { visibilityStateId: null },
    ];

    if (location?.stateId) {
      matchers.push({
        visibilityLevel: 'state',
        visibilityStateId: objectIdOrNull(location.stateId),
      });
    }

    if (location?.stateId && location?.districtId) {
      matchers.push({
        visibilityLevel: 'district',
        visibilityStateId: objectIdOrNull(location.stateId),
        visibilityDistrictId: objectIdOrNull(location.districtId),
      });
    }

    if (location?.stateId && location?.districtId && location?.mandalId) {
      matchers.push({
        visibilityLevel: 'mandal',
        visibilityStateId: objectIdOrNull(location.stateId),
        visibilityDistrictId: objectIdOrNull(location.districtId),
        visibilityMandalId: objectIdOrNull(location.mandalId),
      });
    }

    return {
      ...extraFilters,
      visibilityEnabled: { $ne: false },
      $or: matchers,
    };
  }

  static buildCouponVisibilityQuery(location, extraFilters = {}) {
    const matchers = [
      { visibilityScope: 'all' },
      { visibilityScope: { $exists: false } },
      { visibilityScope: null },
    ];

    if (location?.stateId) {
      matchers.push({
        visibilityScope: 'state',
        stateId: objectIdOrNull(location.stateId),
      });
    }

    if (location?.stateId && location?.districtId) {
      matchers.push({
        visibilityScope: 'district',
        stateId: objectIdOrNull(location.stateId),
        districtId: objectIdOrNull(location.districtId),
      });
    }

    if (location?.stateId && location?.districtId && location?.mandalId) {
      matchers.push({
        visibilityScope: 'mandal',
        stateId: objectIdOrNull(location.stateId),
        districtId: objectIdOrNull(location.districtId),
        mandalId: objectIdOrNull(location.mandalId),
      });
    }

    return {
      ...extraFilters,
      $or: matchers,
    };
  }
}
