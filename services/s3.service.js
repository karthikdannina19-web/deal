import AWS from 'aws-sdk';
import crypto from 'crypto';

// Initialize S3 Client
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: `https://${process.env.AWS_S3_DOMAIN.split('/')[0]}`, // e.g., sin1.contabostorage.com
  s3ForcePathStyle: true, // Required for many S3-compatible providers
  signatureVersion: 'v4',
  region: process.env.AWS_REGION || 'SIN'
});

/**
 * S3 Storage Service
 * Handles media uploads to Contabo S3
 */
export class S3Service {
  /**
   * Upload a file to S3
   * @param {File|Blob} file File object from FormData
   * @param {string} folder Destination folder/prefix
   * @returns {Promise<Object>} Upload result with URL
   */
  static async upload(file, folder = 'general') {
    try {
      // 1. Prepare file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 2. Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `${folder}/${crypto.randomUUID()}.${fileExtension}`;

      // 3. Setup S3 parameters
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read' // Contabo S3 supports public ACLs
      };

      // 4. Upload to S3
      const result = await s3.upload(params).promise();

      return {
        url: result.Location,
        key: result.Key,
        publicId: result.Key // Mapping for compatibility with existing code
      };
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new Error('Storage upload failed: ' + error.message);
    }
  }

  /**
   * Delete a file from S3
   * @param {string} key File key (path in bucket)
   */
  static async delete(key) {
    try {
      await s3.deleteObject({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      }).promise();
    } catch (error) {
      console.error('S3 Delete Error:', error);
    }
  }
}

/**
 * Standalone upload utility (exported for compatibility)
 */
export const uploadToS3 = async (file, folder) => {
  return await S3Service.upload(file, folder);
};
