import { LocationsController } from '@/modules/locations/locations.controller.js';

export async function POST(req) {
  return LocationsController.resolveLocation(req);
}
