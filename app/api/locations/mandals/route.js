import { LocationsController } from '../../../../modules/locations/locations.controller.js';

/**
 * Public API for fetching mandals/areas by district
 * Endpoint: GET /api/locations/mandals?districtId=
 */
export async function GET(req) {
  return await LocationsController.getMandals(req);
}
