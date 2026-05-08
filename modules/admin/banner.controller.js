import { BannerService } from '@/services/admin/banner.service.js';
import { dbConnect } from '@/config/database.js';

export class BannerController {
  /**
   * GET /api/admin/banners
   */
  static async listBanners(req) {
    try {
      await dbConnect();
      const { searchParams } = new URL(req.url);
      const sectionId = searchParams.get('sectionId');
      const banners = await BannerService.listBanners(sectionId);
      return Response.json({ success: true, data: banners }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * POST /api/admin/banners
   */
  static async createBanner(req) {
    try {
      await dbConnect();
      const formData = await req.formData();
      const section = formData.get('section');
      const location = formData.get('location');
      const viewUrl = formData.get('viewUrl');
      const whatsappLink = formData.get('whatsappLink');
      const storeLink = formData.get('storeLink');
      const order = parseInt(formData.get('order')) || 0;
      const imageFile = formData.get('image');

      if (!section || !imageFile) {
        return Response.json({ success: false, message: 'Section and Image are required' }, { status: 400 });
      }

      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const image = await BannerService.uploadBannerImage(
        buffer,
        imageFile.name,
        imageFile.type,
        section
      );

      const banner = await BannerService.createBanner({
        section,
        location,
        viewUrl,
        whatsappLink,
        storeLink,
        order,
        image
      });

      return Response.json({ success: true, data: banner }, { status: 201 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * PUT /api/admin/banners/[id]
   */
  static async updateBanner(req, { params }) {
    try {
      await dbConnect();
      const { id } = await params;
      const formData = await req.formData();
      
      const updateData = {};
      const fields = ['location', 'viewUrl', 'whatsappLink', 'storeLink', 'order', 'isActive'];
      fields.forEach(field => {
        if (formData.has(field)) {
          let value = formData.get(field);
          if (field === 'order') value = parseInt(value);
          if (field === 'isActive') value = value === 'true';
          updateData[field] = value;
        }
      });

      // Handle image update if present
      const imageFile = formData.get('image');
      if (imageFile && imageFile instanceof File) {
        const sectionId = formData.get('section'); // Need sectionId for folder path
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        updateData.image = await BannerService.uploadBannerImage(
          buffer,
          imageFile.name,
          imageFile.type,
          sectionId
        );
      }

      const banner = await BannerService.updateBanner(id, updateData);
      return Response.json({ success: true, data: banner }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * DELETE /api/admin/banners/[id]
   */
  static async deleteBanner(req, { params }) {
    try {
      await dbConnect();
      const { id } = await params;
      await BannerService.deleteBanner(id);
      return Response.json({ success: true, message: 'Banner deleted' }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
