import crypto from 'crypto';

// ─── AWS Signature V4 Helpers ─────────────────────────────────────────────────

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretKey, dateStamp, region, service) {
  const kDate    = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion  = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

/**
 * Upload a buffer to Contabo S3 using a raw signed PUT request.
 * CRITICAL: For Contabo S3 with tenant:bucket names, we must NOT encode the colon or bucket path.
 */
async function putObjectRaw(bodyBuffer, contentType, key) {
  const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region          = process.env.AWS_REGION || 'SIN';
  const bucketName      = process.env.AWS_BUCKET_NAME;
  const s3Domain        = process.env.AWS_S3_DOMAIN.split('/')[0]; // sin1.contabostorage.com

  // For Contabo with tenant:bucket format, we use the bucket-as-path approach
  // The URL path includes the unencoded bucket name to preserve the colon
  const bucketPath = `/${bucketName}`;
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const host = s3Domain;
  const urlPath = `${bucketPath}/${encodedKey}`;
  const fullUrl = `https://${host}${urlPath}`;

  // Date/time stamps
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  // For UNSIGNED-PAYLOAD, we use this literal string instead of the actual payload hash
  const payloadHashForSigning = 'UNSIGNED-PAYLOAD';

  // ── Log everything for debugging ──────────────────────────────────────────
  console.log('[S3 SigV4 Debug] ─────────────────────────────────────');
  console.log(`  bucket        : ${bucketName}`);
  console.log(`  key           : ${key}`);
  console.log(`  region        : ${region}`);
  console.log(`  endpoint host : ${host}`);
  console.log(`  full URL      : ${fullUrl}`);
  console.log(`  x-amz-date    : ${amzDate}`);
  console.log(`  content-type  : ${contentType}`);
  console.log(`  body size     : ${bodyBuffer.length} bytes`);
  
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  console.log(`  credential scope: ${credentialScope}`);
  console.log(`  access key id   : ${accessKeyId.slice(0, 5)}...`);
  console.log('[S3 SigV4 Debug] ─────────────────────────────────────');

  // Build canonical headers (MUST be sorted by header name)
  // Include content-type to prevent tampering and signature mismatches
  const canonicalHeadersList = [
    `content-type:${contentType.toLowerCase()}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHashForSigning}`,
    `x-amz-date:${amzDate}`,
  ].sort();

  const canonicalHeaders = canonicalHeadersList.map(h => h + '\n').join('');
  const signedHeadersArray = canonicalHeadersList.map(h => h.split(':')[0]).sort();
  const signedHeaders = signedHeadersArray.join(';');

  console.log(`[S3 SigV4 Debug] Canonical Headers:\n${canonicalHeaders}`);
  console.log(`[S3 SigV4 Debug] Signed Headers: ${signedHeaders}`);

  // Build canonical request per AWS SigV4 spec
  const canonicalRequest = [
    'PUT',
    urlPath,
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHashForSigning,
  ].join('\n');

  console.log(`[S3 SigV4 Debug] Canonical Request:\n${canonicalRequest}`);

  // Build string to sign
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join('\n');

  console.log(`[S3 SigV4 Debug] String to Sign:\n${stringToSign}`);

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3');
  const signature = hmac(signingKey, stringToSign).toString('hex');

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  console.log(`[S3 SigV4 Debug] Calculated Signature: ${signature}`);

  // Make the request
  const response = await fetch(fullUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Host': host,
      'x-amz-content-sha256': payloadHashForSigning,
      'x-amz-date': amzDate,
      'Authorization': authHeader,
    },
    body: bodyBuffer,
  });

  // Always read and log the full response for debugging
  const responseText = await response.text();
  console.log(`[S3 Raw PUT] Contabo response → HTTP ${response.status}`);
  console.log(`[S3 Raw PUT] Contabo body (first 500 chars): ${responseText.substring(0, 500)}`);

  if (!response.ok) {
    throw new Error(`S3 upload failed (HTTP ${response.status}): ${responseText}`);
  }

  // Return the full URL using the bucket path (unencoded for Contabo)
  return `https://${host}${bucketPath}/${encodedKey}`;
}

