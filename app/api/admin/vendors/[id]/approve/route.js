import { AdminController } from '@/modules/admin/admin.controller.js';

export async function POST(req, { params }) {
  const body = await req.json();
  const nextReq = new Request(req.url, {
    method: 'PATCH',
    headers: req.headers,
    body: JSON.stringify({
      ...body,
      status: 'active',
    }),
    duplex: 'half',
  });

  return AdminController.updateVendorStatus(nextReq, { params });
}
