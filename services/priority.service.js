import mongoose from 'mongoose';
import PriorityRule from '@/models/priorityRule.model.js';
import { LocationMasterService } from '@/services/location-master.service.js';

const SCOPE_RANK = {
  global: 0,
  state: 1,
  district: 2,
  mandal: 3,
};

function toObjectIdOrNull(value) {
  if (!value) return null;
  return typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;
}

function normalizeEntityId(entityId) {
  if (!entityId) {
    throw new Error('Entity ID is required');
  }

  if (typeof entityId === 'string' && mongoose.Types.ObjectId.isValid(entityId)) {
    return new mongoose.Types.ObjectId(entityId);
  }

  if (entityId instanceof mongoose.Types.ObjectId) {
    return entityId;
  }

  if (entityId?._id) {
    return normalizeEntityId(entityId._id);
  }

  throw new Error('Invalid entity ID');
}

export class PriorityService {
  static ENTITY_TYPES = ['section', 'ad', 'vendor', 'store'];
  static SCOPE_LEVELS = ['global', 'state', 'district', 'mandal'];

  static normalizeScope({
    scopeLevel = 'global',
    stateId = null,
    districtId = null,
    mandalId = null,
  } = {}) {
    const normalizedScope = scopeLevel || 'global';
    if (!this.SCOPE_LEVELS.includes(normalizedScope)) {
      throw new Error('Invalid priority scope level');
    }

    const normalizedStateId = toObjectIdOrNull(stateId);
    const normalizedDistrictId = toObjectIdOrNull(districtId);
    const normalizedMandalId = toObjectIdOrNull(mandalId);

    if (normalizedScope === 'global') {
      return {
        scopeLevel: 'global',
        stateId: null,
        districtId: null,
        mandalId: null,
      };
    }

    if (!normalizedStateId) {
      throw new Error('State is required for scoped priority');
    }
    if (normalizedScope === 'district' && !normalizedDistrictId) {
      throw new Error('District is required for district priority');
    }
    if (normalizedScope === 'mandal' && !normalizedDistrictId) {
      throw new Error('District is required for mandal priority');
    }
    if (normalizedScope === 'mandal' && !normalizedMandalId) {
      throw new Error('Mandal is required for mandal priority');
    }

    return {
      scopeLevel: normalizedScope,
      stateId: normalizedStateId,
      districtId: normalizedScope === 'state' ? null : normalizedDistrictId,
      mandalId: normalizedScope === 'mandal' ? normalizedMandalId : null,
    };
  }

  static async validateScope(scope) {
    if (scope.scopeLevel === 'global') {
      return scope;
    }

    await LocationMasterService.validateHierarchy({
      stateId: scope.stateId,
      districtId: scope.districtId,
      mandalId: scope.mandalId,
    });

    return scope;
  }

