/**
 * Hybrid Export Service
 * Supports multiple export formats, qualities, and professional features
 */

import sharp from "sharp";
import { db, images, systemStyles } from "@/db";
import { eq, and } from "drizzle-orm";
import { processWithAI } from "./ai-service";
import { downloadImageFromS3 } from "./thumbnail-generator";
import { generateDownloadUrl, uploadFile } from "./s3";

export type ExportMode = "preview" | "full-quality";
export type ExportFormat = "jpeg" | "png" | "webp" | "tiff" | "avif";
export type ColorSpace = "sRGB" | "AdobeRGB" | "P3" | "ProPhotoRGB";
export type ResizeFit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface WatermarkOptions {
  text: string;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  opacity: number; // 0-1
  fontSize?: number;
  color?: string;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit: ResizeFit;
  withoutEnlargement?: boolean;
}

export interface ExportOptions {
  mode: ExportMode;
  styleId?: string | null;
  intensity?: number;
  format: ExportFormat;
  quality: number; // 1-100
  colorSpace?: ColorSpace;
  resize?: ResizeOptions;
  watermark?: WatermarkOptions;
  preserveMetadata?: boolean;
  sharpen?: {
    amount: number;
    radius: number;
    threshold: number;
  };
}

export interface ExportPreset {
  name: string;
  description: string;
  options: Partial<ExportOptions>;
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  mode: ExportMode;
  format: ExportFormat;
  dimensions: {
    width: number;
    height: number;
  };
  fileSize: number;
}

// Export presets for common use cases
export const EXPORT_PRESETS: ExportPreset[] = [
  {
    name: "Web - Social Media",
    description: "Optimized for Instagram, Facebook, Twitter",
    options: {
      format: "jpeg",
      quality: 85,
      resize: { width: 2048, height: 2048, fit: "inside", withoutEnlargement: true },
      colorSpace: "sRGB",
      sharpen: { amount: 0.5, radius: 0.5, threshold: 0 },
    },
  },
  {
    name: "Web - Portfolio",
    description: "High quality for website portfolios",
    options: {
      format: "webp",
      quality: 90,
      resize: { width: 2560, height: 2560, fit: "inside", withoutEnlargement: true },
      colorSpace: "sRGB",
    },
  },
  {
    name: "Print - Standard",
    description: "300 DPI for standard printing",
    options: {
      format: "tiff",
      quality: 100,
      colorSpace: "AdobeRGB",
    },
  },
  {
    name: "Print - Large Format",
    description: "Maximum quality for large prints",
    options: {
      format: "tiff",
      quality: 100,
      colorSpace: "ProPhotoRGB",
      sharpen: { amount: 1.0, radius: 1.0, threshold: 0 },
    },
  },
  {
    name: "Archive - Master",
    description: "Uncompressed master file for archiving",
    options: {
      format: "tiff",
      quality: 100,
      colorSpace: "ProPhotoRGB",
      preserveMetadata: true,
    },
  },
];

/**
 * Get export preset by name
 */
export function getExportPreset(name: string): ExportPreset | undefined {
  return EXPORT_PRESETS.find((p) => p.name === name);
}

/**
 * Apply export preset to options
 */
export function applyExportPreset(
  presetName: string,
  overrides?: Partial<ExportOptions>
): ExportOptions {
  const preset = getExportPreset(presetName);
  if (!preset) {
    throw new Error(`Export preset "${presetName}" not found`);
  }

  return {
    mode: "full-quality",
    format: "jpeg",
    quality: 90,
    colorSpace: "sRGB",
    ...preset.options,
    ...overrides,
  } as ExportOptions;
}

/**
 * Generate watermark buffer
 */
