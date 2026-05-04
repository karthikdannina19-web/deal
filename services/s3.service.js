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
 * Bypasses the AWS SDK XML parser — Contabo returns JSON errors which the SDK can't handle.
 */
async function putObjectRaw(bodyBuffer, contentType, key) {
  const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region          = process.env.AWS_REGION || 'SIN';
  const bucketName      = process.env.AWS_BUCKET_NAME;
  const s3Domain        = process.env.AWS_S3_DOMAIN.split('/')[0]; // sin1.contabostorage.com

  // Encode bucket name safely (handles the colon in Contabo tenant:bucket names)
  const encodedBucket = encodeURIComponent(bucketName);
  const encodedKey    = key.split('/').map(encodeURIComponent).join('/');
  const host          = s3Domain;
  const urlPath       = `/${encodedBucket}/${encodedKey}`;
  const fullUrl       = `https://${host}${urlPath}`;

  // Date/time stamps
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256hex(bodyBuffer);

  // ── Log everything the reviewer asked for ──────────────────────────────────
  console.log('[S3 SigV4 Debug] ─────────────────────────────────────');
  console.log(`  bucket        : ${bucketName}`);
  console.log(`  key           : ${key}`);
  console.log(`  region        : ${region}`);
  console.log(`  endpoint host : ${host}`);
  console.log(`  full URL      : ${fullUrl}`);
  console.log(`  x-amz-date    : ${amzDate}`);
  console.log(`  content-type  : ${contentType}`);
  console.log(`  body size     : ${bodyBuffer.length} bytes`);
  console.log(`  payload hash  : ${payloadHash}`);
  
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  console.log(`  credential scope: ${credentialScope}`);
  console.log(`  access key id   : ${accessKeyId.slice(0, 5)}...`);
  console.log('[S3 SigV4 Debug] ─────────────────────────────────────');

  // Canonical headers
  // Using UNSIGNED-PAYLOAD makes the signature much more resilient to any 
  // modifications by intermediate proxies or fetch implementation details.
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:UNSIGNED-PAYLOAD\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    urlPath,
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD', // Hash of payload is replaced by this literal
  ].join('\n');

  // credentialScope already declared above for logging
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, 's3');
  const signature  = hmac(signingKey, stringToSign).toString('hex');

  const authHeader =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // NOTE: Do NOT manually set Content-Length — it is a "forbidden" header in
  // the Fetch API (Node.js undici/Vercel) and setting it causes the request
  // to be dropped or malformed. Let fetch calculate it automatically from the body.
  const response = await fetch(fullUrl, {
    method: 'PUT',
    headers: {
      'Host':                 host,
      'Content-Type':         contentType,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date':           amzDate,
      'Authorization':        authHeader,
    },
    body: bodyBuffer, // Buffer — confirmed as materialised bytes, NOT a stream
  });

  // Always read and log the full Contabo response so we can diagnose issues
  const responseText = await response.text();
  console.log(`[S3 Raw PUT] Contabo response → HTTP ${response.status}`);
  console.log(`[S3 Raw PUT] Contabo body     → ${responseText}`);

  if (!response.ok) {
    throw new Error(`S3 upload failed (HTTP ${response.status}): ${responseText}`);
  }

  return `https://${host}/${encodedBucket}/${encodedKey}`;
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
  static async upload(file, folder = 'general') {
    // ── Materialise the bytes BEFORE anything else ─────────────────────────
    // Calling file.arrayBuffer() here converts the Web ReadableStream (from
    // Next.js multipart parsing) into a concrete Buffer in memory.
    // This is safe and does NOT double-consume the stream.
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error('Upload file is empty (0 bytes). The stream may have been consumed before reaching this point.');
    }

    const extension   = (file.name || 'upload').split('.').pop().toLowerCase() || 'bin';
    const key         = `${folder}/${crypto.randomUUID()}.${extension}`;
    const mimeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf'
    };
    const contentType = file.type && file.type !== 'application/octet-stream'
      ? file.type
      : (mimeMap[extension] || 'image/jpeg');

    console.log(`[S3Service.upload] Starting upload:`);
    console.log(`  file.name    : ${file.name}`);
    console.log(`  file.type    : ${file.type}`);
    console.log(`  buffer.length: ${buffer.length} bytes  ← actual materialised bytes`);
    console.log(`  key          : ${key}`);
    console.log(`  contentType  : ${contentType} (used in signing)`);

    const url = await putObjectRaw(buffer, contentType, key);

    console.log(`[S3Service.upload] ✅ Done → ${url}`);
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

      const encodedBucket    = encodeURIComponent(bucketName);
      const encodedKey       = key.split('/').map(encodeURIComponent).join('/');
      const host             = s3Domain;
      const urlPath          = `/${encodedBucket}/${encodedKey}`;
      const now              = new Date();
      const amzDate          = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
      const dateStamp        = amzDate.slice(0, 8);
      const payloadHash      = sha256hex('');
      const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
      const signedHeaders    = 'host;x-amz-content-sha256;x-amz-date';
      const canonicalRequest = `DELETE\n${urlPath}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
      const credentialScope  = `${dateStamp}/${region}/s3/aws4_request`;
      const stringToSign     = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256hex(canonicalRequest)}`;
      const signingKey       = getSigningKey(secretAccessKey, dateStamp, region, 's3');
      const signature        = hmac(signingKey, stringToSign).toString('hex');
      const authHeader       =
        `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`;

      const response = await fetch(`https://${host}${urlPath}`, {
        method: 'DELETE',
        headers: {
          'x-amz-content-sha256': payloadHash,
          'x-amz-date':           amzDate,
          'Authorization':        authHeader,
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
export const uploadToS3 = async (file, folder) => {
  return await S3Service.upload(file, folder);
};
