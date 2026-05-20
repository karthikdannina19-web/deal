import { StoreController } from '../../../../../modules/store/store.controller.js';

/**
 * Public/Authenticated API for submitting a store rating and review
 * Endpoint: POST /api/stores/[storeId]/reviews
 */
export async function POST(req, { params }) {
  return await StoreController.submitReview(req, { params });
}
