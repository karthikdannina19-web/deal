import { DeliveryController } from '@/modules/delivery/delivery.controller.js';

export async function POST(req) {
  return await DeliveryController.verifyOtp(req);
}
