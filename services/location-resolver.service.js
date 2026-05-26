import { LocationMasterService, normalizeName } from '@/services/location-master.service.js';

const PROVIDER = process.env.GEO_PROVIDER || 'nominatim';

class NominatimProvider {
  static async reverseGeocode({ latitude, longitude }) {
    const endpoint = new URL('https://nominatim.openstreetmap.org/reverse');
    endpoint.searchParams.set('lat', String(latitude));
    endpoint.searchParams.set('lon', String(longitude));
    endpoint.searchParams.set('format', 'jsonv2');
    endpoint.searchParams.set('addressdetails', '1');

    const response = await fetch(endpoint.toString(), {
      headers: {
        'User-Agent': process.env.GEO_USER_AGENT || 'rhockdeal-location-resolver/1.0',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Geocoding provider error: ${response.status}`);
    }

    const payload = await response.json();
    const address = payload?.address || {};

    const state = address.state || address.region || '';
    const districtCandidates = [
      address.state_district,
      address.county,
      address.city_district,
      address.city,
      address.town,
    ].filter(Boolean);
    const mandalCandidates = [
      address.suburb,
      address.neighbourhood,
      address.quarter,
      address.residential,
      address.city_district,
      address.town,
      address.village,
      address.city,
    ].filter(Boolean);
    const district = districtCandidates[0] || '';
    const mandal = mandalCandidates[0] || '';

    return {
      raw: payload,
      state,
      district,
      mandal,
      districtCandidates,
      mandalCandidates,
      addressLine: payload?.display_name || '',
      area: address.suburb || address.neighbourhood || '',
      city: address.city || address.town || address.village || '',
      pincode: address.postcode || '',
    };
  }
}

const providers = {
  nominatim: NominatimProvider,
};

export class LocationResolverService {
  static async resolveCoordinates({ latitude, longitude }) {
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
      throw new Error('Latitude and longitude must be valid numbers');
    }

    const provider = providers[PROVIDER];
    if (!provider) {
      throw new Error(`Unsupported geo provider: ${PROVIDER}`);
    }

    const resolved = await provider.reverseGeocode({
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    if (!resolved.state || !resolved.district || !resolved.mandal) {
      throw new Error('Missing geocode response for state, district, or mandal');
    }

    const hierarchy = await LocationMasterService.findByNames({
      state: resolved.state,
      district: resolved.district,
      mandal: resolved.mandal,
      districtCandidates: resolved.districtCandidates || [],
      mandalCandidates: resolved.mandalCandidates || [],
      autoCreateMissingDistrict: true,
      autoCreateMissingMandal: true,
    });

    return {
      state: hierarchy.state,
      district: hierarchy.district,
      mandal: hierarchy.mandal,
      latitude: Number(latitude),
      longitude: Number(longitude),
      addressLine: resolved.addressLine,
      area: resolved.area,
      city: resolved.city,
      pincode: resolved.pincode,
      provider: PROVIDER,
      providerPayload: {
        state: normalizeName(resolved.state),
        district: normalizeName(resolved.district),
        mandal: normalizeName(resolved.mandal),
      },
    };
  }
}
