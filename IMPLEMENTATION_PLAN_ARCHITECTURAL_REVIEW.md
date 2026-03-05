# Luminary Lab Implementation Plan
## Architectural Review Remediation Roadmap

**Version:** 1.0  
**Date:** March 2025  
**Status:** Draft for Review  

---

## Executive Summary

This implementation plan addresses the 25 critical findings from the comprehensive architectural review. The roadmap is organized into 4 phases over 12 weeks, prioritizing security fixes, architectural modernization, feature completeness, and scalability.

**Total Estimated Effort:** 480 hours (12 weeks @ 40 hrs/week)  
**Team Size:** 2-3 engineers  
**Risk Level:** Medium (mitigated by phased approach)

---

## Phase 1: Critical Security & Stability (Weeks 1-2)
**Goal:** Eliminate security vulnerabilities and establish production-ready foundation  
**Effort:** 80 hours

### 1.1 Security Hardening

#### Task 1.1.1: Remove Development Auth Bypass
- **Priority:** P0 (Critical)
- **Effort:** 2 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/auth.ts`
- **Description:** Remove hardcoded dev bypass that could expose production to unauthorized access
- **Steps:**
  1. Remove `DEV_BYPASS_ENABLED` constant and `DEV_BYPASS_USER` object
  2. Remove proxy wrapper that intercepts `getSession`
  3. Export clean Better Auth instance
  4. Update `.env.example` to remove bypass-related variables
  5. Add production check script to CI/CD
- **Validation:**
  - [ ] Auth bypass cannot be enabled via environment variables
  - [ ] All auth flows require valid credentials
  - [ ] Unit tests verify auth rejection for invalid tokens
- **Rollback:** Git revert if auth system breaks

#### Task 1.1.2: Implement Security Headers
- **Priority:** P0
- **Effort:** 4 hours
- **Owner:** Full-Stack Engineer
- **Files:** `next.config.js`, `src/middleware.ts` (new)
- **Description:** Add OWASP-recommended security headers
- **Implementation:**
```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ];
}
```
- **Validation:**
  - [ ] Security headers present on all routes (test with `curl -I`)
  - [ ] Site passes Mozilla Observatory scan (minimum B grade)
  - [ ] No console errors from CSP (if implemented)

#### Task 1.1.3: Add API Rate Limiting (Redis-Based)
- **Priority:** P0
- **Effort:** 8 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/rate-limit.ts`, `src/middleware.ts`
- **Description:** Replace in-memory rate limiting with Redis-based distributed limiting
- **Technical Spec:**
  - Auth endpoints: 5 requests/minute
  - Upload endpoints: 10 requests/minute, 100MB/minute
  - General API: 100 requests/minute per user
  - Use sliding window algorithm
- **Dependencies:** Existing Redis connection
- **Implementation:**
```typescript
// New: src/lib/redis-rate-limit.ts
import { Redis } from 'ioredis';

export class RedisRateLimiter {
  constructor(private redis: Redis) {}
  
  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const multi = this.redis.multi();
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    
    multi.zremrangebyscore(key, 0, windowStart);
    multi.zadd(key, now, `${now}-${Math.random()}`);
    multi.zcard(key);
    multi.pexpire(key, windowSeconds * 1000);
    
    const results = await multi.exec();
    const current = results?.[2]?.[1] as number || 0;
    
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt: now + (windowSeconds * 1000),
    };
  }
}
```
- **Validation:**
  - [ ] Rate limits enforced across multiple server instances
  - [ ] 429 responses returned when limits exceeded
  - [ ] Redis keys expire correctly (TTL verified)

### 1.2 Production Stability

#### Task 1.2.1: Health Check Endpoint
- **Priority:** P1
- **Effort:** 4 hours
- **Owner:** Backend Engineer
- **Files:** `src/app/api/health/route.ts` (new)
- **Description:** Implement comprehensive health checks for container orchestration
- **Implementation:**
```typescript
interface HealthCheck {
  name: string;
  healthy: boolean;
  latency: number;
  error?: string;
}

export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkS3(),
    checkQueue(),
  ]);
  
  const allHealthy = checks.every(c => c.healthy);
  
  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION,
      checks: checks.reduce((acc, check) => ({
        ...acc,
        [check.name]: {
          healthy: check.healthy,
          latency: `${check.latency}ms`,
          ...(check.error && { error: check.error }),
        },
      }), {}),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
```
- **Validation:**
  - [ ] Endpoint returns 200 when all services healthy
  - [ ] Endpoint returns 503 when any service unhealthy
  - [ ] Latency metrics included for each service
  - [ ] Kubernetes/Docker health checks configured