  static async upsertRule({
    entityType,
    entityId,
    scopeLevel = 'global',
    stateId = null,
    districtId = null,
    mandalId = null,
    priority,
    isActive = true,
  }) {
    if (!this.ENTITY_TYPES.includes(entityType)) {
      throw new Error('Invalid priority entity type');
    }

    const normalizedPriority = Number(priority);
    if (!Number.isFinite(normalizedPriority) || normalizedPriority < 1) {
      throw new Error('Priority must be a number greater than or equal to 1');
    }

    const scope = await this.validateScope(
      this.normalizeScope({ scopeLevel, stateId, districtId, mandalId })
    );

    return PriorityRule.findOneAndUpdate(
      {
        entityType,
        entityId: normalizeEntityId(entityId),
        scopeLevel: scope.scopeLevel,
        stateId: scope.stateId,
        districtId: scope.districtId,
        mandalId: scope.mandalId,
      },
      {
        $set: {
          priority: normalizedPriority,
          isActive: isActive !== false,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );
  }

  static async upsertMany({ entityType, rules = [] }) {
    if (!this.ENTITY_TYPES.includes(entityType)) {
      throw new Error('Invalid priority entity type');
    }

    const results = [];
    for (const rule of rules) {
      results.push(await this.upsertRule({ entityType, ...rule }));
    }
    return results;
  }

  static async listRules({
    entityType,
    scopeLevel = null,
    stateId = null,
    districtId = null,
    mandalId = null,
    entityIds = [],
  } = {}) {
    const query = {};

    if (entityType) {
      query.entityType = entityType;
    }

    if (scopeLevel) {
      const scope = this.normalizeScope({ scopeLevel, stateId, districtId, mandalId });
      query.scopeLevel = scope.scopeLevel;
      query.stateId = scope.stateId;
      query.districtId = scope.districtId;
      query.mandalId = scope.mandalId;
    }

    if (entityIds.length > 0) {
      query.entityId = {
        $in: entityIds.map((entityId) => normalizeEntityId(entityId)),
      };
    }

    return PriorityRule.find(query).sort({ priority: 1, updatedAt: -1 }).lean();
  }

  static buildLocationOrQuery(location = null) {
    const matchers = [{ scopeLevel: 'global' }];

    if (location?.stateId) {
      matchers.push({
        scopeLevel: 'state',
        stateId: toObjectIdOrNull(location.stateId),
      });
    }

    if (location?.stateId && location?.districtId) {
      matchers.push({
        scopeLevel: 'district',
        stateId: toObjectIdOrNull(location.stateId),
        districtId: toObjectIdOrNull(location.districtId),
      });
    }

    if (location?.stateId && location?.districtId && location?.mandalId) {
      matchers.push({
        scopeLevel: 'mandal',
        stateId: toObjectIdOrNull(location.stateId),
        districtId: toObjectIdOrNull(location.districtId),
        mandalId: toObjectIdOrNull(location.mandalId),
      });
    }

    return matchers;
  }

  static async getEffectivePriorityMap(entityType, entityIds = [], userLocation = null) {
    if (!this.ENTITY_TYPES.includes(entityType)) {
      throw new Error('Invalid priority entity type');
    }

    if (!Array.isArray(entityIds) || entityIds.length === 0) {
      return new Map();
    }

    const rules = await PriorityRule.find({
      entityType,
      entityId: { $in: entityIds.map((entityId) => normalizeEntityId(entityId)) },
      isActive: true,
      $or: this.buildLocationOrQuery(userLocation),
    }).lean();

    const ruleMap = new Map();

    for (const rule of rules) {
      const key = rule.entityId.toString();
      const existing = ruleMap.get(key);
      const nextRank = SCOPE_RANK[rule.scopeLevel] ?? -1;

      if (!existing) {
        ruleMap.set(key, rule);
        continue;
      }

      const existingRank = SCOPE_RANK[existing.scopeLevel] ?? -1;
      if (nextRank > existingRank) {
        ruleMap.set(key, rule);
        continue;
      }

      if (nextRank === existingRank && rule.priority < existing.priority) {
        ruleMap.set(key, rule);
      }
    }

    return ruleMap;
  }

  static sortItemsByPriority(items, getId, ruleMap, fallbackComparator = null) {
    const sorted = [...items];
    sorted.sort((left, right) => {
      const leftRule = ruleMap.get(String(getId(left)));
      const rightRule = ruleMap.get(String(getId(right)));

      if (leftRule && rightRule) {
        if (leftRule.priority !== rightRule.priority) {
          return leftRule.priority - rightRule.priority;
        }

        const leftScopeRank = SCOPE_RANK[leftRule.scopeLevel] ?? 0;
        const rightScopeRank = SCOPE_RANK[rightRule.scopeLevel] ?? 0;
        if (leftScopeRank !== rightScopeRank) {
          return rightScopeRank - leftScopeRank;
        }
      } else if (leftRule && !rightRule) {
        return -1;
      } else if (!leftRule && rightRule) {
        return 1;
      }

      return fallbackComparator ? fallbackComparator(left, right) : 0;
    });

    return sorted;
  }
}