async function createWatermark(
  width: number,
  height: number,
  options: WatermarkOptions
): Promise<Buffer> {
  const { text, opacity, fontSize = 48, color = "white" } = options;

  // Create SVG watermark
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text
        x="50%"
        y="50%"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        fill="${color}"
        opacity="${opacity}"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(-45, ${width / 2}, ${height / 2})"
      >${text}</text>
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * Apply watermark to image
 */
async function applyWatermark(
  image: sharp.Sharp,
  watermarkBuffer: Buffer,
  position: WatermarkOptions["position"]
): Promise<sharp.Sharp> {
  const gravityMap: Record<string, sharp.Gravity> = {
    center: "center",
    "top-left": "northwest",
    "top-right": "northeast",
    "bottom-left": "southwest",
    "bottom-right": "southeast",
  };

  return image.composite([
    {
      input: watermarkBuffer,
      gravity: gravityMap[position] || "center",
    },
  ]);
}

/**
 * Convert image to specified format with options
 */
async function convertToFormat(
  image: sharp.Sharp,
  format: ExportFormat,
  quality: number,
  colorSpace?: ColorSpace
): Promise<sharp.Sharp> {
  let pipeline = image;

  // Handle color space conversion
  if (colorSpace) {
    switch (colorSpace) {
      case "sRGB":
        pipeline = pipeline.toColorspace("srgb");
        break;
      case "AdobeRGB":
        pipeline = pipeline.toColorspace("adobergb");
        break;
      case "P3":
        pipeline = pipeline.toColorspace("display-p3");
        break;
      case "ProPhotoRGB":
        pipeline = pipeline.toColorspace("prophoto-rgb");
        break;
    }
  }

  // Apply format-specific settings
  switch (format) {
    case "jpeg":
      pipeline = pipeline.jpeg({
        quality,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling: quality >= 90 ? "4:4:4" : "4:2:0",
      });
      break;

    case "png":
      pipeline = pipeline.png({
        quality: Math.min(quality, 100),
        compressionLevel: quality >= 95 ? 1 : 9,
        progressive: true,
      });
      break;

    case "webp":
      pipeline = pipeline.webp({
        quality,
        effort: quality >= 90 ? 6 : 4,
        smartSubsample: true,
      });
      break;

    case "tiff":
      pipeline = pipeline.tiff({
        quality: Math.min(quality, 100),
        compression: quality >= 95 ? "none" : "lzw",
        pyramid: false,
        tile: false,
      });
      break;

    case "avif":
      pipeline = pipeline.avif({
        quality,
        effort: 4,
        chromaSubsampling: "4:2:0",
      });
      break;
  }

  return pipeline;
}

/**
 * Export processed image with full options
 */
export async function exportProcessedImage(
  projectId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const {
    mode,
    styleId,
    intensity = 1.0,
    format,
    quality,
    colorSpace = "sRGB",
    resize,
    watermark,
    preserveMetadata = false,
    sharpen,
  } = options;

  // Get source image
  let sourceBuffer: Buffer;
  let sourceDescription: string;

  if (mode === "preview") {
    const previewImage = await db
      .select()
      .from(images)
      .where(
        and(
          eq(images.projectId, projectId),
          eq(images.isPreview, true)
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!previewImage) {
      throw new Error("Preview image not found. Please upload an image first.");
    }

    sourceBuffer = await downloadImageFromS3(previewImage.storageKey);
    sourceDescription = `preview (${previewImage.previewImageType || "generated"})`;
  } else {
    const originalImage = await db
      .select()
      .from(images)
      .where(
        and(
          eq(images.projectId, projectId),
          eq(images.type, "original")
        )
      )
      .limit(1)
      .then((rows) => rows[0]);

    if (!originalImage) {
      throw new Error("Original image not found. Please upload an image first.");
    }

    sourceBuffer = await downloadImageFromS3(originalImage.storageKey);
    sourceDescription = `original (${originalImage.mimeType})`;
  }

  console.log(`[Export] Processing ${mode} export using ${sourceDescription}`);

  // Process with AI if style provided
  let processedBuffer = sourceBuffer;
  if (styleId) {
    const [style] = await db
      .select()
      .from(systemStyles)
      .where(eq(systemStyles.id, styleId));

    if (!style) {
      throw new Error("Style not found");
    }

    processedBuffer = await processWithAI(
      sourceBuffer,
      {
        name: style.name,
        description: style.description || "",
        aiPrompt: style.aiPrompt,
        blendingParams: style.blendingParams as any,
      },
      intensity
    );
  }

  // Start Sharp pipeline
  let pipeline = sharp(processedBuffer);

  // Get original dimensions
  const metadata = await pipeline.metadata();
  const originalWidth = metadata.width || 0;
  const originalHeight = metadata.height || 0;

  // Apply resize if specified
  if (resize) {
    pipeline = pipeline.resize({
      width: resize.width,
      height: resize.height,
      fit: resize.fit,
      withoutEnlargement: resize.withoutEnlargement,
    });
  }

  // Apply sharpening if specified
  if (sharpen) {
    pipeline = pipeline.sharpen({
      sigma: sharpen.radius,
      m1: sharpen.amount,
      m2: sharpen.amount * 0.5,
      x1: sharpen.threshold,
      y2: 10,
      y3: 20,
    });
  }

  // Apply watermark if specified
  if (watermark) {
    const { width, height } = await pipeline.metadata();
    const watermarkBuffer = await createWatermark(
      width || originalWidth,
      height || originalHeight,
      watermark
    );
    pipeline = await applyWatermark(pipeline, watermarkBuffer, watermark.position);
  }

  // Convert to target format
  pipeline = await convertToFormat(pipeline, format, quality, colorSpace);

  // Handle metadata
  if (!preserveMetadata) {
    pipeline = pipeline.withMetadata({
      exif: {},
      icc: colorSpace === "sRGB" ? "srgb" : undefined,
    });
  }

  // Generate output
  const finalBuffer = await pipeline.toBuffer();
  const finalMetadata = await sharp(finalBuffer).metadata();

  // Generate filename with template
  const timestamp = Date.now();
  const filename = `export-${projectId}-${mode}-${timestamp}.${format}`;

  return {
    buffer: finalBuffer,
    contentType: `image/${format === "jpeg" ? "jpg" : format}`,
    filename,
    mode,
    format,
    dimensions: {
      width: finalMetadata.width || 0,
      height: finalMetadata.height || 0,
    },
    fileSize: finalBuffer.length,
  };
}

/**
 * Export and upload to S3
 */
export async function exportAndUpload(
  projectId: string,
  userId: string,
  options: ExportOptions
): Promise<{
  url: string;
  filename: string;
  format: ExportFormat;
  fileSize: number;
}> {
  const result = await exportProcessedImage(projectId, options);

  const key = `users/${userId}/projects/${projectId}/exports/${Date.now()}-${result.filename}`;

  await uploadFile(key, result.buffer, result.contentType);

  const url = await generateDownloadUrl(key, 3600); // 1 hour expiry

  return {
    url,
    filename: result.filename,
    format: result.format,
    fileSize: result.fileSize,
  };
}

/**
 * Get supported export formats
 */
export function getSupportedFormats(): { value: ExportFormat; label: string; description: string }[] {
  return [
    { value: "jpeg", label: "JPEG", description: "Best for web, photos" },
    { value: "png", label: "PNG", description: "Best for transparency, graphics" },
    { value: "webp", label: "WebP", description: "Modern web format, smaller files" },
    { value: "tiff", label: "TIFF", description: "Best for printing, archiving" },
    { value: "avif", label: "AVIF", description: "Next-gen format, smallest files" },
  ];
}

/**
 * Get supported color spaces
 */
export function getSupportedColorSpaces(): { value: ColorSpace; label: string; description: string }[] {
  return [
    { value: "sRGB", label: "sRGB", description: "Standard for web and screens" },
    { value: "AdobeRGB", label: "Adobe RGB", description: "Wider gamut for print" },
    { value: "P3", label: "Display P3", description: "Apple/HDR displays" },
    { value: "ProPhotoRGB", label: "ProPhoto RGB", description: "Widest gamut for archiving" },
  ];
}
