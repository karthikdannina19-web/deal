import { SectionController } from "@/modules/section.controller.js";

/**
 * GET /api/sections
 */
export async function GET(req) {
  return await SectionController.listSections(req);
}
