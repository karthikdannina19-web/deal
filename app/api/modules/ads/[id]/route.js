/**
 * GET    /api/modules/ads/[id]          — Get single ad
 * PUT    /api/modules/ads/[id]          — Update ad
 * DELETE /api/modules/ads/[id]          — Soft-delete ad
 */

import { dbConnect } from '../../../../../config/database.js';
import { getAd, updateAd, deleteAd } from '../../../../../services/ad.service.js';
import { asyncHandler } from '../../../../../utils/errorHandler.js';

// ==========================================
// GET — Single ad details
// ==========================================
export const GET = asyncHandler(async (req) => {
  await dbConnect();

  const url = new URL(req.url);
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const adId = segments[segments.length - 1];

  const trackView = url.searchParams.get('track') === 'true';
  const viewerId = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  const ad = await getAd(adId, trackView, viewerId);

  return Response.json({
    success: true,
    message: 'Ad fetched successfully',
    data: { ad },
  });
});

// ==========================================
// PUT — Update ad
// ==========================================
export const PUT = asyncHandler(async (req) => {
  await dbConnect();

  const url = new URL(req.url);
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const adId = segments[segments.length - 1];

  const body = await req.json();
  const userId = body.userId || req.headers.get('x-user-id');

  if (!userId) {
    return Response.json({
      success: false,
      error: { type: 'AUTHENTICATION_ERROR', message: 'User ID is required' },
    }, { status: 401 });
  }

  const ad = await updateAd(adId, userId, body);

  return Response.json({
    success: true,
    message: 'Ad updated successfully',
    data: { ad },
  });
});

// ==========================================
// DELETE — Soft-delete ad
// ==========================================
export const DELETE = asyncHandler(async (req) => {
  await dbConnect();

  const url = new URL(req.url);
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const adId = segments[segments.length - 1];

  const body = await req.json().catch(() => ({}));
  const userId = body.userId || req.headers.get('x-user-id');

  if (!userId) {
    return Response.json({
      success: false,
      error: { type: 'AUTHENTICATION_ERROR', message: 'User ID is required' },
    }, { status: 401 });
  }

  const result = await deleteAd(adId, userId);

  return Response.json({
    success: true,
    message: 'Ad deleted successfully',
    data: {
      adId: result.ad._id,
      status: result.ad.status,
      creditRefunded: result.refund.refunded,
      creditsRefunded: result.refund.creditsRefunded,
    },
    remainingCredits: result.refund.remainingCredits,
    creditSummary: result.refund.creditSummary,
  });
});