#### Task 1.2.2: Input Validation Standardization
- **Priority:** P1
- **Effort:** 12 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/validation.ts`, All API routes
- **Description:** Standardize Zod validation across all API endpoints
- **Implementation:**
```typescript
// src/lib/api-validation.ts
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  handler: (data: T, req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json();
      const validated = schema.parse(body);
      return handler(validated, req);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: error.errors },
          { status: 400 }
        );
      }
      throw error;
    }
  };
}

// Usage in routes
const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export const POST = validateRequest(createProjectSchema, async (data, req) => {
  // Handler implementation
});
```
- **Affected Endpoints:**
  - [ ] `POST /api/projects`
  - [ ] `POST /api/process`
  - [ ] `POST /api/upload/*`
  - [ ] `POST /api/checkout/*`
  - [ ] `POST /api/stripe/webhook` (signature validation)
- **Validation:**
  - [ ] All endpoints reject invalid input with 400 status
  - [ ] Error messages are user-friendly
  - [ ] No sensitive data leaked in error messages

### 1.3 Database Schema Updates

#### Task 1.3.1: Non-Destructive Edit Schema
- **Priority:** P1
- **Effort:** 16 hours
- **Owner:** Backend Engineer
- **Files:** `src/db/schema.ts`, migrations
- **Description:** Add tables to support non-destructive editing and version history
- **Schema Additions:**
```typescript
// Edit versions table
export const imageEdits = pgTable("image_edits", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  imageId: uuid("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  styleId: uuid("style_id").references(() => systemStyles.id),
  intensity: decimal("intensity", { precision: 5, scale: 2 }).default("0.70"),
  adjustments: jsonb("adjustments").$type<{
    exposure?: number;
    contrast?: number;
    highlights?: number;
    shadows?: number;
    whites?: number;
    blacks?: number;
    clarity?: number;
    vibrance?: number;
    saturation?: number;
    temperature?: number;
    tint?: number;
  }>(),
  isCurrent: boolean("is_current").default(false).notNull(),
  processedImageId: uuid("processed_image_id").references(() => images.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").notNull().references(() => users.id),
});

// Edit history/undo stack
export const editHistory = pgTable("edit_history", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  imageId: uuid("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // 'apply_style', 'adjust', 'reset', 'undo', 'redo'
  previousEditId: uuid("previous_edit_id").references(() => imageEdits.id),
  newEditId: uuid("new_edit_id").references(() => imageEdits.id),
  undone: boolean("undone").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
- **Migrations:**
  - Generate Drizzle migration
  - Backfill existing processed images as version 1
  - Create indexes on `imageEdits.imageId`, `editHistory.imageId`
- **Validation:**
  - [ ] Migrations run successfully on staging
  - [ ] Existing data preserved
  - [ ] New tables have proper foreign key constraints

#### Task 1.3.2: Database Index Optimization
- **Priority:** P2
- **Effort:** 6 hours
- **Owner:** Backend Engineer
- **Files:** `src/db/schema.ts`, migrations
- **Description:** Add indexes for common query patterns
- **Indexes to Add:**
```typescript
// In schema.ts
export const projects = pgTable("projects", {
  // ... existing fields
}, (table) => ({
  userIdIdx: index("projects_user_id_idx").on(table.userId),
  statusIdx: index("projects_status_idx").on(table.status),
  createdAtIdx: index("projects_created_at_idx").on(table.createdAt),
}));

export const images = pgTable("images", {
  // ... existing fields
}, (table) => ({
  projectIdTypeIdx: index("images_project_id_type_idx").on(table.projectId, table.type),
  storageKeyIdx: index("images_storage_key_idx").on(table.storageKey),
}));

export const processingJobs = pgTable("processing_jobs", {
  // ... existing fields
}, (table) => ({
  projectIdIdx: index("jobs_project_id_idx").on(table.projectId),
  userIdStatusIdx: index("jobs_user_id_status_idx").on(table.userId, table.status),
  statusCreatedIdx: index("jobs_status_created_idx").on(table.status, table.createdAt),
}));
```
- **Validation:**
  - [ ] Query performance improved (measure with EXPLAIN ANALYZE)
  - [ ] No significant impact on write performance

### Phase 1 Success Criteria
- [ ] Security scan passes (Mozilla Observatory B+ or higher)
- [ ] Health endpoint responds < 500ms
- [ ] All API endpoints validate input
- [ ] Database migrations applied successfully
- [ ] No P0 or P1 security vulnerabilities remain

---

## Phase 2: Core Architecture Modernization (Weeks 3-5)
**Goal:** Upgrade infrastructure components for scalability and performance  
**Effort:** 120 hours

### 2.1 Queue Architecture Migration

#### Task 2.1.1: Migrate Bull to BullMQ
- **Priority:** P0
- **Effort:** 24 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/queue.ts`, `src/lib/job-processor.ts`
- **Description:** Replace legacy Bull with modern BullMQ for better TypeScript support and features
- **Migration Steps:**
  1. Install BullMQ: `bun add bullmq`
  2. Create new queue implementation with BullMQ
  3. Migrate job processors to Workers
  4. Update job type definitions
  5. Add flow support for dependent jobs
  6. Run parallel systems during transition
  7. Monitor for errors
  8. Remove Bull dependency
- **Implementation:**
```typescript
// src/lib/queue-v2.ts
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const imageQueue = new Queue('image-processing', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100, age: 24 * 3600 },
    removeOnFail: { count: 500, age: 7 * 24 * 3600 },
  },
});

// Separate worker process
export const imageWorker = new Worker('image-processing', async (job) => {
  await processImageJob(job);
}, {
  connection: redis,
  concurrency: 4,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

// Event handlers
imageWorker.on('completed', async (job) => {
  await handleJobCompletion(job);
});

imageWorker.on('failed', async (job, err) => {
  await handleJobFailure(job, err);
});
```
- **Validation:**
  - [ ] Jobs process successfully under load
  - [ ] Failed jobs retry correctly
  - [ ] Queue metrics available via BullMQ Dashboard
  - [ ] No job loss during migration

#### Task 2.1.2: Implement Job Dependencies
- **Priority:** P1
- **Effort:** 8 hours
- **Owner:** Backend Engineer
- **Description:** Support multi-stage processing pipelines using BullMQ Flows
- **Use Case:** Upload → Generate thumbnail → Process with AI → Generate variants
- **Implementation:**
```typescript
import { FlowProducer } from 'bullmq';

const flowProducer = new FlowProducer({ connection: redis });

export async function createImageProcessingFlow(
  projectId: string,
  styleId: string,
  intensity: number
) {
  return await flowProducer.add({
    name: 'process-image',
    queueName: 'image-processing',
    data: { projectId, styleId, intensity, stage: 'main' },
    children: [
      {
        name: 'generate-thumbnail',
        queueName: 'image-processing',
        data: { projectId, stage: 'thumbnail' },
        opts: { priority: 1 },
      },
      {
        name: 'generate-preview',
        queueName: 'image-processing',
        data: { projectId, stage: 'preview' },
        opts: { priority: 2 },
      },
    ],
  });
}
```

### 2.2 WebSocket Scaling

#### Task 2.2.1: Add Redis Adapter for Socket.IO
- **Priority:** P1
- **Effort:** 6 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/websocket-server.ts`
- **Description:** Enable horizontal scaling of WebSocket servers
- **Implementation:**
```typescript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

const pubClient = new Redis(process.env.REDIS_URL!);
const subClient = pubClient.duplicate();

const io = new Server(httpServer, {
  cors: { /* existing config */ },
});

