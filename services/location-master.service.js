import State from '@/models/state.model.js';
import District from '@/models/district.model.js';
import Mandal from '@/models/mandal.model.js';
import locationData from '@/utils/locationData.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const SEED_WRITE_OPTIONS = { ordered: false };

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

function getSeedCounts() {
  let districtCount = 0;
  let mandalCount = 0;

  for (const districts of Object.values(locationData)) {
    districtCount += Object.keys(districts).length;
    for (const mandals of Object.values(districts)) {
      mandalCount += Array.isArray(mandals) ? mandals.length : 0;
    }
  }

  return {
    states: Object.keys(locationData).length,
    districts: districtCount,
    mandals: mandalCount,
  };
}

class LocationMasterService {
  static cache = {
    tree: null,
    expiresAt: 0,
  };

  static seedSyncPromise = null;

  static async ensureSeeded() {
    if (this.seedSyncPromise) {
      return this.seedSyncPromise;
    }

    this.seedSyncPromise = this.syncSeedData();

    try {
      return await this.seedSyncPromise;
    } finally {
      this.seedSyncPromise = null;
    }
  }

  static async syncSeedData() {
    const seedCounts = getSeedCounts();
    const [existingStateCount, existingDistrictCount, existingMandalCount] = await Promise.all([
      State.estimatedDocumentCount(),
      District.estimatedDocumentCount(),
      Mandal.estimatedDocumentCount(),
    ]);

    if (
      existingStateCount >= seedCounts.states &&
      existingDistrictCount >= seedCounts.districts &&
      existingMandalCount >= seedCounts.mandals
    ) {
      return;
    }

    const seedStateNames = Object.keys(locationData);
    const seedStateNormalizedNames = seedStateNames.map((stateName) => normalizeName(stateName));

    await State.bulkWrite(
      seedStateNames.map((stateName) => ({
        updateOne: {
          filter: { normalizedName: normalizeName(stateName) },
          update: {
            $set: {
              name: stateName,
              code: buildStateCode(stateName),
              normalizedName: normalizeName(stateName),
            },
          },
          upsert: true,
        },
      })),
      SEED_WRITE_OPTIONS
    );

    const states = await State.find({ normalizedName: { $in: seedStateNormalizedNames } })
      .select('_id normalizedName')
      .lean();
    const stateIdByNormalizedName = new Map(
      states.map((state) => [state.normalizedName, state._id])
    );

    const districtSeedEntries = [];
    for (const [stateName, districts] of Object.entries(locationData)) {
      const stateId = stateIdByNormalizedName.get(normalizeName(stateName));
      if (!stateId) continue;

      for (const districtName of Object.keys(districts)) {
        districtSeedEntries.push({
          stateId,
          stateName,
          districtName,
          normalizedName: normalizeName(districtName),
        });
      }
    }

    if (districtSeedEntries.length > 0) {
      await District.bulkWrite(
        districtSeedEntries.map((district) => ({
          updateOne: {
            filter: {
              stateId: district.stateId,
              normalizedName: district.normalizedName,
            },
            update: {
              $set: {
                stateId: district.stateId,
                name: district.districtName,
                normalizedName: district.normalizedName,
              },
            },
            upsert: true,
          },
        })),
        SEED_WRITE_OPTIONS
      );
    }

    const districts = await District.find({
      stateId: { $in: states.map((state) => state._id) },
    })
      .select('_id stateId normalizedName')
      .lean();
    const districtIdBySeedKey = new Map(
      districts.map((district) => [
        `${district.stateId.toString()}:${district.normalizedName}`,
        district._id,
      ])
    );

    const mandalSeedEntries = [];
    for (const [stateName, districtsByName] of Object.entries(locationData)) {
      const stateId = stateIdByNormalizedName.get(normalizeName(stateName));
      if (!stateId) continue;

      for (const [districtName, mandals] of Object.entries(districtsByName)) {
        const districtId = districtIdBySeedKey.get(`${stateId.toString()}:${normalizeName(districtName)}`);
        if (!districtId || !Array.isArray(mandals)) continue;

        for (const mandalName of mandals) {
          mandalSeedEntries.push({
            districtId,
            mandalName,
            normalizedName: normalizeName(mandalName),
          });
        }
      }
    }

    if (mandalSeedEntries.length > 0) {
      await Mandal.bulkWrite(
        mandalSeedEntries.map((mandal) => ({
          updateOne: {
            filter: {
              districtId: mandal.districtId,
              normalizedName: mandal.normalizedName,
            },
            update: {
              $set: {
                districtId: mandal.districtId,
                name: mandal.mandalName,
                normalizedName: mandal.normalizedName,
              },
            },
            upsert: true,
          },
        })),
        SEED_WRITE_OPTIONS
      );
    }

    this.cache.expiresAt = 0;
  }

