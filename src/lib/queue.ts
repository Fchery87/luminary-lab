import Bull from 'bull';
import IORedis from 'ioredis';
import { 
  notifyJobStatusChange, 
  notifyProcessingProgress, 
  notifyUserProjectUpdate,
  notifyError 
} from '@/lib/websocket-server';
import { db, processingJobs, projects, images } from '@/db';
import { eq } from 'drizzle-orm';
import { generateUploadUrl, generateFileKey } from '@/lib/s3';
import { v7 as uuidv7 } from 'uuid';

let redisSingleton: IORedis | null = null;
let queueSingleton: Bull.Queue | null = null;

function getRedis(): IORedis {
  if (redisSingleton) return redisSingleton;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is not set in environment variables');
  }

  redisSingleton = new IORedis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    commandTimeout: 5000,
  });

  return redisSingleton;
}

export function getImageProcessingQueue(): Bull.Queue {
  if (queueSingleton) return queueSingleton;

  const redis = getRedis();
  queueSingleton = new Bull('image processing', {
    redis: {
      host: redis.options.host,
      port: redis.options.port,
      password: redis.options.password,
      db: redis.options.db,
    },
    defaultJobOptions: {
      removeOnComplete: 10,
      removeOnFail: 20,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  // Job event handlers with real-time notifications
  queueSingleton.on('completed', async (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
    
    try {
      // Update job status in database
      await db.update(processingJobs)
        .set({ 
          status: 'completed', 
          completedAt: new Date(),
        })
        .where(eq(processingJobs.id, job.id.toString()));

      // Update project status
      await db.update(projects)
        .set({ status: 'completed' })
        .where(eq(projects.id, result.projectId));

      // Send notifications
      await notifyJobStatusChange(job.id.toString(), 'completed', result);
      await notifyUserProjectUpdate(result.userId, result.projectId, {
        type: 'completed',
        data: {
          jobId: job.id.toString(),
          processedImageUrl: result.processedImageUrl,
          thumbnailUrl: result.thumbnailUrl,
        }
      });
    } catch (error) {
      console.error('Error handling job completion:', error);
    }
  });

  queueSingleton.on('failed', async (job, err) => {
    console.error(`Job ${job.id} failed:`, err);
    
    try {
      // Update job status in database
      await db.update(processingJobs)
        .set({ 
          status: 'failed',
          errorMessage: err.message,
          completedAt: new Date(),
        })
        .where(eq(processingJobs.id, job.id.toString()));

      // Update project status
      await db.update(projects)
        .set({ status: 'failed' })
        .where(eq(projects.id, job.data.projectId));

      // Send error notifications
      await notifyJobStatusChange(job.id.toString(), 'failed', { 
        error: err.message 
      });
      
      await notifyError(job.data.userId, {
        type: 'processing_error',
        message: `Processing failed: ${err.message}`,
        projectId: job.data.projectId,
        jobId: job.id.toString(),
      });
    } catch (error) {
      console.error('Error handling job failure:', error);
    }
  });

  queueSingleton.on('stalled', (job) => {
    console.warn(`Job ${job.id} stalled`);
  });

  queueSingleton.on('progress', async (job, progress) => {
    try {
      await notifyProcessingProgress(job.id.toString(), progress as number);
    } catch (error) {
      console.error('Error sending progress notification:', error);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down queues...');
    await queueSingleton?.close();
    await redisSingleton?.quit();
    process.exit(0);
  });

  return queueSingleton;
}

export const imageProcessingQueue = new Proxy(
  {},
  {
    get(_target, prop) {
      return (getImageProcessingQueue() as any)[prop];
    },
  }
) as unknown as Bull.Queue;

// Job types
export interface ImageProcessingJob {
  id: string;
  projectId: string;
  styleId: string;
  intensity: number;
  originalImageKey: string;
  userId: string;
}

// NOTE: handlers and shutdown are registered lazily in getImageProcessingQueue()