io.adapter(createAdapter(pubClient, subClient));
```
- **Validation:**
  - [ ] Multiple Socket.IO instances share state via Redis
  - [ ] Clients connected to different servers receive broadcasts
  - [ ] Room membership synced across instances

#### Task 2.2.2: Implement WebSocket Connection Recovery
- **Priority:** P2
- **Effort:** 8 hours
- **Owner:** Full-Stack Engineer
- **Description:** Add client-side reconnection with state recovery
- **Implementation:**
```typescript
// Client-side
const socket = io({
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
});

// On reconnect, request missed updates
socket.on('connect', () => {
  const lastEventId = localStorage.getItem('lastEventId');
  socket.emit('recover-state', { lastEventId });
});
```

### 2.3 Image Processing Pipeline

#### Task 2.3.1: Implement Multi-Format Export
- **Priority:** P1
- **Effort:** 16 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/ai-service.ts`, `src/lib/hybrid-export.ts`
- **Description:** Support JPEG, PNG, TIFF export formats with quality settings
- **Implementation:**
```typescript
export interface ExportOptions {
  format: 'jpeg' | 'png' | 'tiff' | 'webp';
  quality: number; // 1-100
  colorSpace: 'sRGB' | 'AdobeRGB' | 'ProPhotoRGB';
  resize?: {
    width?: number;
    height?: number;
    fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  watermark?: {
    text: string;
    position: 'center' | 'bottom-right' | 'bottom-left';
    opacity: number;
  };
}

export async function exportImage(
  imageBuffer: Buffer,
  options: ExportOptions
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer);
  
  // Resize if specified
  if (options.resize) {
    pipeline = pipeline.resize({
      width: options.resize.width,
      height: options.resize.height,
      fit: options.resize.fit,
    });
  }
  
  // Apply format-specific settings
  switch (options.format) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ 
        quality: options.quality,
        progressive: true,
        mozjpeg: true,
      });
      break;
    case 'png':
      pipeline = pipeline.png({ 
        quality: options.quality,
        compressionLevel: 9,
      });
      break;
    case 'tiff':
      pipeline = pipeline.tiff({
        quality: options.quality,
        compression: 'lzw',
      });
      break;
    // ... other formats
  }
  
  return pipeline.toBuffer();
}
```

