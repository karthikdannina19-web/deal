import { LocationsController } from '../../../../modules/locations/locations.controller.js';

/**
 * Public API for fetching districts by state
 * Endpoint: GET /api/locations/districts?stateId=
 */
export async function GET(req) {
  return await LocationsController.getDistricts(req);
}
