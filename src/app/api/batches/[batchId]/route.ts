/**
 * Batch Detail API Endpoint
 * GET /api/batches/:batchId - Get batch with job details
 * POST /api/batches/:batchId/cancel - Cancel batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { batchService } from '@/lib/batch-service';
import { db, processingJobs } from '@/db';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

/**
 * GET /api/batches/:batchId - Get batch details with job list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
): Promise<NextResponse> {
  const { batchId } = await params;
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

    logger.info('Batch details fetched', { batchId, userId });

    return NextResponse.json({
      ...batch,
      success: true,
    });
  } catch (error) {
    logger.error('Failed to get batch details', error as Error, {
      params,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/batches/:batchId/cancel - Cancel batch and stop processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
): Promise<NextResponse> {
  const { batchId } = await params;
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

    // Update all non-terminal jobs to cancelled
    const cancelledCount = await db
      .update(processingJobs)
      .set({ status: 'cancelled' })
      .where(eq(processingJobs.batchId, batchId))
      .returning({ id: processingJobs.id });

    // Update batch status
    await batchService.updateBatchStatus(batchId, 'cancelled');

    logger.info('Batch cancelled', {
      batchId,
      userId,
      jobsCancelled: cancelledCount.length,
    });

    return NextResponse.json({
      success: true,
      batchId,
      cancelledJobs: cancelledCount.length,
      message: `Cancelled ${cancelledCount.length} jobs`,
    });
  } catch (error) {
    logger.error('Failed to cancel batch', error as Error, {
      params,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
