import { dbConnect } from '@/config/database.js';
import Category from '@/models/category.model.js';
import { S3Service } from '@/services/s3.service.js';

export async function PUT(req, { params }) {
  await dbConnect();
  const { id } = await params;
  const formData = await req.formData();

  const update = {};
  if (formData.has('name')) update.name = String(formData.get('name')).trim();
  if (formData.has('isActive')) update.isActive = formData.get('isActive') === 'true';

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

  const category = await Category.findByIdAndUpdate(id, { $set: update }, { new: true });
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
