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
  console.log(`[DEBUG] Vendor Upload Request Headers: ${contentType}`);

  let formData;
  
  // Robust Parsing Strategy (similar to update-profile fix)
  if (contentType.includes('multipart/form-data')) {
    try {
      formData = await req.formData();
    } catch (err) {
      console.error('[DEBUG] Native formData() failed:', err.message);
      return Response.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Failed to parse multipart data. ' + err.message,
        },
      }, { status: 400 });
    }
  } else {
    // Fallback: Check if the body contains a multipart boundary even if the header is wrong
    try {
      console.log(`[DEBUG] Branch: Buffer Fallback (Header was: ${contentType})`);
      const arrayBuffer = await req.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // ASCII 45 is '-' (multipart boundary prefix)
      if (buffer.length > 0 && buffer[0] === 45) {
        console.log(`[DEBUG] Detected multipart boundary in buffer, correcting headers...`);
        
        // Find the first line to extract the boundary
        let actualBoundary = '';
        let boundaryEnd = 0;
        for (let i = 0; i < 200 && i < buffer.length; i++) {
          if (buffer[i] === 13 && buffer[i+1] === 10) { // \r\n
            boundaryEnd = i;
            break;
          }
        }
        if (boundaryEnd > 2) {
          actualBoundary = new TextDecoder().decode(buffer.subarray(2, boundaryEnd)).trim();
        }

        const newHeaders = new Headers(req.headers);
        if (actualBoundary) {
          newHeaders.set('content-type', `multipart/form-data; boundary=${actualBoundary}`);
          console.log(`[DEBUG] Set corrected content-type with boundary: ${actualBoundary}`);
        } else {
          // Default fallback boundary check
          newHeaders.set('content-type', 'multipart/form-data');
        }

        const parsedReq = new Request(req.url, {
          method: req.method,
          headers: newHeaders,
          body: buffer,
          duplex: 'half'
        });

        formData = await parsedReq.formData();
      } else {
        return Response.json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid Content-Type. Use multipart/form-data for file uploads.',
          },
        }, { status: 400 });
      }
    } catch (err) {
      console.error('[DEBUG] Robust parsing failed:', err.message);
      return Response.json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Could not parse request body as multipart/form-data.',
        },
      }, { status: 400 });
    }
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
