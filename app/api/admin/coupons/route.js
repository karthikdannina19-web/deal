import { dbConnect } from '@/config/database.js';
import { authenticate, authorize } from '@/middleware/auth.middleware.js';
import Coupon from '@/models/coupon.model.js';
import { S3Service } from '@/services/s3.service.js';

export async function GET(req) {
  await dbConnect();
  const { user, error } = await authenticate(req);
  if (error) return error;
  const roleError = authorize(user, ['admin']);
  if (roleError) return roleError;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));
  const skip = (page - 1) * limit;
  const q = searchParams.get('q');
  const isActive = searchParams.get('isActive');

  const query = {};
  if (isActive === 'true' || isActive === 'false') query.isActive = isActive === 'true';
  if (q) query.$or = [{ title: { $regex: q, $options: 'i' } }, { category: { $regex: q, $options: 'i' } }];

  const [data, total] = await Promise.all([
    Coupon.find(query).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Coupon.countDocuments(query),
  ]);
  return Response.json({ success: true, data, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } }, { status: 200 });
}

export async function POST(req) {
  await dbConnect();
  const { user, error } = await authenticate(req);
  if (error) return error;
  const roleError = authorize(user, ['admin']);
  if (roleError) return roleError;

  const contentType = req.headers.get('content-type') || '';
  let payload = {};

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    payload = {
      title: formData.get('title'),
      subtitle: formData.get('subtitle'),
      category: formData.get('category'),
      storeName: formData.get('storeName'),
      terms: formData.get('terms'),
      ctaLink: formData.get('ctaLink'),
      couponCode: formData.get('couponCode'),
      isCodeUserSpecific: formData.get('isCodeUserSpecific') === 'true',
      isActive: formData.get('isActive') !== 'false',
      order: Number(formData.get('order') || 0),
      expiryDate: formData.get('expiryDate') || null,
    };
    const image = formData.get('image');
    if (image && image.size > 0) {
      const upload = await S3Service.upload(image, 'coupons');
      payload.imageUrl = upload.url;
    }
  } else {
    const body = await req.json();
    payload = {
      title: body.title,
      subtitle: body.subtitle,
      category: body.category,
      imageUrl: body.image || body.imageUrl || '',
      storeName: body.storeName || '',
      terms: body.terms || '',
      ctaLink: body.ctaLink || '',
      couponCode: body.couponCode || '',
      isCodeUserSpecific: !!body.isCodeUserSpecific,
      isActive: body.isActive !== false,
      order: Number(body.sortOrder ?? body.order ?? 0),
      expiryDate: body.expiryDate || null,
    };
  }

  if (!payload.title || !payload.subtitle || !payload.imageUrl) {
    return Response.json({ 
      success: false, 
      message: 'Title, Subtitle, and Image URL are mandatory for all coupons.' 
    }, { status: 400 });
  }

  // Ensure coupon code is present for standard coupons to prevent app errors
  if (!payload.isCodeUserSpecific && !payload.couponCode) {
    return Response.json({ 
      success: false, 
      message: 'Coupon code is required for standard coupons. Please provide a valid code.' 
    }, { status: 400 });
  }

  if (payload.couponCode) {
    payload.couponCode = payload.couponCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  // Robustness check for imageUrl to prevent CastError
  if (typeof payload.imageUrl !== 'string') {
    console.error('[API Coupons] Invalid imageUrl type:', typeof payload.imageUrl, payload.imageUrl);
    payload.imageUrl = ''; 
  }

  try {
    const created = await Coupon.create(payload);
    return Response.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error('[API Coupons] Create Error:', err);
    return Response.json({ 
      success: false, 
      message: err.message || 'Failed to create coupon',
      errors: err.errors
    }, { status: 500 });
  }
}
