---
description: Validate the Luminary Lab codebase comprehensively
---

# Validate Luminary Lab

Comprehensive validation of the Luminary Lab AI-powered RAW photo processing application.

## Phase 1: Linting

Run ESLint to catch code quality issues, potential bugs, and enforce coding standards.

```bash
echo "=== Phase 1: Linting ==="
bun lint
```

## Phase 2: Type Checking

Run TypeScript compiler with strict mode to catch type errors, missing types, and potential runtime issues.

```bash
echo "=== Phase 2: Type Checking ==="
bunx tsc --noEmit
```

## Phase 3: Style Checking

Check if the application builds successfully without errors.

```bash
echo "=== Phase 3: Build Check ==="
bun build
```

## Phase 4: Unit Testing

Run existing unit tests using Bun test runner. Currently includes:
- Smoke tests (`src/smoke.test.ts`)
- API validation tests (`src/app/api/validation.test.ts`)
- Logger tests (`src/lib/logger.test.ts`)
- Form validation tests (`src/lib/validation.test.ts`)

```bash
echo "=== Phase 4: Unit Testing ==="
bun test
```

## Phase 5: Database Schema Validation

Verify database schema is valid and migrations are applied.

```bash
echo "=== Phase 5: Database Validation ==="
echo "Validating database schema..."
bunx drizzle-kit generate
echo "Database schema validated successfully"
```

## Phase 6: E2E Testing with Playwright

Run end-to-end tests with Playwright to validate complete user workflows.

**Note:** E2E tests require:
- Database connection (DATABASE_URL)
- R2/S3 storage configured
- Development server running on port 3000

```bash
echo "=== Phase 6: E2E Testing ==="
bun test:e2e
```

## Phase 7: End-to-End User Workflow Validation

These are the critical user workflows to validate manually or with automated tests:

### Workflow 1: User Registration and Login
1. Navigate to `/register`
2. Create a new account with valid email and password
3. Verify user is redirected to dashboard
4. Logout and login again with same credentials
5. Verify session persistence

### Workflow 2: RAW File Upload
1. Login to the application
2. Navigate to upload page
3. Upload a valid RAW file (.CR2, .NEF, .ARW, .DNG) under 100MB
4. Verify file is accepted and thumbnail preview generated
5. Try uploading invalid file type (JPG, PNG) - should fail
6. Try uploading file > 100MB - should fail

### Workflow 3: Preset Selection and Image Processing
1. After upload, view preset gallery
2. Select a preset (e.g., "Clean Commercial Beauty")
3. Adjust intensity slider (0-100%)
4. Click "Apply/Process" button
5. Verify processing job is created
6. Wait for processing to complete
7. View result with before/after comparison

### Workflow 4: Image Export
1. Navigate to processed project
2. Click "Export" button
3. Select export format (JPG sRGB or 16-bit TIFF)
4. Verify file downloads correctly
5. Verify exported file has correct format and quality

### Workflow 5: Project Management
1. View project gallery on dashboard
2. Verify projects display with thumbnails
3. Click on a project to view details
4. Edit project name
5. Verify changes are persisted

### Workflow 6: Dashboard Activity and Stats
1. View dashboard statistics
2. Verify activity log shows recent actions
3. Check upload counts and processing stats
4. Verify data matches database records

### Workflow 7: API Endpoints Validation

#### Authentication Endpoints
```bash
# Test session endpoint
curl -X GET http://localhost:3000/api/auth/session \
  -H "Content-Type: application/json"
```

#### Upload Endpoint
```bash
# Test upload initiation (requires auth token)
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "test.CR2",
    "fileSize": 10485760,
    "mimeType": "image/x-canon-cr2",
    "projectName": "Test Project"
  }'
```

#### Presets Endpoint
```bash
# Get all available presets
curl -X GET http://localhost:3000/api/presets
```

#### Projects Endpoint
```bash
# Get user projects (requires auth)
curl -X GET http://localhost:3000/api/projects
```

#### Dashboard Stats Endpoint
```bash
# Get dashboard statistics (requires auth)
curl -X GET http://localhost:3000/api/dashboard/stats
```

