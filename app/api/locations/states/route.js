import { LocationsController } from '../../../../modules/locations/locations.controller.js';

/**
 * Public API for fetching states/UTs
 * Endpoint: GET /api/locations/states
 */
export async function GET() {
  return await LocationsController.getStates();
}
