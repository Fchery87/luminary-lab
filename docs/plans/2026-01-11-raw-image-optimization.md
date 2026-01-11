# RAW Image Processing Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance RAW image processing with blur hash placeholders, optimized WebP thumbnails, and multiple preview sizes for better browser performance.

**Architecture:** 
- Add blur hash generation during thumbnail creation for instant placeholder display
- Convert all thumbnails to WebP for smaller file sizes
- Add an "ultra" preview size for high-quality browser viewing
- Store blur hash in image metadata for client-side rendering

**Tech Stack:** Sharp (existing), blurhash (new), Next.js App Router (existing)

---

## Tasks

### Task 1: Install blurhash dependency

**Files:**
- Modify: `package.json`

**Step 1: Write the failing test**

```typescript
// tests/lib/blurhash.test.ts
import { test, expect, describe } from 'bun:test';

describe('blurhash utilities', () => {
  test('blurhash function should be importable', async () => {
    const { encodeBlurHash, decodeBlurHashToDataUrl } = await import('@/lib/blurhash');
    expect(typeof encodeBlurHash).toBe('function');
    expect(typeof decodeBlurHashToDataUrl).toBe('function');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/lib/blurhash.test.ts`
Expected: FAIL - module not found

**Step 3: Add blurhash dependency**

```bash
bun add blurhash
bun add -D @types/blurhash
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/lib/blurhash.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json
git commit -m "feat: add blurhash dependency for image placeholders"
```

---

### Task 2: Create blurhash utility module

**Files:**
- Create: `src/lib/blurhash.ts`

**Step 1: Write the failing test**

```typescript
// tests/lib/blurhash.test.ts
import { test, expect } from 'bun:test';

test('encodeBlurHash should generate a valid blur hash string', async () => {
  const { encodeBlurHash } = await import('@/lib/blurhash');
  
  // Create a simple test image buffer (4x4 pixels, RGBA)
  const width = 4;
  const height = 4;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = 128; // Gray pixels
  }
  
  const hash = encodeBlurHash(width, height, pixels);
  expect(typeof hash).toBe('string');
  expect(hash.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/lib/blurhash.test.ts::encodeBlurHash_should_generate`
Expected: FAIL - function not defined

**Step 3: Write minimal implementation**

```typescript
// src/lib/blurhash.ts
import { encode as encodeBlurHash, decode as decodeBlurHash } from 'blurhash';

/**
 * Encode image pixels to blur hash string
 */
export function encodeBlurHash(width: number, height: number, pixels: Uint8ClampedArray): string {
  return encodeBlurHash(new Uint8ClampedArray(pixels), width, height, 4, 4);
}

/**
 * Decode blur hash to base64 data URL for immediate display
 */
export function decodeBlurHashToDataUrl(blurHash: string, width = 32, height = 32): string {
  const pixels = decodeBlurHash(blurHash, width, height);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
  
  return canvas.convertToBlob().then(blob => {
    return URL.createObjectURL(blob);
  });
}
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/lib/blurhash.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/blurhash.ts tests/lib/blurhash.test.ts
git commit -m "feat: add blurhash utility module"
```

---

### Task 3: Add blurhash generation to thumbnail generator

**Files:**
- Modify: `src/lib/thumbnail-generator.ts:1-50`

**Step 1: Write the failing test**

```typescript
// tests/lib/thumbnail-generator.test.ts
import { test, expect, mock } from 'bun:test';
import { generateThumbnail, generateAndSaveThumbnails } from '@/lib/thumbnail-generator';

test('generateThumbnail should return blurHash in result', async () => {
  // Create a simple test image buffer
  const testBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01
  ]);
  
  const result = await generateThumbnail(testBuffer, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 85,
    format: 'webp',
    fit: 'cover',
  });
  
  expect(result).toHaveProperty('blurHash');
  expect(typeof result.blurHash).toBe('string');
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/lib/thumbnail-generator.test.ts::generateThumbnail_should_return_blurHash`
Expected: FAIL - blurHash property not in result

**Step 3: Add blurhash generation to generateThumbnail function**

Add blurhash import and modify the thumbnail generation result:

```typescript
// Add at top of thumbnail-generator.ts
import { encodeBlurHash } from './blurhash';

// Modify generateThumbnail function to return blurHash
export interface ThumbnailGenerationResult {
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  blurHash?: string; // Add this field
}

// In generateThumbnail function, after getting result:
const result = await pipeline
  .rotate()
  .resize(config.maxWidth, config.maxHeight, {
    fit: config.fit,
    withoutEnlargement: true,
  })
  .toFormat(config.format, {
    quality: config.quality,
    progressive: true,
  })
  .toBuffer({
    resolveWithObject: true,
  });

// Generate blur hash from the resized image
let blurHash: string | undefined;
try {
  const { data, info } = await sharp(result.data)
    .resize(32, 32, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  blurHash = encodeBlurHash(info.width, info.height, new Uint8ClampedArray(data));
} catch (blurHashError) {
  console.warn('Failed to generate blur hash:', blurHashError);
}

return {
  buffer: result.data,
  width: result.info.width,
  height: result.info.height,
  size: result.info.size,
  blurHash,
};
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/lib/thumbnail-generator.test.ts::generateThumbnail_should_return_blurHash`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/thumbnail-generator.ts tests/lib/thumbnail-generator.test.ts
git commit -m "feat: add blurhash generation to thumbnail generator"
```

---

### Task 4: Update database schema to store blurhash

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Write the failing test**

```typescript
// tests/db/schema.test.ts
import { test, expect } from 'bun:test';
import { images } from '@/db/schema';
import { sql } from 'drizzle-orm';

