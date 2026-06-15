import { dbConnect } from '@/config/database.js';
import { authenticate, authorize } from '@/middleware/auth.middleware.js';
import Coupon from '@/models/coupon.model.js';
import { S3Service } from '@/services/s3.service.js';

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error } = await authenticate(req);
  if (error) return error;
  const roleError = authorize(user, ['admin']);
  if (roleError) return roleError;

  const { id } = await params;
  const contentType = req.headers.get('content-type') || '';
  const update = {};

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const fields = ['title', 'subtitle', 'category', 'storeName', 'terms', 'ctaLink', 'couponCode', 'expiryDate'];
    for (const field of fields) if (formData.has(field)) update[field] = formData.get(field);
    if (formData.has('isCodeUserSpecific')) update.isCodeUserSpecific = formData.get('isCodeUserSpecific') === 'true';
    if (formData.has('isActive')) update.isActive = formData.get('isActive') === 'true';
    if (formData.has('order')) update.order = Number(formData.get('order') || 0);
    // Location
    if (formData.has('visibilityScope')) update.visibilityScope = formData.get('visibilityScope');
    if (formData.has('stateId')) update.stateId = formData.get('stateId') || null;
    if (formData.has('districtId')) update.districtId = formData.get('districtId') || null;
    if (formData.has('mandalId')) update.mandalId = formData.get('mandalId') || null;
    const image = formData.get('image');
    if (image && image.size > 0) {
      const upload = await S3Service.upload(image, 'coupons');
      update.imageUrl = upload.url;
    }
  } else {
    const body = await req.json();
    if (body.title !== undefined) update.title = body.title;
    if (body.subtitle !== undefined) update.subtitle = body.subtitle;
    if (body.description !== undefined && update.subtitle === undefined) update.subtitle = body.description;
    if (body.category !== undefined) update.category = body.category;
    if (body.image !== undefined) update.imageUrl = body.image;
    if (body.imageUrl !== undefined) update.imageUrl = body.imageUrl;
    if (body.storeName !== undefined) update.storeName = body.storeName;
    if (body.terms !== undefined) update.terms = body.terms;
    if (body.ctaLink !== undefined) update.ctaLink = body.ctaLink;
    if (body.couponCode !== undefined) update.couponCode = body.couponCode;
    if (body.isCodeUserSpecific !== undefined) update.isCodeUserSpecific = !!body.isCodeUserSpecific;
    if (body.isActive !== undefined) update.isActive = !!body.isActive;
    if (body.sortOrder !== undefined) update.order = Number(body.sortOrder);
    if (body.order !== undefined && body.sortOrder === undefined) update.order = Number(body.order);
    if (body.expiryDate !== undefined) update.expiryDate = body.expiryDate;
    // Location
    if (body.visibilityScope !== undefined) update.visibilityScope = body.visibilityScope;
    if (body.stateId !== undefined) update.stateId = body.stateId || null;
    if (body.districtId !== undefined) update.districtId = body.districtId || null;
    if (body.mandalId !== undefined) update.mandalId = body.mandalId || null;
  }

  // Basic validation for updates
  if (update.isCodeUserSpecific === false && update.couponCode === "") {
    return Response.json({ 
      success: false, 
      message: 'Coupon code cannot be empty for standard coupons.' 
    }, { status: 400 });
  }

  const coupon = await Coupon.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!coupon) return Response.json({ success: false, message: 'Coupon not found' }, { status: 404 });
  return Response.json({ success: true, data: coupon }, { status: 200 });
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error } = await authenticate(req);
  if (error) return error;
  const roleError = authorize(user, ['admin']);
  if (roleError) return roleError;
  const { id } = await params;
  const deleted = await Coupon.findByIdAndDelete(id);
  if (!deleted) return Response.json({ success: false, message: 'Coupon not found' }, { status: 404 });
  return Response.json({ success: true }, { status: 200 });
}
