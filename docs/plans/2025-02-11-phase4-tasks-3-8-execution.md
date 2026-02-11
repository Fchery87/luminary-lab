# Phase 4 Tasks 3-8: Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Complete Tasks 3-8 of Phase 4 (Bulk Upload & Batch Processing) with API endpoints, frontend pages, and end-to-end functionality.

**Architecture:** 
- Task 3: POST /api/batches endpoint validates files, creates batch + jobs
- Task 4: GET /api/batches (list), GET /api/batches/:batchId (details), retry/cancel operations
- Task 5: Upload UI with multi-file picker, batch metadata, drag-drop
- Task 6: Status page with polling, job list, progress tracking
- Task 7: Batch list page with pagination and filtering
- Task 8: Full integration testing and verification

**Tech Stack:** Next.js 16, TypeScript, Drizzle ORM, PostgreSQL, Bull Queue, React hooks

---

## Task 3: Create Batch Upload API Endpoint (POST /api/batches)

**Files:**
- Create: `src/app/api/batches/route.ts`
- Create: `src/test/app/api/batches/route.test.ts`
- Modify: `src/lib/job-processor.ts` (update to support batchId)

**Context from Phase 4 Plan:**
- Accept FormData with multiple files + batch metadata (name, description, optional projectId)
- Validate all files (max size, allowed types: RAW image formats)
- Create single batch record with status='pending'
- Create N processingJob records, each linked to batchId
- Enqueue all jobs to Bull queue
- Return { batchId, jobIds, totalJobs, status: 'pending' }
- User isolation via auth session

**Success Criteria:**
- ✅ POST /api/batches accepts FormData with files array
- ✅ Returns batch created with correct totalJobs count
- ✅ All jobs queued to Bull with correct parameters
- ✅ User cannot access other users' batches (403 if not owner)
- ✅ Invalid files rejected with helpful error messages
- ✅ 6+ tests passing
- ✅ TypeScript compiles without errors

---

## Task 4: Create Batch Query & Status Endpoints

**Files:**
- Create: `src/app/api/batches/[batchId]/route.ts` (GET batch details)
- Create: `src/app/api/batches/[batchId]/retry/route.ts` (POST retry failed jobs)
- Create: `src/app/api/batches/[batchId]/cancel/route.ts` (POST cancel batch)
- Create: `src/test/app/api/batches/[batchId]/route.test.ts`
- Modify: `src/app/api/batches/route.ts` (add GET for list)

**Endpoints:**
- GET /api/batches → { items: Batch[], total, page, limit }
- GET /api/batches/:batchId → { id, status, totalJobs, completedJobs, failedJobs, jobs: [] }
- POST /api/batches/:batchId/retry → retry all failed jobs in batch
- POST /api/batches/:batchId/cancel → cancel pending/processing jobs

**Success Criteria:**
- ✅ GET /api/batches returns user's batches paginated (20 per page)
- ✅ GET /api/batches/:batchId includes full job list with statuses
- ✅ Batch status correctly derived from jobs
- ✅ POST retry only retries failed jobs
- ✅ POST cancel sets jobs to 'cancelled', stops processing
- ✅ User isolation enforced (403 if not owner)
- ✅ 10+ tests passing
- ✅ TypeScript compiles without errors

---

## Task 5: Create Batch Upload UI Page

**Files:**
- Create: `src/app/upload/batch/page.tsx`
- Create: `src/components/BatchUploadForm.tsx`
- Create: `src/components/FileList.tsx`
- Create: `src/test/components/BatchUploadForm.test.tsx`

**UI Elements:**
- Drag-drop zone with file input fallback
- File list preview (name, size, type)
- Batch metadata form (name, description optional)
- Submit button with loading state
- Error toast on validation failure
- Success redirect to /batches/:batchId on completion
- Max 50 files per batch (user feedback)
- File type validation (RAW formats)

**Success Criteria:**
- ✅ Files can be selected via drag-drop or input
- ✅ File list displays with proper formatting
- ✅ Submit disabled until files selected
- ✅ Loading state during upload
- ✅ Success redirects to batch status page
- ✅ Errors displayed in toast
- ✅ Form accessible (labels, ARIA)
- ✅ Page renders without errors

---

## Task 6: Create Batch Status/Details Page

**Files:**
- Create: `src/app/batches/[batchId]/page.tsx`
- Create: `src/components/BatchStatusCard.tsx`
- Create: `src/components/JobList.tsx`
- Create: `src/test/app/batches/[batchId]/page.test.tsx`

**Features:**
- Header: batch name, status badge, timestamps
- Progress bar: X completed / Y total, Z failed
- Job list: status, filename, error message if failed
- Action buttons: Retry Failed, Cancel (if processing)
- Polling every 3 seconds while processing (useEffect + setInterval)
- Stop polling when batch is terminal (completed/failed/partial_failure)
- Toast notification on completion

**Success Criteria:**
- ✅ Batch details displayed correctly
- ✅ Progress bar updates during polling
- ✅ Job list shows all jobs with statuses
- ✅ Polling updates UI every 3 seconds
- ✅ Polling stops when batch terminal
- ✅ Retry button re-queues failed jobs
- ✅ Cancel button cancels processing jobs
- ✅ User isolation (404 if not owner)
- ✅ Page renders without errors

---

## Task 7: Create Batch List Page

**Files:**
- Create: `src/app/batches/page.tsx`
- Create: `src/components/BatchTable.tsx`
- Create: `src/test/app/batches/page.test.tsx`

**Features:**
- Table/card listing user's batches
- Columns: Name, Status, Jobs (X/Y), Created, Completed At, Actions
- Pagination: 20 per page with prev/next
- Status filter (optional dropdown)
- Link to batch detail page
- Empty state message if no batches
- Sort by created date (newest first)

**Success Criteria:**
- ✅ Lists user's batches paginated
- ✅ Shows correct job counts
- ✅ Status displayed with proper styling
- ✅ Links navigate to detail page
- ✅ Pagination works correctly
- ✅ Empty state rendered when appropriate
- ✅ Page renders without errors

---

## Task 8: Final Integration & Testing

**Files:**
- Run full test suite
- Verify all endpoints
- Test end-to-end batch workflow

**Verification Steps:**
- ✅ All Phase 4 tests passing (40+ total)
- ✅ TypeScript: 0 errors
- ✅ `bun build` succeeds
- ✅ `bun dev` starts without errors
- ✅ E2E workflow: Create batch → Upload files → Track progress → Retry → Complete
- ✅ Database migrations applied
- ✅ All files committed with clean history

---

## Task Overview

| Task | Component | Type | Estimated |
|------|-----------|------|-----------|
| 3 | Batch Upload API | Backend | 45 min |
| 4 | Query/Status APIs | Backend | 45 min |
| 5 | Upload UI | Frontend | 60 min |
| 6 | Status UI | Frontend | 60 min |
| 7 | List UI | Frontend | 30 min |
| 8 | Integration | Testing | 30 min |

**Total: ~4.5 hours**

---

## Execution Notes

- Each task: implement → spec review → code quality review → commit
- Follow TDD: write tests first, then implementation
- Use absolute imports (@/)
- Leverage observability utilities (logger, metrics, errorTracker)
- Maintain consistency with existing API patterns
- All components follow Next.js 16 + shadcn/ui patterns
