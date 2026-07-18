import QRCode from 'qrcode';
import { dbConnect } from '@/config/database.js';
import Vendor from '@/models/vendor.model.js';

const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(req, { params }) {
  try {
    const { slug } = await params;

    if (!slug || slug.length > 150 || !VALID_SLUG.test(slug)) {
      return Response.json({ success: false, message: 'QR code not found' }, { status: 404 });
    }

    await dbConnect();
    const vendor = await Vendor.findOne({
      slug,
      is_deleted: { $ne: true },
      account_status: { $ne: 'DELETED' },
      deletedAt: null,
    }).select('slug').lean();

    if (!vendor) {
      return Response.json({ success: false, message: 'QR code not found' }, { status: 404 });
    }

    const destinationUrl = `${new URL(req.url).origin}/v/${vendor.slug}`;
    const png = await QRCode.toBuffer(destinationUrl, {
      type: 'png',
      width: 1024,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${vendor.slug}-qr.png"`,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[VendorQrDownload GET Error]', error);
    return Response.json({ success: false, message: 'Failed to generate QR code' }, { status: 500 });
  }
}