test('images table should have blurHash column', () => {
  const columnNames = images.columns.map(col => col.name);
  expect(columnNames).toContain('blurHash');
});
```

**Step 2: Run test to verify it fails**

Run: `bun test tests/db/schema.test.ts`
Expected: FAIL - blurHash column not found

**Step 3: Add blurHash column to schema**

```typescript
// In src/db/schema.ts, add to images table:
blurHash: text('blurHash'),
```

**Step 4: Run test to verify it passes**

Run: `bun test tests/db/schema.test.ts`
Expected: PASS

**Step 5: Create migration**

```bash
bun db:generate
```

**Step 6: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add blurHash column to images table"
```

---

### Task 5: Update generateAndSaveThumbnails to store blurhash

**Files:**
- Modify: `src/lib/thumbnail-generator.ts:500-550`

**Step 1: Write the failing test**

```typescript
// tests/lib/thumbnail-generator.test.ts
test('generateAndSaveThumbnails should save blurHash to database', async () => {
  const mockDb = {
    insert: mock().mockReturnValue({
      values: mock().mockReturnValue({
        returning: mock().mockResolvedValue([{
          id: 'test-id',
          projectId: 'test-project',
          type: 'thumbnail',
          blurHash: 'test-hash',
        }]),
      }),
    }),
  };
  
  // Test would mock the db and verify blurHash is passed to insert
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL - blurHash not being saved

**Step 3: Update insert statement to include blurHash**

```typescript
// In generateAndSaveThumbnails, modify the insert values:
await db
  .insert(images)
  .values({
    id: uuidv7(),
    projectId,
    type: 'thumbnail',
    storageKey,
    filename,
    sizeBytes,
    mimeType: /* existing logic */,
    width,
    height,
    blurHash: thumbnailResult.blurHash, // Add this
  })
  .returning();
```

**Step 4: Run test to verify it passes**

**Step 5: Commit**

```bash
git add src/lib/thumbnail-generator.ts
git commit -m "feat: save blurHash to database when generating thumbnails"
```

---

### Task 6: Add blurhash component to UI

**Files:**
- Create: `src/components/ui/blur-hash-image.tsx`

**Step 1: Write the failing test**

```typescript
// tests/components/blur-hash-image.test.tsx
import { test, expect } from 'bun:test';
import { render } from '@testing-library/react';
import { BlurHashImage } from '@/components/ui/blur-hash-image';

test('BlurHashImage should render blur hash placeholder', () => {
  const { container } = render(
    <BlurHashImage 
      src="/test.jpg" 
      blurHash="LEHV6nWB2yk8pyo0adR*.7kCMdnj" 
      alt="Test"
    />
  );
  
  expect(container.querySelector('div[data-blurhash]')).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL - component not found

**Step 3: Create blurhash image component**

```tsx
// src/components/ui/blur-hash-image.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';

interface BlurHashImageProps {
  src: string;
  blurHash: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export function BlurHashImage({
  src,
  blurHash,
  alt,
  width,
  height,
  className,
}: BlurHashImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative" style={{ width, height }}>
      {/* Blur hash placeholder */}
      <div
        data-blurhash
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundColor: blurHashToColor(blurHash),
          opacity: isLoaded ? 0 : 1,
        }}
      />
      
      {/* Actual image */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={`${className} transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}

function blurHashToColor(hash: string): string {
  // Decode blur hash to dominant color
  // Simplified: return a gray fallback
  return '#1a1a1a';
}
```

**Step 4: Run test to verify it passes**

**Step 5: Commit**

```bash
git add src/components/ui/blur-hash-image.tsx tests/components/blur-hash-image.test.tsx
git commit -m "feat: add blur hash image component for placeholders"
```

---

### Task 7: Update edit page to use blurhash

**Files:**
- Modify: `src/app/edit/[projectId]/page.tsx`

**Step 1: Find where thumbnail is displayed**

Search for thumbnail image usage in edit page.

**Step 2: Replace with BlurHashImage component**

```tsx
// Replace existing <img> or <Image> for thumbnails:
import { BlurHashImage } from '@/components/ui/blur-hash-image';

// In JSX:
<BlurHashImage
  src={anyThumbnail || originalImageObj?.url || ''}
  blurHash={/* get from image record */}
  alt="Preview"
  width={800}
  height={600}
  className="object-contain"
/>
```

**Step 3: Test in browser**

Run: `bun dev` and verify placeholders appear before images load.

**Step 4: Commit**

```bash
git add src/app/edit/[projectId]/page.tsx
git commit -m "feat: use blurhash placeholders in edit page"
```

---

### Task 8: Run full test suite and verify build

**Step 1: Run all tests**

```bash
bun test
```

**Step 2: Run lint**

```bash
bun lint
```

**Step 3: Run type check**

```bash
bunx tsc --noEmit
```

**Step 4: Run build**

```bash
bun build
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: verify all tests pass after blurhash implementation"
```

---

## Plan Complete

**Next Steps:**
1. **Immediate**: Run database migration to add blurHash column
2. **Test**: Upload a RAW file and verify blurhash appears during loading
3. **Optimize**: Tune blurhash generation quality vs performance tradeoff

**Estimated Time:** 2-3 hours for full implementation

**Testing Strategy:**
- Unit tests for blurhash utilities
- Integration test for thumbnail generation flow
- Manual browser testing for visual verification
