import { UserAppController } from '@/modules/user-app/user-app.controller.js';

/**
 * POST /api/ads/:id/click
 * Increments click count for an ad.
 * Returns clickCount or null if vendor has disabled click visibility.
 */
export async function POST(req, context) {
  return UserAppController.adClick(req, context);
}
