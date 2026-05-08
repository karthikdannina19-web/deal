import { SectionController } from "@/modules/admin/section.controller.js";

/**
 * PUT /api/admin/sections/[id]
 * DELETE /api/admin/sections/[id]
 */
export async function PUT(req, context) {
  return await SectionController.updateSection(req, context);
}

export async function DELETE(req, context) {
  return await SectionController.deleteSection(req, context);
}
