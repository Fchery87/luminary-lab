/**
 * Server-side thumbnail generation utility using Sharp
 * Supports various image formats including RAW files
 */

import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { db, images } from '@/db';
import { v7 as uuidv7 } from 'uuid';
import { generateDownloadUrl, uploadFile } from './s3';
import { detectMimeType, isImageMimeType } from './mime-types';

/**
 * Thumbnail generation configuration
 */
export interface ThumbnailConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

/**
 * Default thumbnail configurations
 */
export const DEFAULT_THUMBNAIL_CONFIGS: Record<string, ThumbnailConfig> = {
  small: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 85,
    format: 'jpeg',
    fit: 'cover',
  },
  medium: {
    maxWidth: 400,
    maxHeight: 300,
    quality: 90,
    format: 'jpeg',
    fit: 'cover',
  },
  large: {
    maxWidth: 800,
    maxHeight: 600,
    quality: 95,
    format: 'webp',
    fit: 'inside',
  },
};

/**
 * Thumbnail generation result
 */
export interface ThumbnailResult {
  id: string;
  projectId: string;
  storageKey: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
}

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
 * Get S3 client - supports both AWS S3 and Cloudflare R2
 */
function getS3Client(): S3Client {
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

    return new S3Client({
      region: 'auto', // R2 always uses 'auto' for region
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  } else {
    // AWS S3 Configuration (legacy)
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS S3 environment variables are not set. Please set: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET');
    }

    return new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
}

/**
 * Download image buffer from S3
 * @param storageKey - S3 object key
 * @returns Image buffer
 */
export async function downloadImageFromS3(storageKey: string): Promise<Buffer> {
  const s3Client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: storageKey,
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error('No body in S3 response');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  const stream = response.Body as ReadableStream<Uint8Array>;
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

/**
 * Generate thumbnail from image buffer
 * @param imageBuffer - Original image buffer
 * @param config - Thumbnail configuration
 * @param originalMimeType - Original MIME type for proper handling
 * @returns Thumbnail buffer and metadata
 */
export async function generateThumbnail(
  imageBuffer: Buffer,
  config: ThumbnailConfig,
  originalMimeType?: string
): Promise<{ buffer: Buffer; width: number; height: number; size: number }> {
  try {
    // Check if the image is a RAW file
    const isRaw = originalMimeType?.startsWith('image/x-');
    
    let pipeline = sharp(imageBuffer);
    
    // For RAW files, we need to use libvips to convert
    // Sharp should handle this automatically with the correct flags
    if (isRaw) {
      pipeline = pipeline.withMetadata();
    }

    // Generate thumbnail
    const result = await pipeline
      .resize(config.maxWidth, config.maxHeight, {
        fit: config.fit,
        withoutEnlargement: true,
      })
      .toFormat(config.format, {
        quality: config.quality,
        progressive: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });

    return {
      buffer: result.data,
      width: result.info.width,
      height: result.info.height,
      size: result.info.size,
    };
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate multiple thumbnails for an image
 * @param imageBuffer - Original image buffer
 * @param configs - Array of thumbnail configurations
 * @param originalMimeType - Original MIME type
 * @returns Array of thumbnail results
 */
export async function generateMultipleThumbnails(
  imageBuffer: Buffer,
  configs: ThumbnailConfig[],
  originalMimeType?: string
): Promise<ThumbnailResult[]> {
  const results: ThumbnailResult[] = [];

  for (const [size, config] of Object.entries(configs)) {
    try {
      const { buffer, width, height, size: sizeBytes } = await generateThumbnail(
        imageBuffer,
        config,
        originalMimeType
      );

      results.push({
        id: uuidv7(),
        projectId: '', // Will be set by caller
        storageKey: '',
        filename: '',
        sizeBytes,
        mimeType: config.format === 'jpeg' ? 'image/jpeg' : config.format === 'png' ? 'image/png' : 'image/webp',
        width,
        height,
      });
    } catch (error) {
      console.error(`Failed to generate ${size} thumbnail:`, error);
      // Continue with other sizes
    }
  }

  return results;
}

/**
 * Generate and save thumbnails for a project
 * @param projectId - Project ID
 * @param originalStorageKey - S3 key of original image
 * @param originalMimeType - Original MIME type
 * @param userId - User ID for generating storage keys
 * @returns Array of generated thumbnail records
 */
export async function generateAndSaveThumbnails(
  projectId: string,
  originalStorageKey: string,
  originalMimeType: string,
  userId: string
): Promise<ThumbnailResult[]> {
  try {
    // Validate input
    if (!isImageMimeType(originalMimeType)) {
      throw new Error(`Unsupported MIME type for thumbnail generation: ${originalMimeType}`);
    }

    // Download original image
    const imageBuffer = await downloadImageFromS3(originalStorageKey);

    // Detect actual MIME type from buffer (more accurate than client-provided)
    const detectedMimeType = detectMimeType(originalStorageKey, imageBuffer, originalMimeType);

    // Generate all thumbnail sizes
    const thumbnailResults: ThumbnailResult[] = [];
    const configs = DEFAULT_THUMBNAIL_CONFIGS;

    for (const [size, config] of Object.entries(configs)) {
      try {
        const { buffer, width, height, size: sizeBytes } = await generateThumbnail(
          imageBuffer,
          config,
          detectedMimeType
        );

        // Generate storage key for thumbnail
        const filename = `thumb_${size}_${originalStorageKey.split('/').pop()}`;
        const storageKey = `users/${userId}/projects/${projectId}/thumbnail/${Date.now()}-${filename}`;

        // Upload thumbnail to S3
        await uploadFile(storageKey, buffer, config.format === 'jpeg' ? 'image/jpeg' : config.format === 'png' ? 'image/png' : 'image/webp');

        // Create database record
        const thumbnailRecord = await db.insert(images).values({
          id: uuidv7(),
          projectId,
          type: 'thumbnail',
          storageKey,
          filename,
          sizeBytes,
          mimeType: config.format === 'jpeg' ? 'image/jpeg' : config.format === 'png' ? 'image/png' : 'image/webp',
          width,
          height,
        }).returning();

        if (thumbnailRecord.length > 0) {
          thumbnailResults.push(thumbnailRecord[0]);
        }
      } catch (error) {
        console.error(`Failed to generate ${size} thumbnail for project ${projectId}:`, error);
        // Continue with other sizes
      }
    }

    return thumbnailResults;
  } catch (error) {
    console.error('Failed to generate and save thumbnails:', error);
    throw error;
  }
}

/**
 * Generate a single thumbnail of specified size
 * @param projectId - Project ID
 * @param originalStorageKey - S3 key of original image
 * @param originalMimeType - Original MIME type
 * @param userId - User ID
 * @param size - Thumbnail size key ('small', 'medium', 'large')
 * @returns Generated thumbnail record
 */
export async function generateSingleThumbnail(
  projectId: string,
  originalStorageKey: string,
  originalMimeType: string,
  userId: string,
  size: keyof typeof DEFAULT_THUMBNAIL_CONFIGS = 'medium'
): Promise<ThumbnailResult> {
  const config = DEFAULT_THUMBNAIL_CONFIGS[size];

  // Download original image
  const imageBuffer = await downloadImageFromS3(originalStorageKey);

  // Detect actual MIME type from buffer
  const detectedMimeType = detectMimeType(originalStorageKey, imageBuffer, originalMimeType);

  // Generate thumbnail
  const { buffer, width, height, size: sizeBytes } = await generateThumbnail(
    imageBuffer,
    config,
    detectedMimeType
  );

  // Generate storage key
  const filename = `thumb_${size}_${originalStorageKey.split('/').pop()}`;
  const storageKey = `users/${userId}/projects/${projectId}/thumbnail/${Date.now()}-${filename}`;

  // Upload to S3
  await uploadFile(storageKey, buffer, config.format === 'jpeg' ? 'image/jpeg' : config.format === 'png' ? 'image/png' : 'image/webp');

  // Create database record
  const thumbnailRecord = await db.insert(images).values({
    id: uuidv7(),
    projectId,
    type: 'thumbnail',
    storageKey,
    filename,
    sizeBytes,
    mimeType: config.format === 'jpeg' ? 'image/jpeg' : config.format === 'png' ? 'image/png' : 'image/webp',
    width,
    height,
  }).returning();

  if (thumbnailRecord.length === 0) {
    throw new Error('Failed to create thumbnail record');
  }

  return thumbnailRecord[0];
}

/**
 * Validate if a file can generate thumbnails
 * @param mimeType - MIME type to check
 * @returns true if thumbnails can be generated, false otherwise
 */
export function canGenerateThumbnail(mimeType: string): boolean {
  if (!isImageMimeType(mimeType)) {
    return false;
  }

  // Check if Sharp supports this format
  const supportedFormats = ['jpeg', 'png', 'webp', 'gif', 'svg', 'tiff', 'avif', 'heif'];
  
  // RAW files require libvips support
  if (mimeType.startsWith('image/x-')) {
    return true;
  }

  const format = mimeType.split('/')[1];
  return supportedFormats.includes(format);
}

/**
 * Delete thumbnails for a project
 * @param projectId - Project ID
 * @returns Number of thumbnails deleted
 */
export async function deleteProjectThumbnails(projectId: string): Promise<number> {
  const deletedThumbnails = await db
    .delete(images)
    .where(
      (images, { eq, and }) =>
        and(eq(images.projectId, projectId), eq(images.type, 'thumbnail'))
    )
    .returning();

  return deletedThumbnails.length;
}
