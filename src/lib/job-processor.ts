import { db, projects, processingJobs, images, systemStyles } from "@/db";
import { processWithAI, generateThumbnail } from "./ai-service";
import { uploadFile, generateDownloadUrl } from "./s3";
import { eq, and, sql } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { withRetry } from "./retry-strategy";
import { logger } from "./logger";

let s3ClientSingleton: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3ClientSingleton) return s3ClientSingleton;

  const region = process.env.AWS_REGION || "us-east-1";
  const accessKeyId =
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint =
    process.env.CLOUDFLARE_R2_ENDPOINT ||
    (process.env.CLOUDFLARE_R2_ACCOUNT_ID
      ? `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : undefined);

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("S3 credentials not configured");
  }

  s3ClientSingleton = new S3Client({
    region: process.env.CLOUDFLARE_R2_ACCOUNT_ID ? "auto" : region,
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientSingleton;
}

async function downloadImageFromS3(key: string): Promise<Buffer> {
  const s3Client = getS3Client();
  const bucket =
    process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.AWS_S3_BUCKET;

  if (!bucket) {
    throw new Error("S3 bucket not configured");
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error("No image data received from S3");
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

interface ProcessImageOptions {
  projectId: string;
  styleId: string | null;
  intensity: number;
  originalImageKey: string;
  userId: string;
  jobId?: string;
  updateProgress?: (progress: number) => Promise<void>;
  stage?: "main" | "thumbnail" | "preview";
}

interface ProcessImageResult {
  success: boolean;
  projectId: string;
  userId: string;
  processedImageUrl?: string;
  thumbnailUrl?: string;
  processedImageKey?: string;
  thumbnailKey?: string;
}

export async function processImage(
  options: ProcessImageOptions
): Promise<ProcessImageResult> {
  const {
    projectId,
    styleId,
    intensity,
    originalImageKey,
    userId,
    jobId,
    updateProgress,
    stage = "main",
  } = options;

  try {
    // Update job status to processing
    if (jobId) {
      await withRetry(
        async () => {
          await db
            .update(processingJobs)
            .set({
              status: "processing",
              startedAt: new Date(),
              attempts: sql`attempts + 1`,
            })
            .where(eq(processingJobs.id, jobId));
        },
        3,
        500
      );
    }

    // Update project status
    await db
      .update(projects)
      .set({ status: "processing" })
      .where(eq(projects.id, projectId));

    await updateProgress?.(10);

    // Download original image from S3
    logger.info("Downloading original image from S3...", {
      projectId,
      key: originalImageKey,
    });

    const originalImageBuffer = await withRetry(
      () => downloadImageFromS3(originalImageKey),
      3,
      1000
    );

    await updateProgress?.(30);

    let processedImageBuffer: Buffer;

    if (stage === "thumbnail") {
      // Generate thumbnail only
      logger.info("Generating thumbnail...", { projectId });
      processedImageBuffer = await withRetry(
        () => generateThumbnail(originalImageBuffer),
        2,
        1000
      );
    } else {
      // Get style configuration if styleId provided
      let style = null;
      if (styleId) {
        const [foundStyle] = await db
          .select()
          .from(systemStyles)
          .where(eq(systemStyles.id, styleId));
        style = foundStyle;
      }

      // Process image with AI
      logger.info("Processing image with AI...", {
        projectId,
        styleId,
        intensity,
      });

      processedImageBuffer = await withRetry(
        () =>
          processWithAI(
            originalImageBuffer,
            {
              name: style?.name || "Default",
              description: style?.description || "",
              aiPrompt: style?.aiPrompt || "",
              blendingParams: (style?.blendingParams as any) || {},
            },
            intensity
          ),
        2,
        2000
      );
    }

    await updateProgress?.(70);

    // Generate thumbnail from processed image (for main stage)
    let thumbnailBuffer: Buffer | null = null;
    if (stage === "main") {
      logger.info("Generating thumbnail for processed image...", { projectId });
      thumbnailBuffer = await withRetry(
        () => generateThumbnail(processedImageBuffer),
        2,
        1000
      );
    }

    await updateProgress?.(80);

    // Upload processed image to S3
    const timestamp = Date.now();
    const processedImageKey = `users/${userId}/projects/${projectId}/processed/${timestamp}-processed.jpg`;

    await withRetry(
      () => uploadFile(processedImageKey, processedImageBuffer, "image/jpeg"),
      3,
      1000
    );

    await updateProgress?.(90);

    // Upload thumbnail if generated
    let thumbnailKey: string | undefined;
    if (thumbnailBuffer) {
      thumbnailKey = `users/${userId}/projects/${projectId}/thumbnail/${timestamp}-thumb.jpg`;
      await withRetry(
        () => uploadFile(thumbnailKey!, thumbnailBuffer, "image/jpeg"),
        3,
        1000
      );

      // Create thumbnail image record
      await db.insert(images).values({
        id: `thumbnail_${projectId}_${timestamp}`,
        projectId,
        type: "thumbnail",
        storageKey: thumbnailKey,
        filename: `thumbnail_${projectId}.jpg`,
        sizeBytes: thumbnailBuffer.length,
        mimeType: "image/jpeg",
      });
    }

    // Create processed image record
    await db.insert(images).values({
      id: `processed_${projectId}_${timestamp}`,
      projectId,
      type: "processed",
      storageKey: processedImageKey,
      filename: `processed_${projectId}.jpg`,
      sizeBytes: processedImageBuffer.length,
      mimeType: "image/jpeg",
    });

    // Update job status to completed
    if (jobId) {
      await db
        .update(processingJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(processingJobs.id, jobId));
    }

    // Update project status to completed
    await db
      .update(projects)
      .set({ status: "completed" })
      .where(eq(projects.id, projectId));

    await updateProgress?.(100);

    logger.info("Image processing completed successfully", {
      projectId,
      styleId,
      intensity,
      processedImageKey,
    });

    return {
      success: true,
      projectId,
      userId,
      processedImageKey,
      thumbnailKey,
      processedImageUrl: await generateDownloadUrl(processedImageKey),
      thumbnailUrl: thumbnailKey
        ? await generateDownloadUrl(thumbnailKey)
        : undefined,
    };
  } catch (error) {
    logger.error("Image processing failed", error as Error, {
      projectId,
      styleId,
      intensity,
    });

    // Update job status to failed
    if (jobId) {
      await db
        .update(processingJobs)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        })
        .where(eq(processingJobs.id, jobId));
    }

    // Update project status to failed
    await db
      .update(projects)
      .set({ status: "failed" })
      .where(eq(projects.id, projectId));

    throw error;
  }
}

// Legacy job processor interface for backward compatibility
export interface ImageProcessingJob {
  id: string;
  projectId: string;
  styleId: string;
  intensity: number;
  originalImageKey: string;
  userId: string;
  orientation?: number;
}

export async function processImageJob(job: ImageProcessingJob) {
  return processImage({
    projectId: job.projectId,
    styleId: job.styleId,
    intensity: job.intensity,
    originalImageKey: job.originalImageKey,
    userId: job.userId,
    jobId: job.id,
  });
}
