import { SectionController } from "@/modules/admin/section.controller.js";

/**
 * GET /api/admin/sections
 * POST /api/admin/sections
 */
export async function GET(req) {
  return await SectionController.listSections(req);
}

export async function POST(req) {
  return await SectionController.createSection(req);
}
