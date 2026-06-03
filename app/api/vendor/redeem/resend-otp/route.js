import { RedemptionsController } from '@/modules/redemptions/redemptions.controller.js';

export async function POST(req) {
  return await RedemptionsController.vendorResendRedeemOtp(req);
}
