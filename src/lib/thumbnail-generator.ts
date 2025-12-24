import { createWriteStream, createReadStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { generateUploadUrl, generateFileKey } from '@/lib/s3';

export interface ThumbnailOptions {
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  progressive?: boolean;
}

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
  quality: number;
  options?: Partial<ThumbnailOptions>;
}

// Predefined thumbnail sizes for different use cases
export const THUMBNAIL_SIZES: ThumbnailSize[] = [
  {
    name: 'small',
    width: 150,
    height: 150,
    quality: 80,
    options: { fit: 'cover', format: 'webp' }
  },
  {
    name: 'medium',
    width: 400,
    height: 300,
    quality: 85,
    options: { fit: 'cover', format: 'jpeg', progressive: true }
  },
  {
    name: 'large',
    width: 800,
    height: 600,
    quality: 90,
    options: { fit: 'cover', format: 'jpeg', progressive: true }
  },
  {
    name: 'preview',
    width: 1200,
    height: 1200,
    quality: 92,
    options: { fit: 'inside', format: 'jpeg', progressive: true }
  }
];

export class ThumbnailGenerator {
  private s3Client: S3Client;
  private tempDir: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.tempDir = join(process.cwd(), 'temp', 'thumbnails');
  }

  async generateThumbnails(
    originalKey: string,
    userId: string,
    projectId: string,
    filename: string,
    sizes: ThumbnailSize[] = THUMBNAIL_SIZES
  ): Promise<Record<string, { url: string; key: string; size: number }>> {
    try {
      // Download original file from S3
      const tempFilePath = await this.downloadFromS3(originalKey);
      
      // Generate thumbnails for each size
      const results: Record<string, { url: string; key: string; size: number }> = {};
      
      for (const size of sizes) {
        const thumbnailResult = await this.generateSingleThumbnail(
          tempFilePath,
          size,
          userId,
          projectId,
          filename
        );
        
        results[size.name] = thumbnailResult;
      }
      
      // Clean up temporary file
      await this.cleanupTempFile(tempFilePath);
      
      return results;
      
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      throw error;
    }
  }

  private async generateSingleThumbnail(
    inputPath: string,
    size: ThumbnailSize,
    userId: string,
    projectId: string,
    filename: string
  ): Promise<{ url: string; key: string; size: number }> {
    try {
      // Configure sharp
      let sharpPipeline = sharp(inputPath);
      
      // Apply transformations
      const options = { ...size.options, ...size };
      
      if (options.width || options.height) {
        sharpPipeline = sharpPipeline.resize(options.width, options.height, {
          fit: options.fit || 'cover',
          withoutEnlargement: true
        });
      }
      
      // Apply format and quality
      const format = options.format || 'jpeg';
      const quality = options.quality || 85;
      
      const formatOptions: any = {
        quality,
        progressive: options.progressive,
      };
      
      // Optimize for web
      if (format === 'jpeg') {
        formatOptions.mozjpeg = true;
        formatOptions.trellisQuantisation = true;
      } else if (format === 'png') {
        formatOptions.compressionLevel = 9;
        formatOptions.palette = true;
      } else if (format === 'webp') {
        formatOptions.effort = 6;
        formatOptions.smartSubsample = true;
      }
      
      sharpPipeline = sharpPipeline.toFormat(format, formatOptions);
      
      // Generate output buffer
      const outputBuffer = await sharpPipeline.toBuffer();
      
      // Generate S3 key for thumbnail
      const thumbnailFilename = `${size.name}_${filename.replace(/\.[^/.]+$/, '')}.${format}`;
      const thumbnailKey = generateFileKey(
        userId,
        projectId,
        thumbnailFilename,
        'thumbnail'
      );
      
      // Upload to S3
      await this.uploadToS3(thumbnailKey, outputBuffer, format);
      
      // Generate public URL
      const url = await generateUploadUrl(thumbnailKey, `image/${format}`, false);
      
      return {
        url: url.split('?')[0], // Remove query params for display
        key: thumbnailKey,
        size: outputBuffer.length
      };
      
    } catch (error) {
      console.error(`Failed to generate ${size.name} thumbnail:`, error);
      throw error;
    }
  }

  private async downloadFromS3(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
      });
      
      const response = await this.s3Client.send(command);
      
      // Create temporary file
      const tempFilePath = join(this.tempDir, `temp_${Date.now()}_${key.split('/').pop()}`);
      
      // Write to temporary file
      await pipeline(response.Body as NodeJS.ReadableStream, createWriteStream(tempFilePath));
      
      return tempFilePath;
      
    } catch (error) {
      console.error('Failed to download from S3:', error);
      throw error;
    }
  }

  private async uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
        Metadata: {
          'original-width': buffer.length > 0 ? 'processed' : 'thumbnail',
          'processed-at': new Date().toISOString(),
        }
      });
      
      await this.s3Client.send(command);
      
    } catch (error) {
      console.error('Failed to upload to S3:', error);
      throw error;
    }
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('Failed to cleanup temp file:', error);
    }
  }

  async generateSmartThumbnail(
    originalKey: string,
    userId: string,
    projectId: string,
    filename: string,
    targetWidth: number = 400,
    targetHeight: number = 300
  ): Promise<{ url: string; key: string; size: number; width: number; height: number }> {
    try {
      // Download original file
      const tempFilePath = await this.downloadFromS3(originalKey);
      
      // Get image metadata to calculate optimal dimensions
      const metadata = await sharp(tempFilePath).metadata();
      const { width = 0, height = 0 } = metadata;
      
      // Calculate dimensions maintaining aspect ratio
      let finalWidth = targetWidth;
      let finalHeight = targetHeight;
      
      const aspectRatio = width / height;
      
      if (aspectRatio > (targetWidth / targetHeight)) {
        // Image is wider - use target width
        finalHeight = Math.round(targetWidth / aspectRatio);
      } else {
        // Image is taller - use target height
        finalWidth = Math.round(targetHeight * aspectRatio);
      }
      
      // Generate thumbnail
      const result = await this.generateSingleThumbnail(
        tempFilePath,
        {
          name: 'smart',
          width: finalWidth,
          height: finalHeight,
          quality: 85,
          options: { fit: 'cover', format: 'jpeg', progressive: true }
        },
        userId,
        projectId,
        filename
      );
      
      // Clean up
      await this.cleanupTempFile(tempFilePath);
      
      return {
        ...result,
        width: finalWidth,
        height: finalHeight
      };
      
    } catch (error) {
      console.error('Smart thumbnail generation failed:', error);
      throw error;
    }
  }

  async extractDominantColors(
    originalKey: string,
    maxColors: number = 5
  ): Promise<Array<{ hex: string; rgb: [number, number, number]; percentage: number }>> {
    try {
      // Download original file
      const tempFilePath = await this.downloadFromS3(originalKey);
      
      // Generate small thumbnail for color analysis
      const { data } = await sharp(tempFilePath)
        .resize(100, 100, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      // Simple color quantization
      const colorMap = new Map<string, number>();
      const pixels = new Uint8ClampedArray(data);
      
      for (let i = 0; i < pixels.length; i += 3) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Quantize to reduce color variations
        const quantizedR = Math.round(r / 32) * 32;
        const quantizedG = Math.round(g / 32) * 32;
        const quantizedB = Math.round(b / 32) * 32;
        
        const hex = `#${quantizedR.toString(16).padStart(2, '0')}${quantizedG.toString(16).padStart(2, '0')}${quantizedB.toString(16).padStart(2, '0')}`;
        
        colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
      }
      
      // Sort by frequency and get top colors
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxColors)
        .map(([hex, count]) => ({
          hex,
          rgb: [
            parseInt(hex.slice(1, 3), 16),
            parseInt(hex.slice(3, 5), 16),
            parseInt(hex.slice(5, 7), 16)
          ] as [number, number, number],
          percentage: (count / (pixels.length / 3)) * 100
        }));
      
      // Clean up
      await this.cleanupTempFile(tempFilePath);
      
      return sortedColors;
      
    } catch (error) {
      console.error('Color extraction failed:', error);
      return [];
    }
  }
}

// Singleton instance
export const thumbnailGenerator = new ThumbnailGenerator();