// ─── Public Service ───────────────────────────────────────────────────────────

/**
 * S3 Storage Service
 * Handles media uploads to Contabo S3 via raw signed HTTP (no AWS SDK).
 */
export class S3Service {
  /**
   * Upload a file to S3
   * @param {File|Blob} file   File object from FormData
   * @param {string}   folder  Destination folder/prefix (e.g. "profiles")
   * @returns {Promise<{url: string, key: string, publicId: string}>}
   */
  static async upload(file, folder = 'general', customName = null, customType = null) {
    // ── Materialise the bytes BEFORE anything else ─────────────────────────
    const buffer = typeof file.arrayBuffer === 'function'
      ? Buffer.from(await file.arrayBuffer())
      : file;

    if (!buffer || buffer.length === 0) {
      throw new Error('Upload file is empty (0 bytes).');
    }

    const extension = (customName || file.name || 'upload').split('.').pop().toLowerCase() || 'bin';
    const key = `${folder}/${crypto.randomUUID()}.${extension}`;
    
    const mimeMap = {
      'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
      'gif': 'image/gif', 'webp': 'image/webp', 'pdf': 'application/pdf'
    };

    const contentType = customType || (file.type && file.type !== 'application/octet-stream'
      ? file.type
      : (mimeMap[extension] || 'image/jpeg'));

    console.log(`[S3Service.upload] Uploading: ${customName || file.name || 'raw_buffer'} (${buffer.length} bytes)`);

    const url = await putObjectRaw(buffer, contentType, key);

    return { url, key, publicId: key };
  }

  /**
   * Delete a file from S3 via a raw signed DELETE request.
   * @param {string} key  File key (path inside the bucket)
   */
  static async delete(key) {
    try {
      const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const region          = process.env.AWS_REGION || 'SIN';
      const bucketName      = process.env.AWS_BUCKET_NAME;
      const s3Domain        = process.env.AWS_S3_DOMAIN.split('/')[0];

      const bucketPath = `/${bucketName}`;
      const encodedKey = key.split('/').map(encodeURIComponent).join('/');
      const host = s3Domain;
      const urlPath = `${bucketPath}/${encodedKey}`;
      const fullUrl = `https://${host}${urlPath}`;

      const now = new Date();
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
      const dateStamp = amzDate.slice(0, 8);
      
      const payloadHashForSigning = '';
      
      const canonicalHeadersList = [
        `host:${host}`,
        `x-amz-content-sha256:${sha256hex('')}`,
        `x-amz-date:${amzDate}`,
      ].sort();

      const canonicalHeaders = canonicalHeadersList.map(h => h + '\n').join('');
      const signedHeadersArray = canonicalHeadersList.map(h => h.split(':')[0]);
      const signedHeaders = signedHeadersArray.join(';');

      const canonicalRequest = [
        'DELETE',
        urlPath,
        '',
        canonicalHeaders,
        signedHeaders,
        sha256hex(''),
      ].join('\n');

      const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256hex(canonicalRequest),
      ].join('\n');

      const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3');
      const signature = hmac(signingKey, stringToSign).toString('hex');
      const authHeader =
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`;

      const response = await fetch(fullUrl, {
        method: 'DELETE',
        headers: {
          'Host': host,
          'x-amz-content-sha256': sha256hex(''),
          'x-amz-date': amzDate,
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[S3Service.delete] HTTP ${response.status}: ${errText}`);
      }
    } catch (error) {
      console.error('[S3Service.delete Error]:', error);
    }
  }
}

/**
 * Standalone upload utility (exported for compatibility)
 */
export const uploadToS3 = async (file, folder, customName, customType) => {
  return await S3Service.upload(file, folder, customName, customType);
};
