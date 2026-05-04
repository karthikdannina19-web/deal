/**
 * POST /api/modules/vendor/upload
 * 
 * Upload vendor documents (logo, ID proof, certificate, etc.)
 * Expects multipart/form-data with file field
 */

import { dbConnect } from '../../../../../config/database.js';
import { uploadVendorDocument } from '../../../../../services/vendor.service.js';
import { asyncHandler } from '../../../../../utils/errorHandler.js';

export const POST = asyncHandler(async (req) => {
  await dbConnect();

  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return Response.json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Invalid Content-Type. Use multipart/form-data for file uploads.',
      },
    }, { status: 400 });
  }

  let formData;
  try {
    formData = await req.formData();
  } catch (err) {
    return Response.json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Failed to parse form data. Ensure request is multipart/form-data with a file field.',
      },
    }, { status: 400 });
  }

  const file = formData.get('file');
  const vendorId = formData.get('vendorId');
  const docType = formData.get('docType');

  if (!file) {
    return Response.json({
      success: false,
      error: { type: 'VALIDATION_ERROR', message: 'File is required' },
    }, { status: 400 });
  }

  if (!vendorId) {
    return Response.json({
      success: false,
      error: { type: 'VALIDATION_ERROR', message: 'Vendor ID is required' },
    }, { status: 400 });
  }

  if (!docType) {
    return Response.json({
      success: false,
      error: { type: 'VALIDATION_ERROR', message: 'Document type is required (logo, id_proof, certificate, bank_cheque)' },
    }, { status: 400 });
  }

  // Validate file size (max 5MB)
  const fileSize = file.size || 0;
  if (fileSize > 5 * 1024 * 1024) {
    return Response.json({
      success: false,
      error: { type: 'VALIDATION_ERROR', message: 'File size must be less than 5MB' },
    }, { status: 400 });
  }

  // Validate file type: allow any image mime type plus PDF
  const allowedTypes = ['application/pdf'];
  const mimeType = file.type;
  const isImage = typeof mimeType === 'string' && mimeType.startsWith('image/');
  if (!isImage && !allowedTypes.includes(mimeType)) {
    return Response.json({
      success: false,
      error: { type: 'VALIDATION_ERROR', message: 'Only image files or PDF are allowed' },
    }, { status: 400 });
  }

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Determine filename for S3
  const fileName = `${docType}_${file.name || 'upload'}`;

  // Upload to S3
  const result = await uploadVendorDocument(buffer, fileName, mimeType, vendorId);

  return Response.json({
    success: true,
    message: 'Document uploaded successfully',
    data: {
      url: result.url,
      key: result.key,
      size: result.size,
    },
  });
});
