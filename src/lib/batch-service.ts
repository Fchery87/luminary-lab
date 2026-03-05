/**
 * Batch service for creating and managing image upload batches
 */

import { db, batches, processingJobs, users } from "@/db";
import { eq, and } from "drizzle-orm";
import { logger } from "./logger";
import { imageProcessingQueue } from "./queue";

export interface CreateBatchInput {
  userId: string;
  name?: string;
  description?: string;
}

export interface BatchWithJobs {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  status: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  createdAt: Date;
  completedAt?: Date;
  jobs?: Array<{
    id: string;
    status: string;
    error?: string;
  }>;
}

class BatchService {
  /**
   * Create a new batch
   */
  async createBatch(input: CreateBatchInput): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.insert(batches).values({
      id: batchId,
      userId: input.userId as any,
      name: input.name,
      description: input.description,
      status: "pending",
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    });

    logger.info("Batch created", {
      batchId,
      userId: input.userId,
      name: input.name,
    });

    return batchId;
  }

  /**
   * Get batch by ID
   */
  async getBatch(batchId: string): Promise<BatchWithJobs | null> {
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));

    if (!batch) return null;

    const jobs = await db
      .select({
        id: processingJobs.id,
        status: processingJobs.status,
        error: processingJobs.errorMessage,
      })
      .from(processingJobs)
      .where(eq(processingJobs.batchId, batchId));

    return {
      ...batch,
      userId: batch.userId as unknown as string,
      name: batch.name ?? undefined,
      description: batch.description ?? undefined,
      totalJobs: batch.totalJobs ?? 0,
      completedJobs: batch.completedJobs ?? 0,
      failedJobs: batch.failedJobs ?? 0,
      completedAt: batch.completedAt ?? undefined,
      jobs: jobs.map((job) => ({
        id: job.id,
        status: job.status,
        error: job.error ?? undefined,
      })),
    } as BatchWithJobs;
  }

  /**
   * List batches for a user (paginated)
   */
  async listBatches(userId: string, limit: number = 20, offset: number = 0) {
    const userBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.userId, userId as any))
      .orderBy((t) => t.createdAt)
      .limit(limit)
      .offset(offset);

    return userBatches;
  }

  /**
   * Update batch status
   */
  async updateBatchStatus(batchId: string, status: string): Promise<void> {
    const updateData: any = { status };
    if (status === "completed" || status === "failed") {
      updateData.completedAt = new Date();
    }

    await db.update(batches).set(updateData).where(eq(batches.id, batchId));
  }

  /**
   * Increment job counts in batch
   */
  async incrementJobCount(
    batchId: string,
    increment: number = 1,
  ): Promise<void> {
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));

    if (!batch) throw new Error("Batch not found");

    const currentTotal = batch.totalJobs ?? 0;
    await db
      .update(batches)
      .set({
        totalJobs: currentTotal + increment,
      })
      .where(eq(batches.id, batchId));
  }

  /**
   * Compute batch status from jobs
   */
  async computeAndUpdateBatchStatus(batchId: string): Promise<void> {
    const jobs = await db
      .select({ status: processingJobs.status })
      .from(processingJobs)
      .where(eq(processingJobs.batchId, batchId));

    if (jobs.length === 0) {
      await this.updateBatchStatus(batchId, "pending");
      return;
    }

    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const cancelled = jobs.filter((j) => j.status === "cancelled").length;

    let status: string;
    if (cancelled === jobs.length) {
      status = "cancelled";
    } else if (failed === jobs.length) {
      status = "failed";
    } else if (completed === jobs.length) {
      status = "completed";
    } else if (failed > 0 || cancelled > 0) {
      status = "partial_failure";
    } else {
      status = "processing";
    }

    await db
      .update(batches)
      .set({
        status,
        completedJobs: completed,
        failedJobs: failed,
      })
      .where(eq(batches.id, batchId));
  }

  /**
   * Get batch summary for dashboard
   */
  async getBatchSummary(batchId: string) {
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));

    if (!batch) return null;

    const jobs = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.batchId, batchId));

    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;
    const inProgress = jobs.filter(
      (j) => j.status === "processing" || j.status === "queued",
    ).length;

    return {
      id: batch.id,
      name: batch.name,
      status: batch.status,
      totalJobs: batch.totalJobs,
      completedJobs: completed,
      failedJobs: failed,
      inProgressJobs: inProgress,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt,
    };
  }

  /**
   * Apply style to all images in a batch
   */
  async applyStyleToBatch(
    batchId: string,
    styleId: string,
    intensity: number = 0.7,
    syncAdjustments: boolean = true
  ): Promise<void> {
    const jobs = await db
      .select({
        id: processingJobs.id,
        projectId: processingJobs.projectId,
      })
      .from(processingJobs)
      .where(eq(processingJobs.batchId, batchId));

    // Update all jobs with the new style
    for (const job of jobs) {
      await db
        .update(processingJobs)
        .set({
          styleId,
          intensity: intensity.toString(),
          status: "queued",
        })
        .where(eq(processingJobs.id, job.id));

      // Re-queue for processing
      await imageProcessingQueue.add("process-batch-image", {
        jobId: job.id,
        batchId,
        styleId,
        intensity,
        syncAdjustments,
      });
    }

    // Update batch status to processing
    await this.updateBatchStatus(batchId, "processing");

    logger.info("Style applied to batch", {
      batchId,
      styleId,
      intensity,
      jobCount: jobs.length,
    });
  }

  /**
   * Get detailed progress for batch with per-image status
   */
  async getBatchProgress(batchId: string) {
    const jobs = await db
      .select({
        id: processingJobs.id,
        status: processingJobs.status,
        projectId: processingJobs.projectId,
        errorMessage: processingJobs.errorMessage,
        startedAt: processingJobs.startedAt,
        completedAt: processingJobs.completedAt,
      })
      .from(processingJobs)
      .where(eq(processingJobs.batchId, batchId));

    const progress = {
      total: jobs.length,
      completed: 0,
      failed: 0,
      processing: 0,
      queued: 0,
      images: [] as Array<{
        jobId: string;
        projectId: string;
        status: string;
        error?: string;
        progress?: number;
        startedAt?: Date;
        completedAt?: Date;
      }>,
    };

    for (const job of jobs) {
      const jobProgress = {
        jobId: job.id,
        projectId: job.projectId,
        status: job.status,
        error: job.errorMessage ?? undefined,
        startedAt: job.startedAt ?? undefined,
        completedAt: job.completedAt ?? undefined,
      };

      progress.images.push(jobProgress);

      switch (job.status) {
        case "completed":
          progress.completed++;
          break;
        case "failed":
          progress.failed++;
          break;
        case "processing":
          progress.processing++;
          break;
        case "queued":
          progress.queued++;
          break;
      }
    }

    return progress;
  }

  /**
   * Update individual job in batch (for overrides)
   */
  async updateJobInBatch(
    batchId: string,
    jobId: string,
    updates: {
      styleId?: string;
      intensity?: number;
      status?: string;
    }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (updates.styleId) updateData.styleId = updates.styleId;
    if (updates.intensity) updateData.intensity = updates.intensity.toString();
    if (updates.status) updateData.status = updates.status;

    await db
      .update(processingJobs)
      .set(updateData)
      .where(
        and(
          eq(processingJobs.id, jobId),
          eq(processingJobs.batchId, batchId)
        )
      );

    logger.info("Job updated in batch", {
      batchId,
      jobId,
      updates,
    });
  }

  /**
   * Generate batch export with naming pattern
   */
  async generateBatchExport(
    batchId: string,
    options: {
      format: "jpeg" | "png" | "tiff" | "webp";
      quality: number;
      namingPattern: string;
      includeMetadata?: boolean;
    }
  ): Promise<{
    exportId: string;
    totalImages: number;
    downloadUrl: string;
  }> {
    const batch = await this.getBatch(batchId);
    if (!batch) throw new Error("Batch not found");

    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Queue batch export job
    await imageProcessingQueue.add("batch-export", {
      exportId,
      batchId,
      ...options,
    });

    logger.info("Batch export initiated", {
      exportId,
      batchId,
      format: options.format,
      namingPattern: options.namingPattern,
    });

    return {
      exportId,
      totalImages: batch.totalJobs,
      downloadUrl: `/api/batches/${batchId}/exports/${exportId}`,
    };
  }

  /**
   * Cancel batch processing
   */
  async cancelBatch(batchId: string): Promise<void> {
    // Update all queued/processing jobs to cancelled
    await db
      .update(processingJobs)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(processingJobs.batchId, batchId),
          eq(processingJobs.status, "queued")
        )
      );

    await db
      .update(processingJobs)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(processingJobs.batchId, batchId),
          eq(processingJobs.status, "processing")
        )
      );

    await this.updateBatchStatus(batchId, "cancelled");

    logger.info("Batch cancelled", { batchId });
  }
}

export const batchService = new BatchService();
