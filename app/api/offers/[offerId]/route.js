import { StoreController } from '../../../../modules/store/store.controller.js';

/**
 * Public API for fetching detailed info of a discount/offer
 * Endpoint: GET /api/offers/[offerId]
 */
export async function GET(req, { params }) {
  return await StoreController.getOfferDetails(req, { params });
}
