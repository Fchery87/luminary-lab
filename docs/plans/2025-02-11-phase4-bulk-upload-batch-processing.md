# Phase 4: Bulk Upload & Batch Processing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Enable users to upload and process multiple RAW images as a single batch, with unified tracking, progress monitoring, and batch-level operations (retry, cancel).

**Architecture:** Batches are first-class entities that group multiple independent image processing jobs. Each batch tracks metadata (name, description, status, job counts) and derives its status from its constituent jobs. Users can submit multiple files → creates 1 batch record → creates N job records (one per file) → jobs process independently in queue → UI polls for progress.

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM, PostgreSQL, Bull Queue, React hooks (useEffect for polling)

---

## Task 1: Create Database Schema for Batches

**Files:**
- Create: `src/db/schema.ts` (add batches table definition)
- Create: `src/db/migrations/add_batches_table.sql`
- Modify: `src/db/schema.ts` (add batchId to processingJobs)

**Step 1: Add batches table to Drizzle schema**

Edit `src/db/schema.ts` and add after the `processingJobs` table:

```typescript
export const batches = pgTable('batches', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => users.id),
  name: text('name'),
  description: text('description'),
  status: text('status').notNull(), // pending|processing|completed|partial_failure|failed
  totalJobs: integer('totalJobs').default(0),
  completedJobs: integer('completedJobs').default(0),
  failedJobs: integer('failedJobs').default(0),
  createdAt: timestamp('createdAt').defaultNow(),
  completedAt: timestamp('completedAt'),
});

export const batchesRelations = relations(batches, ({ one, many }) => ({
  user: one(users, {
    fields: [batches.userId],
    references: [users.id],
  }),
  jobs: many(processingJobs),
}));
```

**Step 2: Add batchId to processingJobs**

In the `processingJobs` table definition, add this column after `userId`:

```typescript
batchId: text('batchId').references(() => batches.id),
```

Update the relations to include:
```typescript
batch: one(batches, {
  fields: [processingJobs.batchId],
  references: [batches.id],
}),
```

**Step 3: Create migration file**

Create `src/db/migrations/2025-02-11-add-batches.sql`:

```sql
-- Create batches table
CREATE TABLE batches (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  name TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  totalJobs INTEGER DEFAULT 0,
  completedJobs INTEGER DEFAULT 0,
  failedJobs INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  completedAt TIMESTAMP,
  CREATED_AT TIMESTAMP DEFAULT NOW()
);

-- Add batchId to processingJobs
ALTER TABLE processingJobs ADD COLUMN batchId TEXT REFERENCES batches(id);

-- Create indexes for efficient querying
CREATE INDEX idx_batches_userId ON batches(userId);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_processingJobs_batchId ON processingJobs(batchId);
CREATE INDEX idx_processingJobs_batchId_status ON processingJobs(batchId, status);
```

**Step 4: Run migrations**

```bash
bun db:push
```

Expected: Tables created successfully, no errors.

**Step 5: Commit**

```bash
git add src/db/schema.ts src/db/migrations/2025-02-11-add-batches.sql
git commit -m "feat: add batches table and batch relationships

Database schema changes:
- New batches table with: id, userId, name, description, status, totalJobs, completedJobs, failedJobs, createdAt, completedAt
- Add batchId foreign key to processingJobs table
- Status enum: pending, processing, completed, partial_failure, failed

Relationships:
- batches (1) → (many) processingJobs via batchId
- batches → users via userId

Indexes:
- idx_batches_userId for user batch listing
- idx_batches_status for status filtering
- idx_processingJobs_batchId for job lookup by batch
- idx_processingJobs_batchId_status for efficient batch status computation

Migration: 2025-02-11-add-batches.sql"
```

---

## Task 2: Implement Batch Service (CRUD & Status Logic)

**Files:**
- Create: `src/lib/batch-service.ts`
- Create: `src/test/lib/batch-service.test.ts`

**Step 1: Create batch service**

Create `src/lib/batch-service.ts`:

