/**
 * POST /api/modules/payment/verify
 * 
 * Verify Razorpay payment after checkout completion
 */

import { dbConnect } from '../../../../../config/database.js';
import { PaymentService } from '../../../../../modules/payment/payment.service.js';
import { asyncHandler } from '../../../../../utils/errorHandler.js';

export const POST = asyncHandler(async (req) => {
  await dbConnect();

  const body = await req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  const userId = body.userId || req.headers.get('x-user-id');

  if (!userId) {
    return Response.json({
      success: false,
      error: { type: 'AUTHENTICATION_ERROR', message: 'User ID is required' },
    }, { status: 401 });
  }

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return Response.json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required',
      },
    }, { status: 400 });
  }

  const result = await PaymentService.verifyAndActivateSubscription(userId, {
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature
  });

  return Response.json({
    success: true,
    message: 'Payment verified and subscription activated',
    data: {
      subscription: result,
    },
  });
});

