import State from '@/models/state.model.js';
import District from '@/models/district.model.js';
import Mandal from '@/models/mandal.model.js';
import locationData from '@/utils/locationData.js';

const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildStateCode(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 6)
    .toUpperCase();
}

class LocationMasterService {
  static cache = {
    tree: null,
    expiresAt: 0,
  };

  static async ensureSeeded() {
    const existingCount = await State.estimatedDocumentCount();
    if (existingCount > 0) {
      return;
    }

    for (const [stateName, districts] of Object.entries(locationData)) {
      const state = await State.create({
        name: stateName,
        code: buildStateCode(stateName),
        normalizedName: normalizeName(stateName),
      });

      for (const [districtName, mandals] of Object.entries(districts)) {
        const district = await District.create({
          stateId: state._id,
          name: districtName,
          normalizedName: normalizeName(districtName),
        });

        if (!Array.isArray(mandals)) continue;

        for (const mandalName of mandals) {
          await Mandal.create({
            districtId: district._id,
            name: mandalName,
            normalizedName: normalizeName(mandalName),
          });
        }
      }
    }
  }

  static async getTree({ forceRefresh = false } = {}) {
    await this.ensureSeeded();

    const now = Date.now();
    if (!forceRefresh && this.cache.tree && this.cache.expiresAt > now) {
      return this.cache.tree;
    }

    const states = await State.find({})
      .sort({ name: 1 })
      .lean();
    const stateIds = states.map((state) => state._id);

    const districts = await District.find({ stateId: { $in: stateIds } })
      .sort({ name: 1 })
      .lean();
    const districtIds = districts.map((district) => district._id);

    const mandals = await Mandal.find({ districtId: { $in: districtIds } })
      .sort({ name: 1 })
      .lean();

    const mandalsByDistrict = new Map();
    for (const mandal of mandals) {
      const key = mandal.districtId.toString();
      const list = mandalsByDistrict.get(key) || [];
      list.push({
        id: mandal._id,
        name: mandal.name,
      });
      mandalsByDistrict.set(key, list);
    }

    const districtsByState = new Map();
    for (const district of districts) {
      const key = district.stateId.toString();
      const list = districtsByState.get(key) || [];
      list.push({
        id: district._id,
        name: district.name,
        mandals: mandalsByDistrict.get(district._id.toString()) || [],
      });
      districtsByState.set(key, list);
    }

    const tree = states.map((state) => ({
      id: state._id,
      name: state.name,
      code: state.code,
      districts: districtsByState.get(state._id.toString()) || [],
    }));

    this.cache = {
      tree,
      expiresAt: now + CACHE_TTL_MS,
    };

    return tree;
  }

  static async findByNames({ state, district, mandal }) {
    await this.ensureSeeded();

    if (!state) {
      throw new Error('State is required');
    }

    const stateDoc = await State.findOne({ normalizedName: normalizeName(state) });
    if (!stateDoc) {
      throw new Error(`Unsupported state: ${state}`);
    }

    let districtDoc = null;
    if (district) {
      districtDoc = await District.findOne({
        stateId: stateDoc._id,
        normalizedName: normalizeName(district),
      });
      if (!districtDoc) {
        throw new Error(`Unsupported district for state ${stateDoc.name}: ${district}`);
      }
    }

    let mandalDoc = null;
    if (mandal) {
      if (!districtDoc) {
        throw new Error('District is required when mandal is provided');
      }
      mandalDoc = await Mandal.findOne({
        districtId: districtDoc._id,
        normalizedName: normalizeName(mandal),
      });
      if (!mandalDoc) {
        throw new Error(`Unsupported mandal for district ${districtDoc.name}: ${mandal}`);
      }
    }

    return {
      state: stateDoc,
      district: districtDoc,
      mandal: mandalDoc,
    };
  }

  static async syncLegacyLocation(entity, { state, district, mandal } = {}) {
    const resolved = await this.findByNames({
      state: state || entity?.location?.state,
      district: district || entity?.location?.district,
      mandal: mandal || entity?.location?.mandal,
    });

    if (!entity) {
      return resolved;
    }

    entity.location = {
      ...(entity.location || {}),
      state: resolved.state.name,
      district: resolved.district?.name || entity.location?.district || '',
      mandal: resolved.mandal?.name || entity.location?.mandal || '',
    };
    entity.storeStateId = resolved.state._id;
    entity.storeDistrictId = resolved.district?._id || null;
    entity.storeMandalId = resolved.mandal?._id || null;

    return resolved;
  }

  static async getHierarchyByIds({ stateId, districtId, mandalId }) {
    await this.ensureSeeded();

    const state = stateId ? await State.findById(stateId).lean() : null;
    const district = districtId ? await District.findById(districtId).lean() : null;
    const mandal = mandalId ? await Mandal.findById(mandalId).lean() : null;

    return { state, district, mandal };
  }

  static async validateHierarchy({ stateId, districtId, mandalId }) {
    const { state, district, mandal } = await this.getHierarchyByIds({ stateId, districtId, mandalId });

    if (stateId && !state) {
      throw new Error('Invalid state');
    }
    if (districtId && !district) {
      throw new Error('Invalid district');
    }
    if (mandalId && !mandal) {
      throw new Error('Invalid mandal');
    }
    if (district && district.stateId.toString() !== state._id.toString()) {
      throw new Error('District does not belong to selected state');
    }
    if (mandal && district && mandal.districtId.toString() !== district._id.toString()) {
      throw new Error('Mandal does not belong to selected district');
    }

    return { state, district, mandal };
  }
}

export { LocationMasterService, normalizeName };