#### Task 2.3.2: Add Image Processing Queue Workers
- **Priority:** P1
- **Effort:** 20 hours
- **Owner:** Backend Engineer
- **Files:** `src/workers/image-processor.ts` (new)
- **Description:** Separate worker process for image processing to scale independently
- **Implementation:**
```typescript
// src/workers/image-processor.ts
import { Worker } from 'bullmq';
import { processWithAI } from '@/lib/ai-service';
import { uploadFile } from '@/lib/s3';

const worker = new Worker('image-processing', async (job) => {
  const { projectId, styleId, intensity, originalImageKey } = job.data;
  
  // Update progress
  await job.updateProgress(10);
  
  // Download original image from S3
  const originalBuffer = await downloadFromS3(originalImageKey);
  await job.updateProgress(30);
  
  // Process with AI
  const processedBuffer = await processWithAI(originalBuffer, style, intensity);
  await job.updateProgress(70);
  
  // Upload processed image
  const processedKey = generateFileKey(userId, projectId, 'processed');
  await uploadFile(processedKey, processedBuffer, 'image/jpeg');
  await job.updateProgress(90);
  
  // Update database
  await saveProcessedImage(projectId, processedKey);
  await job.updateProgress(100);
  
  return { processedKey, projectId };
}, {
  connection: redis,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2'),
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
```
- **Deployment:** Run as separate container/pod from web server

### 2.4 API Architecture Improvements

#### Task 2.4.1: Implement API Versioning
- **Priority:** P2
- **Effort:** 12 hours
- **Owner:** Backend Engineer
- **Description:** Add versioning to API routes for backward compatibility
- **Implementation:**
```typescript
// src/app/api/v1/projects/route.ts (current)
// src/app/api/v2/projects/route.ts (new features)

// Middleware for version routing
// src/middleware.ts
export function middleware(req: NextRequest) {
  const version = req.headers.get('x-api-version') || 'v1';
  
  if (req.nextUrl.pathname.startsWith('/api/') && 
      !req.nextUrl.pathname.includes('/v')) {
    const url = req.nextUrl.clone();
    url.pathname = url.pathname.replace('/api/', `/api/${version}/`);
    return NextResponse.rewrite(url);
  }
}
```

#### Task 2.4.2: Add API Documentation (OpenAPI)
- **Priority:** P2
- **Effort:** 16 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/openapi.ts`, `src/app/api/docs/route.ts`
- **Description:** Generate OpenAPI spec from Zod schemas
- **Implementation:**
```typescript
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

const registry = new OpenAPIRegistry();

// Register schemas
registry.register('Project', ProjectSchema);
registry.register('Image', ImageSchema);

// Register paths
registry.registerPath({
  method: 'get',
  path: '/api/projects',
  description: 'List user projects',
  request: { query: ListProjectsQuerySchema },
  responses: {
    200: { description: 'Success', content: { 'application/json': { schema: ProjectsResponseSchema } } },
    401: { description: 'Unauthorized' },
  },
});

