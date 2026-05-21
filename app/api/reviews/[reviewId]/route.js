import { StoreController } from '@/modules/store/store.controller.js';

/**
 * PATCH /api/reviews/:reviewId
 * Update a review owned by the authenticated user
 */
export async function PATCH(req, { params }) {
  return await StoreController.updateReview(req, { params });
}

/**
 * DELETE /api/reviews/:reviewId
 * Soft delete a review owned by the authenticated user
 */
export async function DELETE(req, { params }) {
  return await StoreController.deleteReview(req, { params });
}
