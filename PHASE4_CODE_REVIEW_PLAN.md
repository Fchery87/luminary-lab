# Phase 4 Code Review & Fix Plan

## Issues Identified

### Critical TypeScript Errors (9 issues)

1. **Route Handler Params Type (Next.js 16 Breaking Change)**
   - File: `src/app/api/batches/[batchId]/route.ts`
   - Issue: Next.js 16 changed params from `{ params: { ... } }` to `{ params: Promise<{ ... }> }`
   - Impact: Type mismatch on GET and POST handlers
   - Fix: Await params in handler signature

2. **Missing userId in processingJobs Insert**
   - File: `src/app/api/process/route.ts:85`
   - Issue: Drizzle insert missing required `userId` field
   - Impact: Database constraint violation
   - Fix: Add userId to insert values

3. **Missing react-hot-toast Import**
   - File: `src/app/upload/batch/page.tsx:9`
   - Issue: Imported `useState as useToast` from react-hot-toast but not installed
   - Impact: Module not found at runtime
   - Fix: Remove unused import, fix error handling

4. **Error Object Extra Properties**
   - Files: 
     - `src/app/upload/page.tsx:170` - error property on Error
     - `src/lib/job-processor.ts:208` - projectId property on Error
     - `src/lib/logger.test.ts:38` - error property on Error
   - Issue: Cannot add custom properties to Error objects directly
   - Impact: TypeScript strict mode violation
   - Fix: Use error casting `as any` or create custom error class

5. **Null Type Union in Job Selection**
   - File: `src/lib/batch-service.ts:83`
   - Issue: errorMessage can be null but type expects undefined
   - Impact: Type incompatibility
   - Fix: Filter nulls or change type to allow null

6. **Null Coalescing Without Guard**
   - File: `src/lib/batch-service.ts:134`
   - Issue: `batch.totalJobs` is possibly null
   - Impact: Potential runtime error
   - Fix: Add null check or use non-null assertion with guard

7. **FormData Type Spread in Test**
   - File: `src/test/app/api/batches/route.test.ts:50`
   - Issue: Cannot spread FormData type
   - Impact: Test compilation fails
   - Fix: Remove spread, use proper FormData API

### Lint Warnings (2 issues)

8. **Missing useEffect Dependencies**
   - File: `src/app/batches/[batchId]/page.tsx:74, 82`
   - Issue: useEffect depends on `fetchBatch` but not in dependency array
   - Impact: Stale closures, infinite loops
   - Fix: Use useCallback for fetchBatch, add to dependencies

## Fix Strategy

### Phase 1: Critical Errors (Blocks compilation)
- Fix route handler params type (Next.js 16)
- Fix userId in processingJobs insert
- Fix react-hot-toast import issue

### Phase 2: Type Errors (Type safety)
- Fix Error object property assignments
- Fix null handling in batch-service
- Fix FormData spread in tests

### Phase 3: Lint & Dependencies (Code quality)
- Fix useEffect dependencies
- Update dependency arrays

### Phase 4: Verification
- Run `tsc --noEmit` - should pass
- Run `bun lint` - should pass
- Run tests - should pass
- Run dev server - should start cleanly
