import { UserAppController } from '@/modules/user-app/user-app.controller.js';

/**
 * Public API for fetching all active categories
 * Endpoint: GET /api/categories
 */
export async function GET(req) {
  return UserAppController.categories(req);
}