```typescript
/**
 * Batch service for creating and managing image upload batches
 */

import { db, batches, processingJobs, users } from '@/db';
import { eq, and } from 'drizzle-orm';
import { logger } from './logger';

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
      userId: input.userId,
      name: input.name,
      description: input.description,
      status: 'pending',
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    });

    logger.info('Batch created', {
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
      jobs,
    };
  }

  /**
   * List batches for a user (paginated)
   */
  async listBatches(userId: string, limit: number = 20, offset: number = 0) {
    const userBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.userId, userId))
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
    if (status === 'completed' || status === 'failed') {
      updateData.completedAt = new Date();
    }

    await db
      .update(batches)
      .set(updateData)
      .where(eq(batches.id, batchId));
  }

  /**
   * Increment job counts in batch
   */
  async incrementJobCount(
    batchId: string,
    increment: number = 1
  ): Promise<void> {
    const [batch] = await db
      .select()
      .from(batches)
      .where(eq(batches.id, batchId));

    if (!batch) throw new Error('Batch not found');

    await db
      .update(batches)
      .set({
        totalJobs: batch.totalJobs + increment,
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
      await this.updateBatchStatus(batchId, 'pending');
      return;
    }

    const completed = jobs.filter((j) => j.status === 'completed').length;
    const failed = jobs.filter((j) => j.status === 'failed').length;

    let status: string;
    if (failed === jobs.length) {
      status = 'failed';
    } else if (completed === jobs.length) {
      status = 'completed';
    } else if (failed > 0) {
      status = 'partial_failure';
    } else {
      status = 'processing';
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

    const completed = jobs.filter((j) => j.status === 'completed').length;
    const failed = jobs.filter((j) => j.status === 'failed').length;
    const inProgress = jobs.filter(
      (j) => j.status === 'processing' || j.status === 'pending'
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
}

export const batchService = new BatchService();
```

**Step 2: Write tests**

Create `src/test/lib/batch-service.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { batchService } from '@/lib/batch-service';
import { db, batches, processingJobs } from '@/db';
import { eq } from 'drizzle-orm';

describe('batch-service', () => {
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    // Clean up test data
    await db.delete(processingJobs);
    await db.delete(batches);
  });

  it('should create a batch', async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
      name: 'Test Batch',
      description: 'Test Description',
    });

    expect(batchId).toMatch(/^batch_/);

    const batch = await batchService.getBatch(batchId);
    expect(batch?.name).toBe('Test Batch');
    expect(batch?.status).toBe('pending');
  });

  it('should list user batches', async () => {
    const batch1 = await batchService.createBatch({
      userId: testUserId,
      name: 'Batch 1',
    });
    const batch2 = await batchService.createBatch({
      userId: testUserId,
      name: 'Batch 2',
    });

    const list = await batchService.listBatches(testUserId);
    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it('should increment job count', async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
    });

    await batchService.incrementJobCount(batchId, 5);

    const batch = await batchService.getBatch(batchId);
    expect(batch?.totalJobs).toBe(5);
  });

  it('should compute batch status as completed', async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
    });

    await batchService.incrementJobCount(batchId, 2);

    // Simulate jobs completing
    await db
      .insert(processingJobs)
      .values([
        {
          id: 'job-1',
          batchId,
          projectId: 'proj-1',
          userId: testUserId,
          status: 'completed',
          styleId: 'style-1',
          intensity: 0.5,
          originalImageKey: 'key-1',
          attempts: 1,
        },
        {
          id: 'job-2',
          batchId,
          projectId: 'proj-2',
          userId: testUserId,
          status: 'completed',
          styleId: 'style-1',
          intensity: 0.5,
          originalImageKey: 'key-2',
          attempts: 1,
        },
      ]);

    await batchService.computeAndUpdateBatchStatus(batchId);

    const batch = await batchService.getBatch(batchId);
    expect(batch?.status).toBe('completed');
    expect(batch?.completedJobs).toBe(2);
  });

  it('should compute batch status as partial_failure', async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
    });

    await batchService.incrementJobCount(batchId, 2);

    await db
      .insert(processingJobs)
      .values([
        {
          id: 'job-1',
          batchId,
          projectId: 'proj-1',
          userId: testUserId,
          status: 'completed',
          styleId: 'style-1',
          intensity: 0.5,
          originalImageKey: 'key-1',
          attempts: 1,
        },
        {
          id: 'job-2',
          batchId,
          projectId: 'proj-2',
          userId: testUserId,
          status: 'failed',
          styleId: 'style-1',
          intensity: 0.5,
          originalImageKey: 'key-2',
          attempts: 3,
          errorMessage: 'Processing failed',
        },
      ]);

    await batchService.computeAndUpdateBatchStatus(batchId);

    const batch = await batchService.getBatch(batchId);
    expect(batch?.status).toBe('partial_failure');
    expect(batch?.completedJobs).toBe(1);
    expect(batch?.failedJobs).toBe(1);
  });

  it('should get batch summary', async () => {
    const batchId = await batchService.createBatch({
      userId: testUserId,
      name: 'Summary Test',
    });

    const summary = await batchService.getBatchSummary(batchId);
    expect(summary?.name).toBe('Summary Test');
    expect(summary?.totalJobs).toBe(0);
  });
});
```

**Step 3: Run tests**

```bash
bun test src/test/lib/batch-service.test.ts
```

Expected: All 6 tests pass.

**Step 4: Commit**