// Generate spec
export const openApiSpec = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: '3.0.0',
  info: { title: 'Luminary Lab API', version: '1.0.0' },
});
```

### Phase 2 Success Criteria
- [ ] BullMQ processing 100+ jobs/minute without errors
- [ ] WebSocket connections scale across 3+ server instances
- [ ] Export supports JPEG, PNG, TIFF formats
- [ ] Worker processes run independently and autoscale
- [ ] API versioning functional with backward compatibility

---

## Phase 3: Feature Completeness (Weeks 6-9)
**Goal:** Achieve feature parity with professional photo editing tools  
**Effort:** 160 hours

### 3.1 Non-Destructive Editing System

#### Task 3.1.1: Implement Edit Version Management
- **Priority:** P0
- **Effort:** 32 hours
- **Owner:** Full-Stack Engineer
- **Files:** `src/lib/edit-manager.ts` (new), `src/db/schema.ts`
- **Description:** Full non-destructive editing with version history
- **Implementation:**
```typescript
// src/lib/edit-manager.ts
export class EditManager {
  async createEdit(
    imageId: string,
    adjustments: ImageAdjustments,
    userId: string
  ): Promise<ImageEdit> {
    const version = await this.getNextVersion(imageId);
    
    // Mark previous edit as not current
    await db.update(imageEdits)
      .set({ isCurrent: false })
      .where(eq(imageEdits.imageId, imageId));
    
    // Create new edit
    const [edit] = await db.insert(imageEdits)
      .values({
        id: uuidv7(),
        imageId,
        version,
        adjustments,
        isCurrent: true,
        createdBy: userId,
      })
      .returning();
    
    // Queue processing job
    await imageQueue.add('apply-edit', { editId: edit.id });
    
    return edit;
  }
  
  async undo(imageId: string): Promise<ImageEdit | null> {
    const current = await this.getCurrentEdit(imageId);
    if (!current) return null;
    
    const previous = await db.query.imageEdits.findFirst({
      where: and(
        eq(imageEdits.imageId, imageId),
        eq(imageEdits.version, current.version - 1)
      ),
    });
    
    if (!previous) return null;
    
    await db.transaction(async (trx) => {
      await trx.update(imageEdits)
        .set({ isCurrent: false })
        .where(eq(imageEdits.id, current.id));
      
      await trx.update(imageEdits)
        .set({ isCurrent: true })
        .where(eq(imageEdits.id, previous.id));
      
      await trx.insert(editHistory).values({
        id: uuidv7(),
        imageId,
        action: 'undo',
        previousEditId: current.id,
        newEditId: previous.id,
      });
    });
    
    return previous;
  }
  
  async redo(imageId: string): Promise<ImageEdit | null> {
    // Similar to undo but forward in history
  }
}
```

#### Task 3.1.2: Build Adjustment Controls UI
- **Priority:** P0
- **Effort:** 40 hours
- **Owner:** Frontend Engineer
- **Files:** `src/components/editor/adjustment-panel.tsx` (new)
- **Description:** Professional-grade adjustment sliders with real-time preview
- **Components:**
  - [ ] Exposure slider (-5 to +5 stops)
  - [ ] Contrast slider (-100 to +100)
  - [ ] Highlights/Shadows recovery
  - [ ] Whites/Blacks point adjustment
  - [ ] Clarity/Texture/Dehaze
  - [ ] Saturation/Vibrance
  - [ ] Temperature/Tint (white balance)
- **Technical Spec:**
```typescript
interface AdjustmentSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  onChange: (value: number) => void;
  onReset: () => void;
}

// Real-time preview using WebGL or Canvas
// Debounced updates (300ms) to prevent excessive processing
```

### 3.2 Histogram & Scopes

#### Task 3.2.1: Implement Histogram Component
- **Priority:** P1
- **Effort:** 24 hours
- **Owner:** Frontend Engineer
- **Files:** `src/components/editor/histogram.tsx` (new)
- **Description:** Real-time histogram display with RGB channels
- **Implementation:**
```typescript
// src/components/editor/histogram.tsx
'use client';

import { useMemo } from 'react';
import { useImageAnalysis } from '@/hooks/use-image-analysis';

interface HistogramProps {
  imageData: ImageData | null;
  channel: 'rgb' | 'red' | 'green' | 'blue' | 'luminance';
  height?: number;
  width?: number;
}

