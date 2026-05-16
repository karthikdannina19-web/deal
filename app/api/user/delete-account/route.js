import { UserController } from '@/modules/user/user.controller.js';

/**
 * Delete user account
 * Endpoint: POST /api/user/delete-account
 */
export async function POST(req) {
  return await UserController.deleteAccount(req);
}
