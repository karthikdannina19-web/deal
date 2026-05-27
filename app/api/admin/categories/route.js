import { dbConnect } from '@/config/database.js';
import Category from '@/models/category.model.js';
import Section from '@/models/section.model.js';
import { S3Service } from '@/services/s3.service.js';
import { VisibilityService } from '@/services/visibility.service.js';
import { LocationMasterService } from '@/services/location-master.service.js';

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const query = {};
  if (searchParams.get('sectionId')) query.sectionId = searchParams.get('sectionId');
  const data = await Category.find(query).populate('sectionId', 'name slug order').sort({ name: 1 }).lean();
  return Response.json({ success: true, categories: data }, { status: 200 });
}

export async function POST(req) {
  await dbConnect();
  const formData = await req.formData();
  const name = formData.get('name');
  const isActive = formData.get('isActive') !== 'false';
  const sectionId = formData.get('sectionId');
  const visibilityLevel = formData.get('visibilityLevel') || 'global';
  const visibilityStateId = formData.get('visibilityStateId') || null;
  const visibilityDistrictId = formData.get('visibilityDistrictId') || null;
  const visibilityMandalId = formData.get('visibilityMandalId') || null;
  const icon = formData.get('icon');
  const image = formData.get('image');

  if (!name) return Response.json({ success: false, message: 'name is required' }, { status: 400 });
  if (!sectionId) return Response.json({ success: false, message: 'sectionId is required' }, { status: 400 });

  const section = await Section.findById(sectionId).select('_id');
  if (!section) return Response.json({ success: false, message: 'Invalid section' }, { status: 400 });

  const visibility = VisibilityService.normalizeVisibilityPayload({
    visibilityLevel,
    visibilityStateId,
    visibilityDistrictId,
    visibilityMandalId,
    visibilityEnabled: true,
  });
  if (visibility.visibilityStateId) {
    await LocationMasterService.validateHierarchy({
      stateId: visibility.visibilityStateId,
      districtId: visibility.visibilityDistrictId,
      mandalId: visibility.visibilityMandalId,
    });
  }

  const payload = {
    name: String(name).trim(),
    isActive,
    sectionId,
    ...visibility,
  };
  if (icon && icon.size > 0) {
    const up = await S3Service.upload(icon, 'categories/icons');
    payload.iconUrl = up.url;
  }
  if (image && image.size > 0) {
    const up = await S3Service.upload(image, 'categories/images');
    payload.imageUrl = up.url;
  }

  const created = await Category.create(payload);
  return Response.json({ success: true, category: created }, { status: 201 });
}
