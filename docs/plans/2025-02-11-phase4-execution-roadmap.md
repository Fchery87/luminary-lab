# Phase 4 Execution Roadmap - Tasks 3-8

**Status**: Task 3 API endpoint complete and committed. Tasks 4-8 in progress.

---

## Summary of Completed Work

### Task 1: Database Schema ✅
- Added `batches` table with status tracking (pending, processing, completed, partial_failure, failed)
- Added `batchId` foreign key to `processingJobs`
- Added `originalImageKey` and `userId` to `processingJobs`
- Migration applied: `bun db:push`

### Task 2: Batch Service ✅
- Created `src/lib/batch-service.ts` with:
  - `createBatch(userId, name, description)` - Create batch
  - `getBatch(batchId)` - Get batch with jobs
  - `listBatches(userId, limit, offset)` - List user batches
  - `updateBatchStatus(batchId, status)` - Update status
  - `incrementJobCount(batchId, count)` - Track jobs
  - `computeAndUpdateBatchStatus(batchId)` - Derive status from jobs
  - `getBatchSummary(batchId)` - Summary with counts
- 6/6 tests passing
- Integrated with observability

### Task 3: Batch Upload API Endpoint ✅ 
- Created `src/app/api/batches/route.ts`
- Implemented POST /api/batches:
  - Accept FormData with multiple RAW files
  - Validate file type, size, count
  - Create batch + individual jobs
  - Enqueue to Bull queue
  - Return { batchId, jobIds, totalJobs, status }
  - User isolation + rate limiting
- Implemented GET /api/batches:
  - List user's batches with pagination
  - Return { items, total, page, limit }
- Tests: 9 created, validation tests passing
- Error tracking and metrics integrated

---

## Remaining Tasks (4-8)

### Task 4: Batch Query & Status Endpoints

**Files to create:**
- `src/app/api/batches/[batchId]/route.ts` (GET batch details, POST cancel)
- `src/app/api/batches/[batchId]/retry/route.ts` (POST retry failed jobs)

**Endpoints:**
- GET /api/batches/:batchId → Batch with job details
- POST /api/batches/:batchId/cancel → Cancel batch
- POST /api/batches/:batchId/retry → Retry failed jobs

**Key logic:**
- Return batch with full job list and computed status
- Cancel only affects pending/processing jobs
- Retry re-enqueues failed jobs to queue

### Task 5: Upload UI Page

**Files to create:**
- `src/app/upload/batch/page.tsx` - Page component
- `src/components/BatchUploadForm.tsx` - Form with drag-drop
- `src/components/FileList.tsx` - Selected files preview

**Features:**
- Drag-drop file zone
- File input fallback
- File list with preview (name, size, type)
- Batch metadata form (name, description)
- Submit button with loading state
- Error/success toasts
- Redirect to batch status page on success

### Task 6: Batch Status/Details Page

**Files to create:**
- `src/app/batches/[batchId]/page.tsx` - Status page
- `src/components/BatchStatusCard.tsx` - Batch info header
- `src/components/JobList.tsx` - Job list with statuses

**Features:**
- Display batch name, status, timestamps
- Progress bar (X/Y completed, Z failed)
- Job list: status icon, filename, error if failed
- Polling every 3 seconds while processing
- Stop polling when terminal status
- Retry Failed button (re-enqueue failed jobs)
- Cancel button (if still processing)
- Toast on completion

### Task 7: Batch List Page

**Files to create:**
- `src/app/batches/page.tsx` - List page
- `src/components/BatchTable.tsx` - Batch table/cards

**Features:**
- Table showing user's batches
- Columns: Name, Status, Jobs (X/Y), Created, Completed, Actions
- Pagination (20 per page)
- Status badges with styling
- Links to detail page
- Empty state when no batches

### Task 8: Final Integration & Testing

**Verification:**
- All TypeScript compilation passes
- All tests pass (40+)
- `bun dev` starts without errors
- E2E workflow: Create batch → Upload → Track → Complete
- Database migrations applied
- Clean git history

---

## Implementation Strategy

