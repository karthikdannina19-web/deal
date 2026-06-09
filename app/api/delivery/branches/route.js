import { DeliveryController } from '@/modules/delivery/delivery.controller.js';

export async function GET(req) {
  return await DeliveryController.listBranches(req);
}
