import { BannerController } from "@/modules/admin/banner.controller.js";

/**
 * PUT /api/admin/banners/[id]
 * DELETE /api/admin/banners/[id]
 */
export async function PUT(req, context) {
  return await BannerController.updateBanner(req, context);
}

export async function DELETE(req, context) {
  return await BannerController.deleteBanner(req, context);
}
