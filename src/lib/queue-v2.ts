import { Queue, Worker, Job, FlowProducer } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import {
  notifyJobStatusChange,
  notifyProcessingProgress,
  notifyUserProjectUpdate,
  notifyError,
} from "@/lib/websocket-server";
import { db, processingJobs, projects } from "@/db";
import { eq } from "drizzle-orm";
import IORedis from "ioredis";

let connectionOptions: ConnectionOptions | null = null;
let queueSingleton: Queue | null = null;
let workerSingleton: Worker | null = null;
let flowProducerSingleton: FlowProducer | null = null;
let redisClientSingleton: IORedis | null = null;

/**
 * Get Redis connection options for BullMQ
 */
function getConnectionOptions(): ConnectionOptions {
  if (connectionOptions) return connectionOptions;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is not set in environment variables");
  }

  // Parse Redis URL to extract host, port, password
  const url = new URL(redisUrl);
  
  connectionOptions = {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
    commandTimeout: 5000,
  };

  return connectionOptions;
}

/**
 * Get native Redis client for direct operations
 */
export function getRedis(): IORedis {
  if (redisClientSingleton) return redisClientSingleton;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is not set in environment variables");
  }

  redisClientSingleton = new IORedis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryStrategy: (times: number) => {
      return Math.min(times * 50, 2000);
    },
  });

  redisClientSingleton.on("error", (error) => {
    console.error("[Redis] Connection error:", error.message);
  });

  redisClientSingleton.on("connect", () => {
    console.log("[Redis] Connected successfully");
  });

  return redisClientSingleton;
}

/**
 * Get image processing queue (BullMQ)
 */
export function getImageProcessingQueue(): Queue {
  if (queueSingleton) return queueSingleton;

  queueSingleton = new Queue("image-processing", {
    connection: getConnectionOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        count: 100,
        age: 24 * 3600,
      },
      removeOnFail: {
        count: 500,
        age: 7 * 24 * 3600,
      },
    },
  });

  queueSingleton.on("error", (error) => {
    console.error("[Queue] Queue error:", error);
  });

  return queueSingleton;
}

/**
 * Get FlowProducer for job dependencies
 */
export function getFlowProducer(): FlowProducer {
  if (flowProducerSingleton) return flowProducerSingleton;

  flowProducerSingleton = new FlowProducer({
    connection: getConnectionOptions(),
  });

  return flowProducerSingleton;
}

/**
 * Create image processing worker
 * This should be called in a separate worker process
 */
