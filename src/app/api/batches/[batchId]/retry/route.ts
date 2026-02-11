/**
 * Batch Retry API Endpoint
 * POST /api/batches/:batchId/retry - Retry failed jobs in batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { batchService } from '@/lib/batch-service';
import { getImageProcessingQueue, ImageProcessingJob } from '@/lib/queue';
import { db, processingJobs } from '@/db';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * POST /api/batches/:batchId/retry - Retry all failed jobs in batch
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { batchId: string } }
): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { batchId } = params;

    // Get batch
    const batch = await batchService.getBatch(batchId);

    if (!batch) {
      return NextResponse.json(
        { error: 'Batch not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (batch.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get all failed jobs in batch
    const failedJobs = await db
      .select()
      .from(processingJobs)
      .where(eq(processingJobs.batchId, batchId));

    const jobsToRetry = failedJobs.filter(job => job.status === 'failed');

    if (jobsToRetry.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No failed jobs to retry',
        retriedCount: 0,
      });
    }

    // Re-enqueue failed jobs
    const queue = getImageProcessingQueue();
    let retriedCount = 0;

    for (const job of jobsToRetry) {
      try {
        // Reset job status to queued
        await db
          .update(processingJobs)
          .set({
            status: 'queued',
            attempts: 0,
            errorMessage: null,
          })
          .where(eq(processingJobs.id, job.id));

        // Re-enqueue to queue
        await queue.add(
          {
            id: job.id,
            projectId: job.projectId,
            userId: job.userId,
            batchId: job.batchId,
            styleId: job.styleId,
            intensity: parseFloat(job.intensity as any),
            originalImageKey: job.originalImageKey!,
          } as ImageProcessingJob,
          {
            jobId: `retry-${batchId}-${job.id}`,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
          }
        );

        retriedCount++;
      } catch (error) {
        logger.error('Failed to retry job', error as Error, {
          jobId: job.id,
          batchId,
        });
      }
    }

    // Update batch status back to processing if we retried jobs
    if (retriedCount > 0) {
      await batchService.updateBatchStatus(batchId, 'processing');
    }

    logger.info('Batch jobs retried', {
      batchId,
      userId,
      retriedCount,
      totalFailed: jobsToRetry.length,
    });

    return NextResponse.json({
      success: true,
      batchId,
      retriedCount,
      totalFailed: jobsToRetry.length,
      message: `Retried ${retriedCount}/${jobsToRetry.length} failed jobs`,
    });
  } catch (error) {
    logger.error('Failed to retry batch jobs', error as Error, {
      params,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
