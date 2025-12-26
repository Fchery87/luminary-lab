import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand, ListPartsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

let s3ClientSingleton: S3Client | null = null;

/**
 * Get bucket name based on configured storage provider
 */
function getBucketName(): string {
  if (process.env.CLOUDFLARE_R2_ACCOUNT_ID) {
    return process.env.CLOUDFLARE_R2_BUCKET_NAME!;
  }
  return process.env.AWS_S3_BUCKET!;
}

/**
 * Get S3 client singleton - supports both AWS S3 and Cloudflare R2
 */
function getS3Client(): S3Client {
  if (s3ClientSingleton) return s3ClientSingleton;

  // Check which provider to use (R2 or AWS S3)
  const useR2 = process.env.CLOUDFLARE_R2_ACCOUNT_ID;

  if (useR2) {
    // Cloudflare R2 Configuration
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error('Cloudflare R2 environment variables are not set. Please set: CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY, CLOUDFLARE_R2_BUCKET_NAME');
    }

    s3ClientSingleton = new S3Client({
      region: 'auto', // R2 always uses 'auto' for region
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    console.log('[S3/R2] Using Cloudflare R2 storage');
  } else {
    // AWS S3 Configuration (legacy)
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS S3 environment variables are not set. Please set: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET');
    }

    s3ClientSingleton = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    console.log('[S3/R2] Using AWS S3 storage');
  }

  return s3ClientSingleton;
}

export async function generateUploadUrl(
  key: string, 
  contentType: string, 
  expiresIn: number = 3600
): Promise<string> {
  const s3Client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    CacheControl: 'max-age=31536000', // 1 year
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function generateDownloadUrl(
  key: string, 
  expiresIn: number = 3600
): Promise<string> {
  const s3Client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function uploadFile(
  key: string, 
  buffer: Buffer, 
  contentType: string
): Promise<void> {
  const s3Client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'max-age=31536000',
  });

  await s3Client.send(command);
}

export async function deleteFile(key: string): Promise<void> {
  const s3Client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });

  await s3Client.send(command);
}

// Generate unique file key for storage
export function generateFileKey(
  userId: string, 
  projectId: string, 
  filename: string, 
  type: 'original' | 'processed' | 'thumbnail'
): string {
  const timestamp = Date.now();
  const hash = crypto.createHash('md5').update(filename).digest('hex');
  return `users/${userId}/projects/${projectId}/${type}/${timestamp}-${hash}`;
}

// Validate file type (RAW formats)
export const RAW_MIME_TYPES = {
  'image/x-canon-cr2': '.cr2',
  'image/x-nikon-nef': '.nef',
  'image/x-sony-arw': '.arw',
  'image/x-adobe-dng': '.dng',
  'image/x-fuji-raf': '.raf',
  'image/x-panasonic-rw2': '.rw2',
  'image/x-olympus-orf': '.orf',
  'image/x-pentax-pef': '.pef',
} as const;

// Extension to MIME type mapping for RAW files
export const RAW_EXTENSIONS_TO_MIME: Record<string, string> = {
  '.cr2': 'image/x-canon-cr2',
  '.nef': 'image/x-nikon-nef',
  '.arw': 'image/x-sony-arw',
  '.dng': 'image/x-adobe-dng',
  '.raf': 'image/x-fuji-raf',
  '.rw2': 'image/x-panasonic-rw2',
  '.orf': 'image/x-olympus-orf',
  '.pef': 'image/x-pentax-pef',
};

export function isValidRawFile(mimeType: string): boolean {
  return mimeType in RAW_MIME_TYPES;
}

// Determine MIME type from file extension (for RAW files where file.type is empty)
export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return RAW_EXTENSIONS_TO_MIME[ext] || '';
}

// ==================== Multipart Upload Support ====================

/**
 * Configuration for multipart uploads
 */
export interface MultipartUploadConfig {
  chunkSize: number; // Size of each part in bytes (must be >= 5MB)
  maxParts: number; // Maximum number of parts (AWS limit is 10,000)
}

export const DEFAULT_MULTIPART_CONFIG: MultipartUploadConfig = {
  chunkSize: 10 * 1024 * 1024, // 10MB per part
  maxParts: 10000,
};

/**
 * Calculate number of parts needed for a file
 * @param fileSize - Size of the file in bytes
 * @param config - Multipart upload configuration
 * @returns Number of parts
 */