export function createImageProcessingWorker(): Worker {
  if (workerSingleton) return workerSingleton;

  workerSingleton = new Worker(
    "image-processing",
    async (job: Job<ImageProcessingJobData>) => {
      console.log(`[Worker] Processing job ${job.id}:`, job.name);

      await job.updateProgress(10);

      const { projectId, styleId, intensity, originalImageKey, userId, id } =
        job.data;

      try {
        const { processImage } = await import("@/lib/job-processor");

        await job.updateProgress(30);

        const result = await processImage({
          projectId,
          styleId,
          intensity,
          originalImageKey,
          userId,
          jobId: id,
          updateProgress: async (progress: number) => {
            await job.updateProgress(30 + progress * 0.6);
          },
        });

        await job.updateProgress(100);

        return result;
      } catch (error) {
        console.error(`[Worker] Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection: getConnectionOptions(),
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || "4"),
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  workerSingleton.on("completed", async (job, result) => {
    console.log(`[Worker] Job ${job.id} completed`);

    try {
      const resultData = result as {
        projectId: string;
        userId: string;
        processedImageUrl?: string;
        thumbnailUrl?: string;
      };

      await db
        .update(processingJobs)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(processingJobs.id, job.data.id));

      await db
        .update(projects)
        .set({ status: "completed" })
        .where(eq(projects.id, resultData.projectId));

      await notifyJobStatusChange(job.id!, "completed", result);
      await notifyUserProjectUpdate(resultData.userId, resultData.projectId, {
        type: "completed",
        data: {
          jobId: job.id,
          processedImageUrl: resultData.processedImageUrl,
          thumbnailUrl: resultData.thumbnailUrl,
        },
      });
    } catch (error) {
      console.error("[Worker] Error handling completion:", error);
    }
  });

  workerSingleton.on("failed", async (job, err) => {
    if (!job) return;

    console.error(`[Worker] Job ${job.id} failed:`, err);

    try {
      await db
        .update(processingJobs)
        .set({
          status: "failed",
          errorMessage: err.message,
          completedAt: new Date(),
        })
        .where(eq(processingJobs.id, job.data.id));

      await db
        .update(projects)
        .set({ status: "failed" })
        .where(eq(projects.id, job.data.projectId));

      await notifyJobStatusChange(job.id!, "failed", { error: err.message });
      await notifyError(job.data.userId, {
        type: "processing_error",
        message: `Processing failed: ${err.message}`,
        projectId: job.data.projectId,
        jobId: job.id!,
      });
    } catch (error) {
      console.error("[Worker] Error handling failure:", error);
    }
  });

  workerSingleton.on("progress", async (job, progress) => {
    try {
      await notifyProcessingProgress(job.id!, progress as number);
    } catch (error) {
      console.error("[Worker] Error sending progress:", error);
    }
  });

  return workerSingleton;
}

/**
 * Create a multi-stage processing flow
 */
export async function createImageProcessingFlow(
  projectId: string,
  styleId: string,
  intensity: number,
  originalImageKey: string,
  userId: string,
  jobId: string
) {
  const flowProducer = getFlowProducer();

  return await flowProducer.add({
    name: "process-main",
    queueName: "image-processing",
    data: {
      id: jobId,
      projectId,
      styleId,
      intensity,
      originalImageKey,
      userId,
    },
    opts: {
      jobId,
      priority: 1,
    },
    children: [
      {
        name: "generate-thumbnail",
        queueName: "image-processing",
        data: {
          id: `${jobId}-thumb`,
          projectId,
          styleId: null,
          intensity: 0,
          originalImageKey,
          userId,
          stage: "thumbnail",
        },
        opts: {
          jobId: `${jobId}-thumb`,
          priority: 2,
        },
      },
    ],
  });
}

// Job data interface
export interface ImageProcessingJobData {
  id: string;
  projectId: string;
  styleId: string | null;
  intensity: number;
  originalImageKey: string;
  userId: string;
  orientation?: number;
  stage?: "main" | "thumbnail" | "preview";
  dependsOn?: string[];
}

export interface JobDependency {
  jobId: string;
  queueName?: string;
}

export interface JobChain {
  jobs: Array<{
    name: string;
    data: ImageProcessingJobData;
    opts?: {
      priority?: number;
      delay?: number;
      attempts?: number;
    };
  }>;
}

export async function addJobWithDependencies(
  data: ImageProcessingJobData,
  dependencies?: JobDependency[]
): Promise<void> {
  const queue = getImageProcessingQueue();
  
  if (dependencies && dependencies.length > 0) {
    const flowProducer = getFlowProducer();
    await flowProducer.add({
      name: data.id,
      queueName: "image-processing",
      data,
      opts: { jobId: data.id },
      children: dependencies.map(dep => ({
        name: dep.jobId,
        queueName: dep.queueName || "image-processing",
        data: { ...data, id: dep.jobId },
        opts: { jobId: dep.jobId },
      })),
    });
  } else {
    await queue.add(data.id, data, { jobId: data.id });
  }
}

export async function createJobChain(chain: JobChain): Promise<void> {
  const flowProducer = getFlowProducer();
  
  const flow = {
    name: "job-chain",
    queueName: "image-processing",
    children: chain.jobs.map(job => ({
      name: job.name,
      queueName: "image-processing",
      data: job.data,
      opts: {
        jobId: job.data.id,
        ...job.opts,
      },
    })),
  };
  
  await flowProducer.add(flow);
}

export async function addBatchJobs(
  jobs: ImageProcessingJobData[]
): Promise<void> {
  const queue = getImageProcessingQueue();
  
  await queue.addBulk(jobs.map(jobData => ({
    name: "process-image",
    data: jobData,
    opts: {
      jobId: jobData.id,
    },
  })));
}

export async function getJobStatus(jobId: string): Promise<string | undefined> {
  const queue = getImageProcessingQueue();
  const job = await queue.getJob(jobId);
  if (!job) return undefined;
  return await job.getState();
}

// Backward compatibility: Proxy to support old interface
export const imageProcessingQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    const queue = getImageProcessingQueue();
    return (queue as any)[prop];
  },
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("[Queue] Shutting down...");
  await queueSingleton?.close();
  await workerSingleton?.close();
  await flowProducerSingleton?.close();
  await redisClientSingleton?.quit();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("[Queue] Shutting down...");
  await queueSingleton?.close();
  await workerSingleton?.close();
  await flowProducerSingleton?.close();
  await redisClientSingleton?.quit();
  process.exit(0);
});
