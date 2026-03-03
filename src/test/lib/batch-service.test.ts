import { describe, it, expect, beforeEach } from "vitest";
import { batchService } from "@/lib/batch-service";
import { db, batches, processingJobs } from "@/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

describe("batch-service", () => {
  const testUserId = uuidv4();

  beforeEach(async () => {
    // Clean up test data
    await db.delete(processingJobs);
    await db.delete(batches);
  });

  it("should create a batch", async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
      name: "Test Batch",
      description: "Test Description",
    });

    expect(batchId).toMatch(/^batch_/);

    const batch = await batchService.getBatch(batchId);
    expect(batch?.name).toBe("Test Batch");
    expect(batch?.status).toBe("pending");
  });

  it("should list user batches", async () => {
    await batchService.createBatch({
      userId: testUserId,
      name: "Batch 1",
    });
    await batchService.createBatch({
      userId: testUserId,
      name: "Batch 2",
    });

    const list = await batchService.listBatches(testUserId);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it("should increment job count", async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
    });

    await batchService.incrementJobCount(batchId, 5);

    const batch = await batchService.getBatch(batchId);
    expect(batch?.totalJobs).toBe(5);
  });

  it("should compute batch status as pending when no jobs", async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
    });

    await batchService.computeAndUpdateBatchStatus(batchId);

    const batch = await batchService.getBatch(batchId);
    expect(batch?.status).toBe("pending");
  });

  it("should update batch status", async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
    });

    await batchService.updateBatchStatus(batchId, "processing");

    const batch = await batchService.getBatch(batchId);
    expect(batch?.status).toBe("processing");
  });

  it("should get batch summary", async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
      name: "Summary Test",
    });

    const summary = await batchService.getBatchSummary(batchId);
    expect(summary?.name).toBe("Summary Test");
    expect(summary?.totalJobs).toBe(0);
  });
});
