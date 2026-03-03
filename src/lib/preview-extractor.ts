/**
 * Preview Extraction Service
 * Extracts or generates preview images from uploads for real-time editing
 */

import sharp from "sharp";
import { encodeBlurHash } from "./blurhash";

export interface PreviewExtractionResult {
  hasPreview: boolean;
  previewBuffer: Buffer | null;
  previewType: "embedded" | "generated" | null;
  method: string;
  originalBuffer: Buffer;
}

export interface PreviewExtractionOptions {
  maxPreviewWidth?: number;
  maxPreviewHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: Required<PreviewExtractionOptions> = {
  maxPreviewWidth: 1600,
  maxPreviewHeight: 1200,
  quality: 90,
};

/**
 * Extract preview image from uploaded file
 * Priority: 1. Use Sharp to resize/convert to suitable preview
 */
export async function extractPreviewFromUpload(
  fileBuffer: Buffer,
  mimeType: string,
  options: PreviewExtractionOptions = {}
): Promise<PreviewExtractionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const isRAW = mimeType.startsWith("image/x-");
  const isJPEG = mimeType === "image/jpeg" || mimeType === "image/jpg";
  
  try {
    if (isRAW) {
      return await handleRAWPreview(fileBuffer, mimeType, opts);
    }
    
    if (isJPEG) {
      return await handleJPEGPreview(fileBuffer, opts);
    }
    
    return await handleOtherFormatPreview(fileBuffer, opts);
  } catch (error) {
    console.error("[Preview] Failed to extract preview:", error);
    return {
      hasPreview: false,
      previewBuffer: null,
      previewType: null,
      method: "error",
      originalBuffer: fileBuffer,
    };
  }
}

/**
 * Handle RAW file - try Sharp first (fastest), handles many RAW formats via libvips
 */
async function handleRAWPreview(
  buffer: Buffer,
  mimeType: string,
  opts: Required<PreviewExtractionOptions>
): Promise<PreviewExtractionResult> {
  // Try Sharp first - it supports many RAW formats via libvips
  try {
    const metadata = await sharp(buffer).metadata();
    
    if (metadata.format && metadata.width && metadata.height) {
      console.log(`[Preview] Sharp can process RAW format: ${metadata.format}`);
      
      // Check if we need to resize
      const needsResize = 
        (metadata.width && metadata.width > opts.maxPreviewWidth) ||
        (metadata.height && metadata.height > opts.maxPreviewHeight);
      
      let pipeline = sharp(buffer).rotate(); // Auto-rotate
      
      if (needsResize) {
        pipeline = pipeline.resize(opts.maxPreviewWidth, opts.maxPreviewHeight, {
          fit: "inside",
          withoutEnlargement: true,
        });
      }
      
      const previewBuffer = await pipeline
        .jpeg({ quality: opts.quality })
        .toBuffer();
      
      return {
        hasPreview: true,
        previewBuffer,
        previewType: "generated",
        method: "sharp-raw",
        originalBuffer: buffer,
      };
    }
  } catch (sharpError) {
    console.warn("[Preview] Sharp RAW processing failed:", sharpError);
  }
  
  // Fallback: Try with specific RAW handling
  // For now, return error - in production would use dcraw/cr2-raw
  return {
    hasPreview: false,
    previewBuffer: null,
    previewType: null,
    method: "sharp-failed",
    originalBuffer: buffer,
  };
}

/**
 * Handle JPEG file - use as-is or resize if too large
 */
async function handleJPEGPreview(
  buffer: Buffer,
  opts: Required<PreviewExtractionOptions>
): Promise<PreviewExtractionResult> {
  const metadata = await sharp(buffer).metadata();
  
  // If already suitable size, use as preview
  if (metadata.width && metadata.width <= opts.maxPreviewWidth &&
      metadata.height && metadata.height <= opts.maxPreviewHeight) {
    return {
      hasPreview: true,
      previewBuffer: buffer,
      previewType: "embedded",
      method: "original",
      originalBuffer: buffer,
    };
  }
  
  // Resize for preview
  const resized = await sharp(buffer)
    .resize(opts.maxPreviewWidth, opts.maxPreviewHeight, { fit: "inside" })
    .jpeg({ quality: opts.quality })
    .toBuffer();
  
  return {
    hasPreview: true,
    previewBuffer: resized,
    previewType: "generated",
    method: "resized",
    originalBuffer: buffer,
  };
}

/**
 * Handle other formats (PNG, WebP, HEIC, etc.) - convert to JPEG
 */
async function handleOtherFormatPreview(
  buffer: Buffer,
  opts: Required<PreviewExtractionOptions>
): Promise<PreviewExtractionResult> {
  const converted = await sharp(buffer)
    .resize(opts.maxPreviewWidth, opts.maxPreviewHeight, { fit: "inside" })
    .jpeg({ quality: opts.quality })
    .toBuffer();
  
  return {
    hasPreview: true,
    previewBuffer: converted,
    previewType: "generated",
    method: "converted",
    originalBuffer: buffer,
  };
}

/**
 * Generate blur hash from preview buffer
 */
export async function generatePreviewBlurHash(
  previewBuffer: Buffer
): Promise<string | undefined> {
  try {
    const { data, info } = await sharp(previewBuffer)
      .resize(32, 32, { fit: "inside" })
      .raw()
      .ensureAlpha()
      .toBuffer({ resolveWithObject: true });
    
    return encodeBlurHash(info.width, info.height, new Uint8ClampedArray(data));
  } catch (error) {
    console.warn("[Preview] Failed to generate blur hash:", error);
    return undefined;
  }
}
