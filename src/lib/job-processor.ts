import { imageProcessingQueue, ImageProcessingJob } from './queue';
import { db, projects, processingJobs, images, systemStyles } from '@/db';
import { processWithAI, generateThumbnail, AI_CONFIG } from './ai-service';
import { uploadFile, generateDownloadUrl, deleteFile } from './s3';
import { eq, and, sql } from 'drizzle-orm';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { withRetry } from './retry-strategy';
import { logger } from './logger';

let s3ClientSingleton: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3ClientSingleton) return s3ClientSingleton;

  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error('AWS S3 environment variables are not set');
  }

  s3ClientSingleton = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientSingleton;
}

async function downloadImageFromS3(key: string): Promise<Buffer> {
  const s3Client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error('No image data received from S3');
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export async function processImageJob(job: ImageProcessingJob) {
  const { projectId, styleId, intensity, originalImageKey, userId } = job;

  try {
    // Update job status to processing with retry
    await withRetry(
      async () => {
        await db
          .update(processingJobs)
          .set({
            status: 'processing',
            startedAt: new Date(),
            attempts: sql`attempts + 1`,
          })
          .where(eq(processingJobs.id, job.id));
      },
      3,
      500,
      (attempt) => {
        logger.warn('Retry: Failed to update job status', {
          attempt,
          jobId: job.id,
        });
      },
    );

    // Update project status
    await db
      .update(projects)
      .set({ status: 'processing' })
      .where(eq(projects.id, projectId));

    // Get style configuration
    const [style] = await db
      .select()
      .from(systemStyles)
      .where(eq(systemStyles.id, styleId));

    if (!style) {
      throw new Error('Style not found');
    }

    // Download original image from S3 with retry
    logger.info('Downloading original image from S3...', {
      projectId,
      key: originalImageKey,
    });
    const originalImageBuffer = await withRetry(
      () => downloadImageFromS3(originalImageKey),
      3,
      1000,
      (attempt) => {
        logger.warn('Retry: Failed to download from S3', {
          attempt,
          key: originalImageKey,
        });
      },
    );

    // Process image with AI with retry
    logger.info('Processing image with AI...', {
      projectId,
      styleId,
      intensity,
    });
    const processedImageBuffer = await withRetry(
      () =>
        processWithAI(
          originalImageBuffer,
          {
            name: style.name,
            description: style.description || '',
            aiPrompt: style.aiPrompt,
            blendingParams: style.blendingParams as any,
          },
          intensity,
          job.orientation,
        ),
      2,
      2000,
      (attempt) => {
        logger.warn('Retry: AI processing failed', {
          attempt,
          styleId,
          intensity,
        });
      },
    );

    // Generate thumbnail from the PROCESSED image with retry
    logger.info('Generating thumbnail for processed image...', { projectId });
    const thumbnailBuffer = await withRetry(
      () => generateThumbnail(processedImageBuffer),
      2,
      1000,
      (attempt) => {
        logger.warn('Retry: Thumbnail generation failed', {
          attempt,
          projectId,
        });
      },
    );

    // Upload processed image to S3 with retry
    const processedImageKey = `users/${userId}/projects/${projectId}/processed/${Date.now()}-processed.jpg`;
    await withRetry(
      () => uploadFile(processedImageKey, processedImageBuffer, 'image/jpeg'),
      3,
      1000,
      (attempt) => {
        logger.warn('Retry: Failed to upload processed image', {
          attempt,
          key: processedImageKey,
        });
      },
    );

    // Upload thumbnail to S3 with retry
    const thumbnailKey = `users/${userId}/projects/${projectId}/thumbnail/${Date.now()}-thumb.jpg`;
    await withRetry(
      () => uploadFile(thumbnailKey, thumbnailBuffer, 'image/jpeg'),
      3,
      1000,
      (attempt) => {
        logger.warn('Retry: Failed to upload thumbnail', {
          attempt,
          key: thumbnailKey,
        });
      },
    );

    // Create image records
    await db.insert(images).values([
      {
        id: `processed_${projectId}`,
        projectId,
        type: 'processed',
        storageKey: processedImageKey,
        filename: `processed_${projectId}.jpg`,
        sizeBytes: processedImageBuffer.length,
        mimeType: 'image/jpeg',
      },
      {
        id: `thumbnail_${projectId}`,
        projectId,
        type: 'thumbnail',
        storageKey: thumbnailKey,
        filename: `thumbnail_${projectId}.jpg`,
        sizeBytes: thumbnailBuffer.length,
        mimeType: 'image/jpeg',
      },
    ]);

    // Update job status to completed
    await db
      .update(processingJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(processingJobs.id, job.id));

    // Update project status to completed
    await db
      .update(projects)
      .set({ status: 'completed' })
      .where(eq(projects.id, projectId));

    logger.info('Image processing completed successfully', {
      projectId,
      styleId,
      intensity,
      processedImageKey,
    });

    return {
      success: true,
      processedImageKey,
      thumbnailKey,
      processedImageUrl: await generateDownloadUrl(processedImageKey),
      thumbnailUrl: await generateDownloadUrl(thumbnailKey),
    };
  } catch (error) {
    logger.error('Image processing failed after all retries', error as Error, {
      projectId,
      styleId,
      intensity,
    });

    // Update job status to failed
    await db
      .update(processingJobs)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      })
      .where(eq(processingJobs.id, job.id));

    // Update project status to failed
    await db
      .update(projects)
      .set({ status: 'failed' })
      .where(eq(projects.id, projectId));

    throw error;
  }
}

// Job processor
imageProcessingQueue.process(async (job) => {
  const jobData = job.data as ImageProcessingJob;
  console.log(`Processing job ${job.id} for project ${jobData.projectId}`);

  return await processImageJob(jobData);
});