export function calculatePartCount(fileSize: number, config: MultipartUploadConfig = DEFAULT_MULTIPART_CONFIG): number {
  return Math.ceil(fileSize / config.chunkSize);
}

/**
 * Create a new multipart upload
 * @param key - S3 object key
 * @param contentType - Content type
 * @returns Upload ID and parts information
 */
export async function createMultipartUpload(
  key: string,
  contentType: string
): Promise<{ uploadId: string; key: string }> {
  const s3Client = getS3Client();
  const command = new CreateMultipartUploadCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
    CacheControl: 'max-age=31536000', // 1 year
  });

  const response = await s3Client.send(command);

  if (!response.UploadId) {
    throw new Error('Failed to create multipart upload: No upload ID returned');
  }

  return {
    uploadId: response.UploadId,
    key,
  };
}

/**
 * Generate a presigned URL for uploading a specific part
 * @param key - S3 object key
 * @param uploadId - Multipart upload ID
 * @param partNumber - Part number (1-indexed)
 * @param expiresIn - URL expiration time in seconds
 * @returns Presigned URL for part upload
 */
export async function generatePartUploadUrl(
  key: string,
  uploadId: string,
  partNumber: number,
  expiresIn: number = 3600
): Promise<string> {
  const s3Client = getS3Client();
  const command = new UploadPartCommand({
    Bucket: getBucketName(),
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Upload a part to S3 server-side
 * @param key - S3 object key
 * @param uploadId - Multipart upload ID
 * @param partNumber - Part number
 * @param buffer - Part data buffer
 * @returns Part ETag
 */
export async function uploadPart(
  key: string,
  uploadId: string,
  partNumber: number,
  buffer: Buffer
): Promise<string> {
  const s3Client = getS3Client();
  const command = new UploadPartCommand({
    Bucket: getBucketName(),
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: buffer,
  });

  const response = await s3Client.send(command);

  if (!response.ETag) {
    throw new Error(`Failed to upload part ${partNumber}: No ETag returned`);
  }

  return response.ETag;
}

/**
 * List all uploaded parts for a multipart upload
 * @param key - S3 object key
 * @param uploadId - Multipart upload ID
 * @returns Array of uploaded parts with ETags
 */
export async function listParts(
  key: string,
  uploadId: string
): Promise<Array<{ partNumber: number; etag: string; size: number }>> {
  const s3Client = getS3Client();
  const command = new ListPartsCommand({
    Bucket: getBucketName(),
    Key: key,
    UploadId: uploadId,
  });

  const response = await s3Client.send(command);
  const parts = response.Parts || [];

  return parts.map((part) => ({
    partNumber: part.PartNumber!,
    etag: part.ETag!,
    size: part.Size!,
  }));
}

/**
 * Complete a multipart upload
 * @param key - S3 object key
 * @param uploadId - Multipart upload ID
 * @param parts - Array of parts with their ETags
 * @returns Location and ETag of the uploaded object
 */
export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>
): Promise<{ location: string; etag: string }> {
  const s3Client = getS3Client();
  const command = new CompleteMultipartUploadCommand({
    Bucket: getBucketName(),
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map((part) => ({
        PartNumber: part.partNumber,
        ETag: part.etag,
      })),
    },
  });

  try {
    const response = await s3Client.send(command);
    console.log('Multipart upload completed:', {
      key,
      uploadId,
      location: response.Location,
      etag: response.ETag,
    });

    return {
      location: response.Location || '',
      etag: response.ETag || '',
    };
  } catch (error) {
    console.error('Failed to complete multipart upload:', {
      key,
      uploadId,
      error,
      errorMessage: error instanceof Error ? error.message : String(error),
      partsCount: parts.length
    });
    throw error;
  }
}

/**
 * Abort a multipart upload and clean up parts
 * @param key - S3 object key
 * @param uploadId - Multipart upload ID
 */
export async function abortMultipartUpload(
  key: string,
  uploadId: string
): Promise<void> {
  const s3Client = getS3Client();
  const command = new AbortMultipartUploadCommand({
    Bucket: getBucketName(),
    Key: key,
    UploadId: uploadId,
  });

  await s3Client.send(command);
}

/**
 * Determine if a file should use multipart upload
 * @param fileSize - File size in bytes
 * @param threshold - Threshold in bytes (default: 10MB)
 * @returns true if multipart upload should be used
 */
export function shouldUseMultipartUpload(
  fileSize: number,
  threshold: number = 10 * 1024 * 1024
): boolean {
  return fileSize > threshold;
}