  static async getStates() {
    await this.ensureSeeded();

    return State.find({})
      .select('_id name code')
      .sort({ name: 1 })
      .lean();
  }

  static async getDistrictsByState(stateId) {
    await this.ensureSeeded();

    return District.find({ stateId })
      .select('_id name stateId')
      .sort({ name: 1 })
      .lean();
  }

  static async getMandalsByDistrict(districtId) {
    await this.ensureSeeded();

    return Mandal.find({ districtId })
      .select('_id name districtId')
      .sort({ name: 1 })
      .lean();
  }

  static async getTree({ forceRefresh = false } = {}) {
    await this.ensureSeeded();

    const now = Date.now();
    if (!forceRefresh && this.cache.tree && this.cache.expiresAt > now) {
      return this.cache.tree;
    }

    const states = await State.find({})
      .select('_id name code')
      .sort({ name: 1 })
      .lean();
    const stateIds = states.map((state) => state._id);

    const districts = await District.find({ stateId: { $in: stateIds } })
      .select('_id name stateId')
      .sort({ name: 1 })
      .lean();
    const districtIds = districts.map((district) => district._id);

    const mandals = await Mandal.find({ districtId: { $in: districtIds } })
      .select('_id name districtId')
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

  static async findByNames({
    state,
    district,
    mandal,
    districtCandidates = [],
    mandalCandidates = [],
    autoCreateMissingState = false,
    autoCreateMissingDistrict = false,
    autoCreateMissingMandal = false,
  }) {
    await this.ensureSeeded();

    if (!state) {
      throw new Error('State is required');
    }

    let stateDoc = await State.findOne({ normalizedName: normalizeName(state) });
    if (!stateDoc) {
      if (!autoCreateMissingState) {
        throw new Error(`Unsupported state: ${state}`);
      }
      stateDoc = await State.create({
        name: state,
        code: buildStateCode(state),
        normalizedName: normalizeName(state),
      });
      this.cache.expiresAt = 0;
    }

    let districtDoc = null;
    const districtSearchCandidates = [district, ...districtCandidates].filter(Boolean);
    if (districtSearchCandidates.length > 0) {
      districtDoc = await District.findOne({
        stateId: stateDoc._id,
        normalizedName: {
          $in: districtSearchCandidates.map((candidate) => normalizeName(candidate)),
        },
      });
      if (!districtDoc) {
        if (!autoCreateMissingDistrict) {
          throw new Error(`Unsupported district for state ${stateDoc.name}: ${district}`);
        }
        const districtNameToCreate = districtSearchCandidates[0];
        districtDoc = await District.create({
          stateId: stateDoc._id,
          name: districtNameToCreate,
          normalizedName: normalizeName(districtNameToCreate),
        });
        this.cache.expiresAt = 0;
      }
    }

    let mandalDoc = null;
    const mandalSearchCandidates = [mandal, ...mandalCandidates].filter(Boolean);
    if (mandalSearchCandidates.length > 0) {
      if (!districtDoc) {
        throw new Error('District is required when mandal is provided');
      }
      mandalDoc = await Mandal.findOne({
        districtId: districtDoc._id,
        normalizedName: {
          $in: mandalSearchCandidates.map((candidate) => normalizeName(candidate)),
        },
      });
      if (!mandalDoc) {
        if (!autoCreateMissingMandal) {
          throw new Error(`Unsupported mandal for district ${districtDoc.name}: ${mandal}`);
        }
        const mandalNameToCreate = mandalSearchCandidates[0];
        mandalDoc = await Mandal.create({
          districtId: districtDoc._id,
          name: mandalNameToCreate,
          normalizedName: normalizeName(mandalNameToCreate),
        });
        this.cache.expiresAt = 0;
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
      autoCreateMissingDistrict: true,
      autoCreateMissingMandal: true,
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
