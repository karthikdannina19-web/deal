import mongoose from 'mongoose';
import { dbConnect } from '@/config/database.js';
import { authenticate, authorize } from '@/middleware/auth.middleware.js';
import UserSubscription from '@/models/userSubscription.model.js';
import { verifyInvoiceToken } from '@/utils/invoiceToken.js';

function pdfText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/([\\()])/g, '\\$1');
}

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(value))
    : 'N/A';
}

function createInvoicePdf(subscription) {
  const invoiceNumber = `INV-${subscription._id.toString().slice(-8).toUpperCase()}`;
  const planName = subscription.planSnapshot?.name || subscription.plan?.name || 'Subscription Plan';
  const currency = subscription.planSnapshot?.currency || 'INR';
  const amount = subscription.finalAmount ?? subscription.amount ?? subscription.planSnapshot?.price ?? 0;
  const vendorName = subscription.vendor?.storeName
    || subscription.vendor?.fullName
    || 'Vendor';
  const transactionId = subscription.razorpayPaymentId
    || subscription.paymentId
    || subscription.razorpayOrderId
    || 'N/A';

  const rows = [
    ['Invoice number', invoiceNumber],
    ['Invoice date', formatDate(subscription.createdAt)],
    ['Billed to', vendorName],
    ['Plan', planName],
    ['Subscription period', `${formatDate(subscription.startDate)} - ${formatDate(subscription.trialEndDate || subscription.endDate)}`],
    ['Credits allocated', subscription.creditsAllocated ?? 0],
    ['Payment status', 'Paid'],
    ['Transaction ID', transactionId],
    ['Amount paid', `${currency} ${Number(amount).toFixed(2)}`],
  ];

  const contentLines = [
    'BT',
    '/F1 22 Tf',
    '50 790 Td',
    `(${pdfText('RHOCK - SUBSCRIPTION INVOICE')}) Tj`,
    '/F1 11 Tf',
    '0 -42 Td',
    ...rows.flatMap(([label, value]) => [
      `(${pdfText(`${label}: ${value}`)}) Tj`,
      '0 -25 Td',
    ]),
    '0 -20 Td',
    `(${pdfText('This invoice was generated electronically and requires no signature.')}) Tj`,
    'ET',
  ];
  const stream = contentLines.join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return {
    bytes: new TextEncoder().encode(pdf),
    filename: `${invoiceNumber}.pdf`,
  };
}

export async function GET(req, { params }) {
  try {
    await dbConnect();

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return Response.json({ status: false, message: 'Invoice not found' }, { status: 404 });
    }

    const downloadToken = new URL(req.url).searchParams.get('token');
    let userId;

    if (downloadToken) {
      try {
        const payload = verifyInvoiceToken(downloadToken);
        if (payload.subscriptionId !== id || !mongoose.isValidObjectId(payload.userId)) {
          return Response.json({ status: false, message: 'Invalid invoice link' }, { status: 403 });
        }
        userId = payload.userId;
      } catch {
        return Response.json({ status: false, message: 'Invoice link is invalid or expired' }, { status: 401 });
      }
    } else {
      const { user, error: authError } = await authenticate(req);
      if (authError) return authError;

      const roleError = authorize(user, ['vendor']);
      if (roleError) return roleError;
      userId = user.id;
    }

    const subscription = await UserSubscription.findOne({
      _id: id,
      user: userId,
      paymentStatus: 'completed',
    })
      .populate('plan', 'name slug')
      .populate('vendor', 'storeName fullName')
      .lean();

    if (!subscription) {
      return Response.json({ status: false, message: 'Invoice not found' }, { status: 404 });
    }

    const invoice = createInvoicePdf(subscription);
    return new Response(invoice.bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[VendorSubscriptionInvoice GET Error]', error);
    return Response.json({ status: false, message: 'Failed to generate invoice' }, { status: 500 });
  }
}
