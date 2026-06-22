import { StoreController } from '@/modules/store/store.controller.js';

/**
 * Public API for incrementing store/vendor views
 * Endpoint: POST /api/stores/[storeId]/view
 */
export async function POST(req, context) {
  return await StoreController.incrementStoreView(req, context);
}
