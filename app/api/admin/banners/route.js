import { BannerController } from "@/modules/admin/banner.controller.js";

/**
 * GET /api/admin/banners
 * POST /api/admin/banners
 */
export async function GET(req) {
  return await BannerController.listBanners(req);
}

export async function POST(req) {
  return await BannerController.createBanner(req);
}
