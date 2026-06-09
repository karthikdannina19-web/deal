import { DeliveryController } from '@/modules/delivery/delivery.controller.js';

export async function POST(req) {
  return await DeliveryController.register(req);
}
