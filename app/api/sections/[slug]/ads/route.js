import { SectionController } from "@/modules/section.controller.js";

/**
 * GET /api/sections/[slug]/ads
 */
export async function GET(req, context) {
  return await SectionController.getSectionAds(req, context);
}
