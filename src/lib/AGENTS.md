# Library Directory - Core Services & Utilities

## Package Identity
- **Purpose**: Core services, utilities, and integrations
- **Technology**: TypeScript, Node.js, various APIs

## Setup & Run
Libraries are imported directly, no separate setup:
```typescript
import { db } from '@/db';
import { stripe } from '@/lib/stripe';
import { generateUploadUrl } from '@/lib/s3';
```

## Patterns & Conventions

### Service Organization
```
src/lib/
├── auth.ts           # Better Auth configuration
├── s3.ts            # AWS S3 integration
├── stripe.ts         # Stripe payments
├── queue.ts         # Background job queue
├── ai-service.ts    # AI processing service
├── job-processor.ts # Background job handler
└── utils.ts         # Utility functions
```

### Service Pattern
```typescript
// ✅ DO: Export singleton instances
import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

// ✅ DO: Environment variables with defaults
export const AWS_CONFIG = {
  bucket: process.env.AWS_S3_BUCKET!,
  region: process.env.AWS_REGION || 'us-east-1',
};

// ❌ DON'T: Create new instances on every import
// Bad: new Stripe() on each use

// ✅ DO: Error handling utilities
export function createApiError(message: string, code: string) {
  const error = new Error(message) as any;
  error.code = code;
  return error;
}
```

### S3 Integration
```typescript
// ✅ DO: Pre-signed URLs for security
export async function generateUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: AWS_CONFIG.bucket,
    Key: key,
    ContentType: contentType,
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// ✅ DO: Key generation helpers
export function generateFileKey(userId: string, projectId: string, filename: string, type: string) {
  return `${userId}/${projectId}/${type}/${Date.now()}-${filename}`;
}
```

### Queue Setup
```typescript
// ✅ DO: Proper job typing
export interface ImageProcessingJob {
  id: string;
  projectId: string;
  styleId: string;
  intensity: number;
  originalImageKey: string;
  userId: string;
}

// ✅ DO: Job processor error handling
export async function processImageJob(job: Job<ImageProcessingJob>) {
  try {
    // Processing logic
  } catch (error) {
    console.error('Processing failed:', error);
    throw error;
  }
}
```

## Touch Points / Key Files
```
- Database: src/lib/auth.ts (Better Auth config)
- Payments: src/lib/stripe.ts (Stripe client)
- Storage: src/lib/s3.ts (S3 utilities)
- Queue: src/lib/queue.ts (Bull queue setup)
- AI Service: src/lib/ai-service.ts (mock AI API)
- Job Processing: src/lib/job-processor.ts (background jobs)
- Utilities: src/lib/utils.ts (helper functions)
```

## JIT Index Hints
```bash
# Find service exports
rg -n "export" src/lib

# Find S3 usage
rg -n "generateUploadUrl|generateFileKey" src/lib

# Find API calls
rg -n "fetch.*api|stripe\." src/lib

# Find job queue usage
rg -n "queue\.add|processJob" src/lib
```

## Common Gotchas
- **Environment variables** must be prefixed with `NEXT_PUBLIC_` for client-side
- **S3 pre-signed URLs** have expiration times (default 1 hour)
- **Queue jobs** need Redis connection for persistence
- **Stripe webhooks** require signature verification
- **AI service** needs proper error handling and retries
- **Better Auth** requires secret configuration

## Pre-PR Checks
```bash
# Type check libraries
bunx tsc --noEmit

# Test service integrations
bun test src/lib

# Check environment variables
grep -v "^#" .env.example
```

### Service Examples
```typescript
// ✅ DO: Auth setup pattern
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const { auth, signIn, signOut } = betterAuth({
  // Auth configuration
});

// ✅ DO: API client pattern
// src/lib/api-client.ts
export async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }
  return response.json();
}

// ✅ DO: Error handling pattern
// src/lib/errors.ts
export class ApiError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}
```
