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
      const filters = {
        sectionId: searchParams.get('section') || searchParams.get('sectionId'),
        categoryId: searchParams.get('categoryId') || searchParams.get('category'),
        visibilityLevel: searchParams.get('visibilityLevel'),
        stateId: searchParams.get('stateId'),
        districtId: searchParams.get('districtId'),
        mandalId: searchParams.get('mandalId'),
      };
      const banners = await BannerService.listBanners(filters);
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
      const locationLabel = formData.get('locationLabel');
      const state = formData.get('state');
      const district = formData.get('district');
      const mandal = formData.get('mandal');
      const visibilityLevel = formData.get('visibilityLevel');
      const visibilityStateId = formData.get('visibilityStateId');
      const visibilityDistrictId = formData.get('visibilityDistrictId');
      const visibilityMandalId = formData.get('visibilityMandalId');
      const title = formData.get('title');
      const categoryId = formData.get('categoryId') || null;
      const isTopBanner = formData.get('isTopBanner') === 'true';
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
        categoryId,
        title,
        location,
        locationLabel,
        state,
        district,
        mandal,
        visibilityLevel: visibilityLevel || null,
        visibilityStateId: visibilityStateId || null,
        visibilityDistrictId: visibilityDistrictId || null,
        visibilityMandalId: visibilityMandalId || null,
        isTopBanner,
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
      const fields = ['section', 'categoryId', 'location', 'locationLabel', 'state', 'district', 'mandal', 'visibilityLevel', 'visibilityStateId', 'visibilityDistrictId', 'visibilityMandalId', 'viewUrl', 'whatsappLink', 'storeLink', 'order', 'isActive', 'title'];
      fields.forEach(field => {
        if (formData.has(field)) {
          let value = formData.get(field);
          if (field === 'order') value = parseInt(value);
          if (field === 'isActive') value = value === 'true';
          if (['categoryId', 'visibilityLevel', 'visibilityStateId', 'visibilityDistrictId', 'visibilityMandalId'].includes(field) && !value) {
            value = null;
          }
          updateData[field] = value;
        }
      });

      // Handle image update if present
      const imageFile = formData.get('image');
      if (imageFile && typeof imageFile.arrayBuffer === 'function') {
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
