/**
 * Batch Upload API Endpoint
 * POST /api/batches - Create a batch and enqueue multiple images for processing
 * GET /api/batches - List user's batches (paginated)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { batchService } from "@/lib/batch-service";
import { getImageProcessingQueue, ImageProcessingJob } from "@/lib/queue";
import { isValidRawFile, generateFileKey, RAW_MIME_TYPES } from "@/lib/s3";
import { detectMimeType } from "@/lib/mime-types";
import { db, processingJobs, projects } from "@/db";
import {
  checkUploadRateLimit,
  checkUploadBytesRateLimit,
} from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { errorTracker } from "@/lib/error-tracker";
import { metricsCollector } from "@/lib/metrics";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";

const MAX_FILES_PER_BATCH = 50;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MIN_FILES_PER_BATCH = 1;

interface BatchUploadResponse {
  success: boolean;
  batchId: string;
  totalJobs: number;
  jobIds: string[];
  status: string;
  createdAt: Date;
}

interface BatchListResponse {
  items: any[];
  total: number;
  page: number;
  limit: number;
}

/**
 * POST /api/batches - Create and process a batch upload
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = performance.now();
  let userId: string | undefined;
  let batchId: string | undefined;

  try {
    // Get authenticated session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      logger.warn("Batch upload attempted without authentication");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = session.user.id;

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const batchName = formData.get("name") as string | null;
    const batchDescription = formData.get("description") as string | null;

    // Validate file count
    if (files.length < MIN_FILES_PER_BATCH) {
      errorTracker.track("batch_upload_validation", "No files provided", {
        endpoint: "/api/batches",
        userId,
        severity: "low",
      });
      return NextResponse.json(
        { error: "At least 1 file is required" },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES_PER_BATCH) {
      errorTracker.track(
        "batch_upload_validation",
        `Too many files: ${files.length}/${MAX_FILES_PER_BATCH}`,
        { endpoint: "/api/batches", userId, severity: "low" },
      );
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_BATCH} files per batch` },
        { status: 400 },
      );
    }

    // Validate each file
    const validatedFiles: Array<{ file: File; mimeType: string }> = [];
    let totalBytes = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errorTracker.track(
          "batch_upload_validation",
          `File too large: ${file.name} (${file.size}/${MAX_FILE_SIZE})`,
          { endpoint: "/api/batches", userId, severity: "low" },
        );
        return NextResponse.json(
          {
            error: `File "${file.name}" exceeds 100MB limit`,
            details: `File size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
          },
          { status: 400 },
        );
      }

      // Detect MIME type
      const detectedMimeType = detectMimeType(file.name, undefined, file.type);

      // Validate RAW format
      if (!detectedMimeType || !isValidRawFile(detectedMimeType)) {
        errorTracker.track(
          "batch_upload_validation",
          `Invalid file type: ${file.name}`,
          { endpoint: "/api/batches", userId, severity: "low" },
        );
        return NextResponse.json(
          {
            error: `Invalid file type in "${file.name}". Only RAW files are allowed.`,
            allowedFormats: Object.values(RAW_MIME_TYPES),
          },
          { status: 400 },
        );
      }

      validatedFiles.push({ file, mimeType: detectedMimeType });
      totalBytes += file.size;
    }

    // Check upload rate limits
    const uploadCountLimitCheck = await checkUploadRateLimit(userId);
    if (!uploadCountLimitCheck.success) {
      logger.warn("Batch upload rate limit exceeded: count", {
        userId,
        fileCount: files.length,
        retryAfter: uploadCountLimitCheck.retryAfter,
      });
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many uploads. Max 10 per hour. Retry in ${uploadCountLimitCheck.retryAfter}s`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(uploadCountLimitCheck.retryAfter),
            "X-RateLimit-Remaining": String(uploadCountLimitCheck.remaining),
          },
        },
      );
    }

    const uploadBytesLimitCheck = await checkUploadBytesRateLimit(
      userId,
      totalBytes,
    );
    if (!uploadBytesLimitCheck.success) {
      logger.warn("Batch upload rate limit exceeded: bytes", {
        userId,
        totalBytes,
        remaining: uploadBytesLimitCheck.remaining,
      });
      return NextResponse.json(
        {
          error: "Storage quota exceeded",
          message: `Upload would exceed your 5GB/hour limit. ${(uploadBytesLimitCheck.remaining / (1024 * 1024 * 1024)).toFixed(2)}GB remaining.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(uploadBytesLimitCheck.retryAfter) },
        },
      );
    }

    // Create batch record
    batchId = await batchService.createBatch({
      userId,
      name: batchName || `Batch ${new Date().toLocaleDateString()}`,
      description: batchDescription || undefined,
    });

    logger.info("Batch created", {
      batchId,
      userId,
      fileCount: validatedFiles.length,
      totalSize: totalBytes,
    });

    // Create jobs and enqueue
    const queue = getImageProcessingQueue();
    const jobIds: string[] = [];

    for (const { file, mimeType } of validatedFiles) {
      const projectId = uuidv7();
      const defaultStyleId = uuidv7();

      // Generate S3 key
      const fileKey = generateFileKey(userId, batchId, file.name, "original");

      // Create project for this batch job
      await db.insert(projects).values({
        id: projectId,
        userId: userId as any,
        name: file.name,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Create processingJob record (id is auto-generated)
      const [insertedJob] = await db
        .insert(processingJobs)
        .values({
          projectId,
          userId: userId as any,
          batchId,
          styleId: defaultStyleId as any,
          intensity: "1.00" as any, // Decimal field expects string
          status: "queued",
          originalImageKey: fileKey,
        })
        .returning({ id: processingJobs.id });

      const createdJobId = insertedJob.id;

      // Create queue job (BullMQ format: name, data, opts)
      await queue.add(
        "process-image",
        {
          id: createdJobId,
          projectId,
          userId,
          styleId: defaultStyleId,
          intensity: 1.0,
          originalImageKey: fileKey,
        },
        {
          jobId: `batch-${batchId}-${createdJobId}`,
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
          removeOnComplete: true,
        },
      );

      jobIds.push(createdJobId);
      logger.debug("Job enqueued", {
        jobId: createdJobId,
        batchId,
        filename: file.name,
      });
    }

    // Update batch with job count
    await batchService.incrementJobCount(batchId, validatedFiles.length);

    // Update batch status to processing
    await batchService.updateBatchStatus(batchId, "processing");

    // Record metrics
    const duration = performance.now() - startTime;
    metricsCollector.record("batch_upload", duration, "ms", {
      fileCount: String(validatedFiles.length),
      totalSize: String(totalBytes),
    });

    logger.info("Batch upload completed", {
      batchId,
      userId,
      jobCount: jobIds.length,
      duration,
    });

    const response: BatchUploadResponse = {
      success: true,
      batchId,
      totalJobs: validatedFiles.length,
      jobIds,
      status: "processing",
      createdAt: new Date(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error("Batch upload failed", error as Error, {
      userId,
      batchId,
    });

    errorTracker.track(
      "batch_upload_error",
      error instanceof Error ? error.message : "Unknown error",
      {
        endpoint: "/api/batches",
        userId,
        severity: "high",
      },
    );

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/batches - List user's batches (paginated)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "20")),
    );
    const offset = (page - 1) * limit;

    // Get total count
    const totalBatches = await batchService.listBatches(userId, 1000, 0);
    const total = totalBatches.length;

    // Get paginated results
    const items = await batchService.listBatches(userId, limit, offset);

    const response: BatchListResponse = {
      items,
      total,
      page,
      limit,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error("Failed to list batches", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