export function Histogram({ imageData, channel, height = 150, width = 300 }: HistogramProps) {
  const histogramData = useMemo(() => {
    if (!imageData) return null;
    
    const data = new Uint32Array(256).fill(0);
    const pixels = imageData.data;
    
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      
      switch (channel) {
        case 'red': data[r]++; break;
        case 'green': data[g]++; break;
        case 'blue': data[b]++; break;
        case 'luminance':
          const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          data[lum]++;
          break;
        case 'rgb':
          data[r]++;
          data[g]++;
          data[b]++;
          break;
      }
    }
    
    return data;
  }, [imageData, channel]);
  
  // Render SVG histogram
  return (
    <svg viewBox={`0 0 256 ${height}`} className="w-full">
      {/* Histogram paths */}
    </svg>
  );
}
```

### 3.3 History Panel

#### Task 3.3.1: Build Edit History UI
- **Priority:** P1
- **Effort:** 20 hours
- **Owner:** Frontend Engineer
- **Files:** `src/components/editor/history-panel.tsx` (new)
- **Description:** Visual history timeline with undo/redo navigation
- **Features:**
  - [ ] List of all edits with timestamps
  - [ ] Click to jump to specific version
  - [ ] Visual diff between versions
  - [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  - [ ] Clear history option

### 3.4 Batch Processing

#### Task 3.4.1: Enhance Batch Processing
- **Priority:** P1
- **Effort:** 24 hours
- **Owner:** Full-Stack Engineer
- **Files:** `src/app/batches/page.tsx`, `src/lib/batch-service.ts`
- **Description:** Professional batch processing with sync adjustments
- **Features:**
  - [ ] Apply same style to multiple images
  - [ ] Sync adjustments across batch
  - [ ] Individual image override capability
  - [ ] Batch export with naming patterns
  - [ ] Progress tracking per image

### 3.5 Export Enhancements

#### Task 3.5.1: Advanced Export Options
- **Priority:** P2
- **Effort:** 20 hours
- **Owner:** Full-Stack Engineer
- **Files:** `src/app/export/[projectId]/page.tsx`
- **Description:** Professional export workflow
- **Features:**
  - [ ] Export presets (Web, Print, Social)
  - [ ] Custom watermarking
  - [ ] Metadata preservation
  - [ ] Filename templates ({date}_{original}_{style})
  - [ ] Zip download for multiple images

### Phase 3 Success Criteria
- [ ] Non-destructive editing with 10+ adjustment types
- [ ] Full undo/redo history (min 50 steps)
- [ ] Real-time histogram with RGB channels
- [ ] Batch processing with 50+ images
- [ ] Export in 4+ formats with custom settings

---

## Phase 4: Observability & Scale (Weeks 10-12)
**Goal:** Production monitoring, alerting, and auto-scaling  
**Effort:** 120 hours

### 4.1 Structured Logging & Monitoring

#### Task 4.1.1: Implement Structured Logging
- **Priority:** P1
- **Effort:** 16 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/logger.ts`, `src/lib/middleware/logging.ts`
- **Description:** Replace console logs with structured logging
- **Implementation:**
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' }
    : undefined,
  base: {
    service: 'luminary-lab-api',
    version: process.env.APP_VERSION,
  },
});

// Request logging middleware
export function withLogging(handler: ApiHandler) {
  return async (req: NextRequest) => {
    const requestId = req.headers.get('x-request-id') || uuidv7();
    const start = Date.now();
    
    const childLogger = logger.child({
      requestId,
      method: req.method,
      path: req.nextUrl.pathname,
      userAgent: req.headers.get('user-agent'),
    });
    
    childLogger.info('Request started');
    
    try {
      const response = await handler(req);
      childLogger.info({
        statusCode: response.status,
        duration: Date.now() - start,
      }, 'Request completed');
      return response;
    } catch (error) {
      childLogger.error({ error, duration: Date.now() - start }, 'Request failed');
      throw error;
    }
  };
}
```

#### Task 4.1.2: Add Performance Metrics
- **Priority:** P1
- **Effort:** 12 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/metrics.ts`
- **Description:** Track key performance indicators
- **Metrics to Track:**
  - API request latency (p50, p95, p99)
  - Queue job processing time
  - Image processing duration
  - Database query performance
  - S3 upload/download times
  - Error rates by endpoint
