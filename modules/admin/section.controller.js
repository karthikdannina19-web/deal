import { SectionService } from '@/services/admin/section.service.js';
import { dbConnect } from '@/config/database.js';

export class SectionController {
  /**
   * GET /api/admin/sections
   */
  static async listSections(req) {
    try {
      await dbConnect();
      const sections = await SectionService.getSectionStats();
      return Response.json({ success: true, data: sections }, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * POST /api/admin/sections
   */
  static async createSection(req) {
    try {
      await dbConnect();
      const formData = await req.formData();
      const name = formData.get('name');
      const description = formData.get('description');
      const order = parseInt(formData.get('order')) || 0;
      const isActive = formData.get('isActive') === 'true';
      const visibilityLevel = formData.get('visibilityLevel') || 'global';
      const visibilityStateId = formData.get('visibilityStateId') || null;
      const visibilityDistrictId = formData.get('visibilityDistrictId') || null;
      const visibilityMandalId = formData.get('visibilityMandalId') || null;
      
      console.log('Creating Section:', { name, description, order, isActive, visibilityLevel });

      const section = await SectionService.createSection({ 
        name, 
        description, 
        order,
        isActive,
        visibilityLevel,
        visibilityStateId,
        visibilityDistrictId,
        visibilityMandalId,
      });

      // Handle file uploads if present
      const imageFile = formData.get('image');
      if (imageFile && imageFile instanceof File) {
        console.log('Uploading section icon...');
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const asset = await SectionService.uploadSectionAsset(
          buffer, 
          imageFile.name, 
          imageFile.type, 
          section._id, 
          'image'
        );
        section.image = asset;
        await section.save();
      }

      return Response.json({ success: true, data: section }, { status: 201 });
    } catch (error) {
      console.error('Section Creation Error:', error);
      
      // Handle Mongoose duplicate key error
      if (error.code === 11000) {
        return Response.json({ 
          success: false, 
          message: 'A section with this name or slug already exists.' 
        }, { status: 400 });
      }

      return Response.json({ 
        success: false, 
        message: error.message || 'Failed to create section' 
      }, { status: 500 });
    }
  }

  /**
   * PUT /api/admin/sections/[id]
   */
  static async updateSection(req, { params }) {
    try {
      await dbConnect();
      const { id } = await params;
      const formData = await req.formData();
      
      const updateData = {};
      if (formData.has('name')) updateData.name = formData.get('name');
      if (formData.has('description')) updateData.description = formData.get('description');
      if (formData.has('order')) updateData.order = parseInt(formData.get('order'));
      if (formData.has('isActive')) updateData.isActive = formData.get('isActive') === 'true';
      if (formData.has('visibilityLevel')) updateData.visibilityLevel = formData.get('visibilityLevel') || 'global';
      if (formData.has('visibilityStateId')) updateData.visibilityStateId = formData.get('visibilityStateId') || null;
      if (formData.has('visibilityDistrictId')) updateData.visibilityDistrictId = formData.get('visibilityDistrictId') || null;
      if (formData.has('visibilityMandalId')) updateData.visibilityMandalId = formData.get('visibilityMandalId') || null;

      console.log('Updating Section:', id, updateData);

      const section = await SectionService.updateSection(id, updateData);

      // Handle file uploads
      const imageFile = formData.get('image');
      if (imageFile && imageFile instanceof File) {
        console.log('Updating section icon...');
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const asset = await SectionService.uploadSectionAsset(
          buffer, 
          imageFile.name, 
          imageFile.type, 
          section._id, 
          'image'
        );
        section.image = asset;
        await section.save();
      }

      return Response.json({ success: true, data: section }, { status: 200 });
    } catch (error) {
      console.error('Section Update Error:', error);
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  /**
   * DELETE /api/admin/sections/[id]
   */
  static async deleteSection(req, { params }) {
    try {
      await dbConnect();
      const { id } = await params;
      const result = await SectionService.deleteSection(id);
      return Response.json(result, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 400 });
    }
  }

  /**
   * POST /api/admin/sections/reorder
   */
  static async reorder(req) {
    try {
      await dbConnect();
      const { orders } = await req.json();
      const result = await SectionService.reorderSections(orders);
      return Response.json(result, { status: 200 });
    } catch (error) {
      return Response.json({ success: false, message: error.message }, { status: 500 });
    }
  }
}