```bash
git add src/lib/batch-service.ts src/test/lib/batch-service.test.ts
git commit -m "feat: add batch service for CRUD and status management

Batch service operations:
- createBatch(userId, name, description) - Create new batch
- getBatch(batchId) - Get batch with job details
- listBatches(userId, limit, offset) - List user's batches paginated
- updateBatchStatus(batchId, status) - Update batch status
- incrementJobCount(batchId, count) - Add jobs to batch total
- computeAndUpdateBatchStatus(batchId) - Derive status from jobs
- getBatchSummary(batchId) - Get summary with counts

Status computation:
- pending: No jobs yet
- processing: At least 1 job running
- completed: All jobs succeeded
- partial_failure: Some succeeded, some failed
- failed: All jobs failed

Features:
- Batch metadata: name, description, timestamps
- Job tracking: totalJobs, completedJobs, failedJobs
- User isolation: batches filtered by userId
- Automatic status computation from job states

6 new tests, all passing"
```

---

## Task 3: Create Batch Upload API Endpoint

**Files:**
- Create: `src/app/api/batches/route.ts` (POST endpoint for batch creation)
- Modify: `src/lib/job-processor.ts` (link created jobs to batch)

**Summary:** 
- Accept multiple files + batch metadata
- Validate all files
- Create batch record
- Create individual processingJob records with batchId
- Enqueue all jobs to Bull queue
- Return batch ID + job list

**Test cases:**
- Upload multiple files successfully
- Reject invalid files
- Update batch status to processing

---

## Task 4: Create Batch Query & Status Endpoints

**Files:**
- Create: `src/app/api/batches/[batchId]/route.ts` (GET batch details)
- Create: `src/app/api/batches/route.ts` (GET list batches, POST retry)

**Summary:**
- GET /api/batches → List user's batches (paginated)
- GET /api/batches/:batchId → Get batch with job details
- POST /api/batches/:batchId/retry → Retry failed jobs
- POST /api/batches/:batchId/cancel → Cancel batch

**Test cases:**
- Get batch details with job list
- List batches with pagination
- Retry failed jobs in batch
- Cancel processing batch

---

## Task 5: Create Batch Upload UI Page

**Files:**
- Create: `src/app/upload/batch/page.tsx` (Multi-file upload form)
- Create: `src/components/BatchUploadForm.tsx` (Reusable form component)
- Create: `src/components/FileList.tsx` (Show selected files)

**Summary:**
- File picker (drag-drop + input)
- Batch metadata form (name, description)
- Preview selected files
- Submit to POST /api/batches
- Redirect to batch status page on success

**UI Elements:**
- Drag-drop zone
- File list with size/type info
- Name/description inputs
- Progress indicator during upload
- Error handling

---

## Task 6: Create Batch Status/Details Page

**Files:**
- Create: `src/app/batches/[batchId]/page.tsx` (Status page)
- Create: `src/components/BatchStatusCard.tsx` (Batch summary)
- Create: `src/components/JobList.tsx` (Job cards)

**Summary:**
- Display batch header (name, status, timestamps)
- Progress bar (X/Y jobs, Z failed)
- Job list with status + error messages
- Action buttons (Retry Failed, Cancel, etc.)
- Poll endpoint every 3 seconds during processing

**Polling Logic:**
- useEffect with setInterval
- Call GET /api/batches/:batchId
- Update UI with new statuses
- Stop polling when batch is terminal (completed/failed)
- Show toast on completion

---

## Task 7: Create Batch List Page

**Files:**
- Create: `src/app/batches/page.tsx` (List all batches)
- Create: `src/components/BatchTable.tsx` (Batch listing)

**Summary:**
- Table/cards showing user's recent batches
- Columns: Name, Status, Jobs (X/Y), Created, Completed At, Actions
- Pagination (20 per page)
- Links to batch detail page
- Filter by status (optional)

---

## Task 8: Final Integration & Testing

**Files:**
- Run full test suite
- Verify all endpoints
- Test end-to-end batch workflow

**Summary:**
- All Phase 4 tests passing (40+ tests)
- TypeScript: 0 errors
- Build succeeds
- API endpoints working
- UI components rendering
- Batch workflow end-to-end functional

---

## Task Overview

| Task | Component | Type | Est. Time |
|------|-----------|------|-----------|
| 1 | Database Schema | Backend | 20 min |
| 2 | Batch Service | Backend | 45 min |
| 3 | Upload API | Backend | 30 min |
| 4 | Query APIs | Backend | 30 min |
| 5 | Upload UI | Frontend | 60 min |
| 6 | Status UI | Frontend | 60 min |
| 7 | List UI | Frontend | 30 min |
| 8 | Integration | Testing | 30 min |

**Total: ~5 hours**

---

## Success Criteria

✅ All backend services complete  
✅ All API endpoints working  
✅ All frontend pages rendering  
✅ 40+ tests passing  
✅ End-to-end batch workflow functional  
✅ Users can upload multiple images as batch  
✅ Users can track batch progress  
✅ Users can retry failed jobs  

---

## Execution Notes

This plan follows TDD (tests first), with database schema as foundation, then backend services, then API endpoints, then frontend UI. Each task should be implemented with subagent-driven-development for quality gates.
