import { SectionController } from "@/modules/admin/section.controller.js";

/**
 * POST /api/admin/sections/reorder
 */
export async function POST(req) {
  return await SectionController.reorder(req);
}
