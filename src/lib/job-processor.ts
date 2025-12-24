import { imageProcessingQueue, ImageProcessingJob } from './queue';
import { db, projects, processingJobs, images, systemStyles } from '@/db';
import { processWithAI, generateThumbnail, AI_CONFIG } from './ai-service';
import { uploadFile, generateDownloadUrl, deleteFile } from './s3';
import { eq, and, sql } from 'drizzle-orm';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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
    // Update job status to processing
    await db.update(processingJobs)
      .set({ 
        status: 'processing', 
        startedAt: new Date(),
        attempts: sql`attempts + 1`
      })
      .where(eq(processingJobs.id, job.id));

    // Update project status
    await db.update(projects)
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

    // Download original image from S3
    console.log('Downloading original image from S3...');
    const originalImageBuffer = await downloadImageFromS3(originalImageKey);
    
    // Generate thumbnail
    console.log('Generating thumbnail...');
    const thumbnailBuffer = await generateThumbnail(originalImageBuffer);
    
    // Process image with AI
    console.log('Processing image with AI...');
    const processedImageBuffer = await processWithAI(
      originalImageBuffer,
      {
        name: style.name,
        description: style.description || '',
        aiPrompt: style.aiPrompt,
        blendingParams: style.blendingParams as any,
      },
      intensity
    );

    // Upload processed image to S3
    const processedImageKey = `users/${userId}/projects/${projectId}/processed/${Date.now()}-processed.jpg`;
    await uploadFile(processedImageKey, processedImageBuffer, 'image/jpeg');
    
    // Upload thumbnail to S3
    const thumbnailKey = `users/${userId}/projects/${projectId}/thumbnail/${Date.now()}-thumb.jpg`;
    await uploadFile(thumbnailKey, thumbnailBuffer, 'image/jpeg');

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
    await db.update(processingJobs)
      .set({ 
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(processingJobs.id, job.id));

    // Update project status to completed
    await db.update(projects)
      .set({ status: 'completed' })
      .where(eq(projects.id, projectId));

    console.log(`Image processing completed for project ${projectId}`);
    
    return {
      success: true,
      processedImageKey,
      thumbnailKey,
      processedImageUrl: await generateDownloadUrl(processedImageKey),
      thumbnailUrl: await generateDownloadUrl(thumbnailKey),
    };
    
  } catch (error) {
    console.error(`Image processing failed for project ${projectId}:`, error);
    
    // Update job status to failed
    await db.update(processingJobs)
      .set({ 
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      })
      .where(eq(processingJobs.id, job.id));

    // Update project status to failed
    await db.update(projects)
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