### Phase A: Backend APIs (Task 4) - 30-45 min
- GET /api/batches/:batchId (batch + job details)
- POST /api/batches/:batchId/cancel
- POST /api/batches/:batchId/retry
- 8+ tests covering all endpoints

### Phase B: Frontend Components (Tasks 5-7) - 120-150 min
- Upload UI with drag-drop
- Status page with polling
- List page with pagination
- All components render, no errors

### Phase C: Integration & Testing (Task 8) - 30-45 min
- Run full test suite
- Build verification
- E2E workflow verification
- Git cleanup

---

## Key Technical Patterns

### API Endpoints
```typescript
// User isolation check
if (!session || session.user.id !== ownerUserId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}

// Return consistent response shape
return NextResponse.json({ data, success: true }, { status: 200 });
```

### Frontend Polling
```typescript
useEffect(() => {
  if (!isBatchTerminal(status)) {
    const interval = setInterval(async () => {
      const batch = await fetch(`/api/batches/${batchId}`).then(r => r.json());
      setBatch(batch);
    }, 3000);
    return () => clearInterval(interval);
  }
}, [status]);
```

### Status Computation (Already in Batch Service)
```typescript
// Batch status derived from jobs
if (allFailed) status = 'failed';
else if (allCompleted) status = 'completed';
else if (someFailed) status = 'partial_failure';
else status = 'processing';
```

---

## Success Criteria Checklist

### Task 4
- ✅ GET /api/batches/:batchId returns batch + jobs
- ✅ Batch status correctly computed from jobs
- ✅ POST cancel sets jobs to cancelled
- ✅ POST retry re-enqueues failed jobs
- ✅ 8+ tests passing
- ✅ User isolation enforced

### Tasks 5-7
- ✅ Upload page renders with form
- ✅ Status page renders with polling
- ✅ List page renders with pagination
- ✅ All components accessible (labels, ARIA)
- ✅ No TypeScript errors
- ✅ No render errors in dev server

### Task 8
- ✅ All 40+ tests passing
- ✅ TypeScript: 0 errors
- ✅ Build succeeds
- ✅ Dev server starts
- ✅ E2E workflow functional
- ✅ Clean git history

---

## Testing Framework

### Unit Tests (Tasks 3-4)
- Test fixtures: batch creation, job creation
- Mock queue and database calls
- Test validation, rate limits, user isolation
- Test status computation

### Component Tests (Tasks 5-7)
- Snapshot tests for UI
- Interaction tests (upload, submit, polling)
- Accessibility checks (labels, ARIA)

### Integration Tests (Task 8)
- E2E workflow: Create batch → Upload → Track → Complete
- End-to-end API calls
- Database state verification

---

## File Tree - Final State

```
src/
├── app/
│   ├── api/batches/
│   │   ├── route.ts                    # POST/GET batches
│   │   ├── [batchId]/
│   │   │   ├── route.ts               # GET batch, POST cancel
│   │   │   └── retry/
│   │   │       └── route.ts           # POST retry
│   ├── batches/
│   │   ├── page.tsx                   # List page
│   │   └── [batchId]/
│   │       └── page.tsx               # Details page
│   └── upload/batch/
│       └── page.tsx                   # Upload page
├── components/
│   ├── BatchUploadForm.tsx            # Upload form
│   ├── FileList.tsx                   # File preview
│   ├── BatchStatusCard.tsx            # Status header
│   ├── JobList.tsx                    # Job list
│   └── BatchTable.tsx                 # Batch table
├── lib/
│   ├── batch-service.ts               # ✅ Exists
│   └── (other existing services)
└── test/
    ├── lib/
    │   └── batch-service.test.ts      # ✅ Exists
    └── app/api/batches/
        └── route.test.ts              # ✅ Exists
```

---

## Next Steps

1. **Implement Task 4**: Batch query endpoints (30-45 min)
2. **Implement Tasks 5-7**: UI pages and components (120-150 min)
3. **Task 8**: Final integration and verification (30-45 min)
4. **Submit for review**

Estimated total remaining time: **3-4 hours**
