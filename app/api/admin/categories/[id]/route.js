import { dbConnect } from '@/config/database.js';
import Category from '@/models/category.model.js';
import Section from '@/models/section.model.js';
import { S3Service } from '@/services/s3.service.js';
import { VisibilityService } from '@/services/visibility.service.js';
import { LocationMasterService } from '@/services/location-master.service.js';

export async function PUT(req, { params }) {
  await dbConnect();
  const { id } = await params;
  const formData = await req.formData();

  const update = {};
  if (formData.has('name')) update.name = String(formData.get('name')).trim();
  if (formData.has('isActive')) update.isActive = formData.get('isActive') === 'true';
  if (formData.has('sectionId')) update.sectionId = formData.get('sectionId') || null;

  const hasVisibilityUpdate = ['visibilityLevel', 'visibilityStateId', 'visibilityDistrictId', 'visibilityMandalId'].some((field) => formData.has(field));
  if (hasVisibilityUpdate) {
    const visibility = VisibilityService.normalizeVisibilityPayload({
      visibilityLevel: formData.get('visibilityLevel') || 'global',
      visibilityStateId: formData.get('visibilityStateId') || null,
      visibilityDistrictId: formData.get('visibilityDistrictId') || null,
      visibilityMandalId: formData.get('visibilityMandalId') || null,
      visibilityEnabled: formData.get('visibilityEnabled') !== 'false',
    });
    if (visibility.visibilityStateId) {
      await LocationMasterService.validateHierarchy({
        stateId: visibility.visibilityStateId,
        districtId: visibility.visibilityDistrictId,
        mandalId: visibility.visibilityMandalId,
      });
    }
    Object.assign(update, visibility);
  }

  const icon = formData.get('icon');
  if (icon && icon.size > 0) {
    const up = await S3Service.upload(icon, 'categories/icons');
    update.iconUrl = up.url;
  }

  const image = formData.get('image');
  if (image && image.size > 0) {
    const up = await S3Service.upload(image, 'categories/images');
    update.imageUrl = up.url;
  }

  if (update.sectionId) {
    const section = await Section.findById(update.sectionId).select('_id');
    if (!section) {
      return Response.json({ success: false, message: 'Invalid section' }, { status: 400 });
    }
  }

  const category = await Category.findByIdAndUpdate(id, { $set: update }, { new: true }).populate('sectionId', 'name slug order');
  if (!category) return Response.json({ success: false, message: 'Category not found' }, { status: 404 });
  return Response.json({ success: true, category }, { status: 200 });
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { id } = await params;
  const category = await Category.findByIdAndDelete(id);
  if (!category) return Response.json({ success: false, message: 'Category not found' }, { status: 404 });
  return Response.json({ success: true }, { status: 200 });
}