#### Dashboard Activity Endpoint
```bash
# Get user activity (requires auth)
curl -X GET http://localhost:3000/api/dashboard/activity
```

### Workflow 8: External Integrations Validation

#### Cloudflare R2 / AWS S3 Storage
```bash
echo "Testing R2/S3 configuration..."
bun run r2:verify
```

Verify:
- Connection to R2/S3 works
- Presigned URLs are generated correctly
- Files can be uploaded/downloaded
- Multipart upload works for large files

#### Redis Queue System
```bash
# Verify Redis connection is configured
echo "Redis URL: $REDIS_URL"
```

Verify:
- Redis connection works
- Job queue can be accessed
- Job processing completes successfully

#### Stripe Integration (if configured)
```bash
echo "Stripe configured: $STRIPE_SECRET_KEY"
```

Verify webhook endpoint exists:
```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "event"}'
```

#### AI Service Integration
```bash
echo "AI Service URL: $AI_API_URL"
echo "AI API Key configured: $(if [ -n "$AI_API_KEY" ]; then echo "Yes"; else echo "No"; fi)"
```

Verify:
- AI service is reachable
- Image processing requests succeed
- Responses contain expected format

## Phase 8: Error Handling and Edge Cases

### Test Error States:
1. **Invalid Credentials** - Try login with wrong password
2. **Expired Session** - Wait for session expiry and try to access protected page
3. **Upload Limit Exceeded** - Upload beyond monthly quota (if limits configured)
4. **Processing Failure** - Test with corrupted RAW file
5. **Export Failure** - Test with invalid project ID
6. **API Rate Limiting** - Make rapid requests to test rate limits
7. **Missing Environment Variables** - Test behavior with missing env vars

## Phase 9: Security Validation

### Security Checks:
```bash
# Check for exposed environment variables
grep -r "process.env" src/ | grep -E "(PASSWORD|SECRET|KEY)" | grep -v ".env.example"

# Check for sensitive data in logs
grep -r "console.log" src/ | grep -E "(password|token|secret)"

# Verify authentication is applied to protected routes
grep -r "auth()" src/app/api | grep -v "GET /api/auth"
```

### Security Tests:
1. Try accessing protected endpoints without authentication
2. Test SQL injection attempts
3. Test XSS vulnerabilities in user inputs
4. Verify CORS headers are properly configured
5. Check for sensitive data in error messages

## Phase 10: Performance Validation

### Performance Checks:
```bash
# Measure build time
time bun build

# Check bundle size
du -sh .next/

# Database query performance (if possible)
bunx drizzle-kit studio
```

### Performance Tests:
1. Upload large file (>50MB) and measure time
2. Process image and measure latency
3. Load dashboard with many projects
4. Test concurrent processing jobs
5. Measure API response times

## Validation Summary

After completing all phases, verify:
- [ ] All linting passes without errors
- [ ] TypeScript compilation succeeds
- [ ] Application builds successfully
- [ ] All unit tests pass
- [ ] Database schema is valid
- [ ] E2E tests pass (if configured)
- [ ] All user workflows work end-to-end
- [ ] External integrations function correctly
- [ ] Error handling works as expected
- [ ] Security checks pass
- [ ] Performance meets requirements

## Quick Validation Command

For a quick validation (phases 1-4 only), run:

```bash
bun lint && bunx tsc --noEmit && bun test
```

## Full Validation Command

For complete validation (all phases), run each phase sequentially or:

```bash
echo "Running full validation..."
bun lint || exit 1
bunx tsc --noEmit || exit 1
bun build || exit 1
bun test || exit 1
bunx drizzle-kit generate || exit 1
# bun test:e2e  # Requires full environment setup
# bun run r2:verify  # Requires R2 credentials
echo "✅ Validation complete!"
```

## Environment Setup for Full Validation

To run the full validation with E2E tests, ensure these environment variables are set:

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Storage (R2 or S3)
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=...

# Redis
REDIS_URL=redis://...

# Stripe (optional for core validation)
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# AI Service (required for processing tests)
AI_API_URL=...
AI_API_KEY=...

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
```
