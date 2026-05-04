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
 * Upload a buffer to an S3-compatible endpoint using a raw signed PUT request.
 * Works reliably with Contabo Object Storage (which returns JSON errors, not XML)
 * because we bypass the AWS SDK's XML error parser entirely.
 */
async function putObjectRaw(bodyBuffer, contentType, key) {
  const accessKeyId     = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region          = process.env.AWS_REGION || 'SIN';
  const bucketName      = process.env.AWS_BUCKET_NAME;              // e.g. "d9a91b8a...:hotelrockdale"
  const s3Domain        = process.env.AWS_S3_DOMAIN.split('/')[0];  // e.g. "sin1.contabostorage.com"

  // Encode bucket name safely (handles the colon in Contabo tenant:bucket names)
  const encodedBucket = encodeURIComponent(bucketName);
  const encodedKey    = key.split('/').map(encodeURIComponent).join('/');

  const host    = s3Domain;
  const urlPath = `/${encodedBucket}/${encodedKey}`;

  // Date/time stamps
  const now       = new Date();
  const amzDate   = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256hex(bodyBuffer);

  // Canonical headers (alphabetically sorted)
  const canonicalHeaders =
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-acl:public-read\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = 'content-type;host;x-amz-acl;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    'PUT',
    urlPath,
    '',   // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
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

  const response = await fetch(`https://${host}${urlPath}`, {
    method: 'PUT',
    headers: {
      'Content-Type':         contentType,
      'x-amz-acl':            'public-read',
      'x-amz-content-sha256': payloadHash,
      'x-amz-date':           amzDate,
      'Authorization':        authHeader,
      'Content-Length':       String(bodyBuffer.length),
    },
    body: bodyBuffer,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`[S3 Raw PUT] HTTP ${response.status}: ${errText}`);
    throw new Error(`S3 upload failed (HTTP ${response.status}): ${errText}`);
  }

  // Construct and return the public URL
  return `https://${host}/${encodedBucket}/${encodedKey}`;
}

// ─── Public Service ───────────────────────────────────────────────────────────

/**
 * S3 Storage Service
 * Handles media uploads to Contabo S3 via raw signed HTTP requests (no SDK dependency).
 */
export class S3Service {
  /**
   * Upload a file to S3
   * @param {File|Blob} file   File object from FormData
   * @param {string}   folder  Destination folder/prefix (e.g. "profiles")
   * @returns {Promise<{url: string, key: string, publicId: string}>}
   */
  static async upload(file, folder = 'general') {
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);
    const extension   = (file.name || 'upload').split('.').pop().toLowerCase() || 'bin';
    const key         = `${folder}/${crypto.randomUUID()}.${extension}`;
    const contentType = file.type || 'application/octet-stream';

    console.log(`[S3Service.upload] key=${key} size=${buffer.length} type=${contentType}`);

    const url = await putObjectRaw(buffer, contentType, key);

    console.log(`[S3Service.upload] Success → ${url}`);
    return { url, key, publicId: key };
  }

  /**
   * Delete a file from S3 using a raw signed DELETE request.
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
