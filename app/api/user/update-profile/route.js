import { UserController } from '@/modules/user/user.controller.js';

/**
 * Update User Profile (Onboarding)
 * Endpoint: PUT /api/user/update-profile
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function PUT(req) {
  return await UserController.updateProfile(req);
}