- **Implementation:**
```typescript
import { Histogram, Counter, register } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const imageProcessingDuration = new Histogram({
  name: 'image_processing_duration_seconds',
  help: 'Time spent processing images',
  labelNames: ['style', 'status'],
  buckets: [1, 5, 10, 30, 60, 120],
});

// Metrics endpoint for Prometheus
export async function GET() {
  return new Response(await register.metrics(), {
    headers: { 'Content-Type': register.contentType },
  });
}
```

### 4.2 Error Tracking & Alerting

#### Task 4.2.1: Enhance Sentry Integration
- **Priority:** P1
- **Effort:** 8 hours
- **Owner:** Full-Stack Engineer
- **Files:** `src/lib/sentry.ts`
- **Description:** Comprehensive error tracking with context
- **Implementation:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  integrations: [
    Sentry.httpIntegration(),
  ],
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});

// Capture processing errors with context
export function captureProcessingError(error: Error, context: ProcessingContext) {
  Sentry.captureException(error, {
    tags: {
      component: 'image-processing',
      styleId: context.styleId,
    },
    extra: {
      projectId: context.projectId,
      imageSize: context.imageSize,
      processingTime: context.duration,
    },
  });
}
```

### 4.3 Database Optimization

#### Task 4.3.1: Implement Query Optimization
- **Priority:** P2
- **Effort:** 16 hours
- **Owner:** Backend Engineer
- **Description:** Optimize slow queries identified in production
- **Actions:**
  1. Set up query performance logging
  2. Identify slow queries (> 100ms)
  3. Add missing indexes
  4. Optimize N+1 queries
  5. Implement connection pooling
- **Validation:**
  - [ ] No queries exceed 100ms p95
  - [ ] Database CPU < 50% at normal load

### 4.4 CDN & Caching

#### Task 4.4.1: Implement Multi-Tier Caching
- **Priority:** P2
- **Effort:** 20 hours
- **Owner:** Backend Engineer
- **Files:** `src/lib/cache.ts`, `src/lib/cached-queries.ts`
- **Description:** Add Redis caching layer for frequently accessed data
- **Implementation:**
```typescript
import { Redis } from 'ioredis';

const cache = new Redis(process.env.REDIS_URL!);

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await cache.get(key);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await fetcher();
  await cache.setex(key, ttl, JSON.stringify(data));
  return data;
}

// Cache invalidation helpers
export async function invalidateProjectCache(projectId: string) {
  await cache.del(`project:${projectId}`);
  await cache.del(`project:${projectId}:images`);
}
```
- **Cached Data:**
  - User projects list (5 min TTL)
  - Project details (1 min TTL)
  - System styles (1 hour TTL)
  - User preferences (15 min TTL)
  - Processed image URLs (1 hour TTL)

### 4.5 Auto-Scaling Configuration

#### Task 4.5.1: Kubernetes HPA Configuration
- **Priority:** P2
- **Effort:** 12 hours
- **Owner:** DevOps Engineer
- **Files:** `k8s/hpa.yaml` (new)
- **Description:** Configure horizontal pod autoscaling
- **Configuration:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: luminary-lab-web
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: luminary-lab-web
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

#### Task 4.5.2: Worker Auto-Scaling
- **Priority:** P2
- **Effort:** 8 hours
- **Owner:** DevOps Engineer
- **Description:** Scale workers based on queue depth
- **Configuration:**
```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: image-processor-worker
spec:
  scaleTargetRef:
    name: image-processor
  triggers:
    - type: redis
      metadata:
        address: redis:6379
        listName: bull:image-processing:wait
        listLength: "10"
  minReplicaCount: 1
  maxReplicaCount: 20
