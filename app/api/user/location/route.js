import { UserController } from '@/modules/user/user.controller.js';

/**
 * GET /api/user/location
 * POST /api/user/location
 * PUT /api/user/location
 */
export async function GET(req) {
  return await UserController.getLocation(req);
}

export async function POST(req) {
  return await UserController.saveLocation(req);
}

export async function PUT(req) {
  return await UserController.saveLocation(req);
}
