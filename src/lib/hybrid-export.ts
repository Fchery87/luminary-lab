/**
 * Hybrid Export Service
 * Supports both preview (fast) and full-quality (maximum quality) exports
 */

import sharp from "sharp";
import { db, images, systemStyles } from "@/db";
import { eq, and } from "drizzle-orm";
import { processWithAI } from "./ai-service";
import { downloadImageFromS3 } from "./thumbnail-generator";
import { generateDownloadUrl, uploadFile } from "./s3";

export type ExportMode = "preview" | "full-quality";

export interface ExportOptions {
  mode: ExportMode;
  styleId: string;
  intensity: number;
  format: "jpeg" | "png" | "webp";
  quality: number;
}

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
  mode: ExportMode;
}

/**
 * Export processed image based on mode
 * - preview: Uses preview image (fast, good for quick results)
 * - full-quality: Uses RAW/original (slower, maximum quality)
 */
export async function exportProcessedImage(
  projectId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const { mode, styleId, intensity, format, quality } = options;
  
  let sourceBuffer: Buffer;
  let sourceDescription: string;
  
  if (mode === "preview") {
    // Use preview image for fast export
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
    // Use original RAW/JPEG for full quality
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
  
  // Get style configuration
  const [style] = await db
    .select()
    .from(systemStyles)
    .where(eq(systemStyles.id, styleId));
  
  if (!style) {
    throw new Error("Style not found");
  }
  
  // Process with AI
  const processedBuffer = await processWithAI(
    sourceBuffer,
    {
      name: style.name,
      description: style.description || "",
      aiPrompt: style.aiPrompt,
      blendingParams: style.blendingParams as any,
    },
    intensity
  );
  
  // Convert to requested format
  const finalBuffer = await sharp(processedBuffer)
    .toFormat(format, { quality })
    .toBuffer();
  
  return {
    buffer: finalBuffer,
    contentType: `image/${format}`,
    filename: `export-${projectId}-${mode}.${format}`,
    mode,
  };
}
