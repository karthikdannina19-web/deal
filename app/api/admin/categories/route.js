import { dbConnect } from '@/config/database.js';
import Category from '@/models/category.model.js';
import { S3Service } from '@/services/s3.service.js';

export async function GET() {
  await dbConnect();
  const data = await Category.find({}).sort({ name: 1 }).lean();
  return Response.json({ success: true, categories: data }, { status: 200 });
}

export async function POST(req) {
  await dbConnect();
  const formData = await req.formData();
  const name = formData.get('name');
  const isActive = formData.get('isActive') !== 'false';
  const icon = formData.get('icon');
  const image = formData.get('image');

  if (!name) return Response.json({ success: false, message: 'name is required' }, { status: 400 });

  const payload = { name: String(name).trim(), isActive };
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