```

### 4.6 Disaster Recovery

#### Task 4.6.1: Backup Strategy
- **Priority:** P1
- **Effort:** 8 hours
- **Owner:** DevOps Engineer
- **Description:** Automated backups for database and user assets
- **Plan:**
  - Database: Daily automated backups (Neon)
  - S3/R2: Cross-region replication
  - Point-in-time recovery: 7 days
  - Disaster recovery runbook
- **Validation:**
  - [ ] Monthly DR drill completed
  - [ ] RTO < 4 hours, RPO < 1 hour

### Phase 4 Success Criteria
- [ ] 99.9% uptime SLA maintained
- [ ] All errors tracked in Sentry with context
- [ ] API p95 latency < 200ms
- [ ] Auto-scaling handles 10x traffic spikes
- [ ] Data backup and recovery tested

---

## Resource Allocation

### Team Requirements

| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total |
|------|---------|---------|---------|---------|-------|
| Backend Engineer | 60h | 80h | 40h | 60h | 240h |
| Frontend Engineer | 10h | 20h | 100h | 20h | 150h |
| Full-Stack Engineer | 10h | 20h | 20h | 20h | 70h |
| DevOps Engineer | 0h | 0h | 0h | 20h | 20h |
| **Total** | **80h** | **120h** | **160h** | **120h** | **480h** |

### Infrastructure Costs (Estimated Monthly)

| Service | Current | After Phase 4 | Notes |
|---------|---------|---------------|-------|
| Vercel Pro | $20 | $40 | More bandwidth/functions |
| Neon Postgres | $19 | $69 | More compute + storage |
| Redis (Upstash) | $0 | $30 | Dedicated instance |
| S3/R2 Storage | $20 | $100 | User growth |
| Sentry | $0 | $26 | Error tracking |
| **Total** | **~$59** | **~$265** | Scaled for production |

---

## Risk Management

### High-Risk Items

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| BullMQ migration failures | High | Medium | Run parallel systems, gradual cutover |
| Database migration errors | Critical | Low | Test on staging, backup before deploy |
| Non-destructive edit bugs | High | Medium | Feature flags, gradual rollout |
| Performance regression | Medium | Medium | Load testing before release |
| Security vulnerabilities | Critical | Low | Security audit after Phase 1 |

### Contingency Plans

1. **Database Issues:** Automated backups, point-in-time recovery
2. **Queue Failures:** Fallback to synchronous processing for small images
3. **Performance Problems:** Feature flags to disable non-critical features
4. **Security Breach:** Incident response plan, audit logs

---

## Success Metrics

### Technical Metrics

| Metric | Baseline | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|----------|---------|---------|---------|---------|
| Security Score (Mozilla) | F | B+ | A | A | A+ |
| API p95 Latency | 800ms | 500ms | 300ms | 300ms | 200ms |
| Image Processing Time | 60s | 60s | 45s | 45s | 30s |
| Error Rate | 5% | 2% | 1% | 0.5% | 0.1% |
| Test Coverage | 10% | 15% | 30% | 50% | 60% |
| Uptime | N/A | 99.5% | 99.9% | 99.9% | 99.99% |

### Business Metrics

| Metric | Target |
|--------|--------|
| User Retention (30-day) | > 40% |
| Average Session Duration | > 10 min |
| Images Processed/Day | > 10,000 |
| Export Success Rate | > 99.5% |
| Customer Satisfaction | > 4.5/5 |

---

## Timeline Summary

```
Week 1-2:  [====CRITICAL SECURITY====]
Week 3-5:  [=====ARCHITECTURE MODERNIZATION=====]
Week 6-9:  [========FEATURE COMPLETENESS========]
Week 10-12:[=======OBSERVABILITY & SCALE=======]

Milestones:
  M1: Security Hardened (Week 2)
  M2: Scalable Infrastructure (Week 5)
  M3: Professional Editor (Week 9)
  M4: Production Ready (Week 12)
```

---

## Appendix

### A. Dependency Graph

```
Phase 1 Tasks:
  1.1.1 (Remove bypass) → 1.1.2 (Headers)
  1.1.3 (Rate limit) → 1.2.1 (Health)
  1.3.1 (Schema) → 2.1.1 (BullMQ) → 3.1.1 (Edit system)

Phase 2 Tasks:
  2.1.1 (BullMQ) → 2.3.2 (Workers)
  2.2.1 (Redis adapter) → 3.x (Real-time features)

Phase 3 Tasks:
  3.1.1 (Edit manager) → 3.1.2 (Adjustment UI) → 3.2.1 (Histogram)
```

### B. Testing Strategy

- **Unit Tests:** Vitest for all utilities and hooks
- **Integration Tests:** API route testing with test database
- **E2E Tests:** Playwright for critical user flows
- **Load Tests:** k6 for queue and API stress testing
- **Security Tests:** OWASP ZAP for vulnerability scanning

### C. Documentation Requirements

- API documentation (OpenAPI)
- Architecture decision records (ADRs)
- Deployment runbooks
- Incident response procedures
- User documentation for new features

---

**End of Implementation Plan**
