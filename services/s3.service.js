import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from 'crypto';

// Initialize S3 Client using AWS SDK v3
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  endpoint: `https://${process.env.AWS_S3_DOMAIN?.split('/')[0]}`, // e.g., sin1.contabostorage.com
  forcePathStyle: true, // Required for many S3-compatible providers like Contabo
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
      const fileExtension = file.name ? file.name.split('.').pop() : 'bin';
      const fileName = `${folder}/${crypto.randomUUID()}.${fileExtension}`;

      // 3. Setup S3 parameters
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream',
        ACL: 'public-read' // Contabo S3 supports public ACLs
      });

      // 4. Upload to S3
      await s3.send(command);

      // 5. Construct public URL manually (v3 does not return Location for PutObject)
      const endpointDomain = process.env.AWS_S3_DOMAIN.split('/')[0];
      const bucketName = process.env.AWS_BUCKET_NAME;
      const url = `https://${endpointDomain}/${encodeURIComponent(bucketName)}/${fileName}`;

      return {
        url: url,
        key: fileName,
        publicId: fileName // Mapping for compatibility with existing code
      };
    } catch (error) {
      // With SDK v3, we will get actual JSON errors from Contabo instead of XML parse failures!
      console.error('[S3Service.upload Error]:', error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   * @param {string} key File key (path in bucket)
   */
  static async delete(key) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      });
      await s3.send(command);
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
