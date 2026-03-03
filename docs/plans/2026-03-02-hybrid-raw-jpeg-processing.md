# Hybrid RAW/JPEG Processing Implementation Plan

> **Project:** Luminary Lab  
> **Date:** March 2026  
> **Goal:** Implement hybrid processing pipeline for real-time filter previews with RAW quality final exports  
> **Approach:** Option B - Extract embedded JPEG preview from RAW for instant feedback, process RAW for final export

---

## Executive Summary

This plan implements a hybrid image processing architecture that:

1. **Accepts both RAW and JPEG uploads** from users
2. **Extracts embedded JPEG preview** from RAW files on upload (instant, no processing)
3. **Uses JPEG preview for real-time filter adjustments** (instant feedback)
4. **Processes RAW for final export** (maximum quality)
5. **Maintains blur hash placeholders** (already implemented)

This solves the core problem: **RAW files can't provide real-time filter previews in a browser, but users expect instant feedback like they get with JPEG images.**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UPLOAD FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐     ┌──────────────┐     ┌────────────────────────────┐    │
│   │ User     │────▶│ Server       │────▶│ 1. Store Original (RAW/JPEG)│    │
│   │ Uploads  │     │ Endpoint     │     │ 2. Extract Embedded JPEG    │    │
│   │ File     │     │              │     │ 3. Generate Preview         │    │
│   └──────────┘     └──────────────┘     │ 4. Generate Thumbnails      │    │
│                                          │ 5. Generate BlurHash        │    │
│                                          └────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        EDITING FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐     ┌──────────────┐     ┌────────────────────────────┐    │
│   │ User     │────▶│ Filter       │────▶│ Real-time Preview          │    │
│   │ Adjusts  │     │ Controls     │     │ (Uses JPEG Preview)        │    │
│   │ Filters  │     │              │     │ ⚡ Instant Response         │    │
│   └──────────┘     └──────────────┘     └────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXPORT FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐     ┌──────────────┐     ┌────────────────────────────┐    │
│   │ User     │────▶│ Export       │────▶│ Full RAW Processing        │    │
│   │ Clicks   │     │ Request      │     │ ⚡ Maximum Quality Output   │    │
│   │ Export   │     │              │     │                            │    │
│   └──────────┘     └──────────────┘     └────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Current State Assessment

### What's Already Implemented ✅

| Component | Status | Notes |
|-----------|--------|-------|
| RAW Upload Support | ✅ | CR2, NEF, ARW, DNG, RAF, RW2, ORF, PEF |
| JPEG Upload Support | ✅ | JPEG, PNG, WebP, HEIC |
| Embedded Preview Extraction | ✅ | cr2-raw for Canon, dcraw fallback |
| RAW to JPEG Conversion | ✅ | Sharp, cr2-raw, dcraw pipeline |
| Multiple Thumbnails | ✅ | small (200px), medium (800px), large (1920px) |
| Blur Hash Generation | ✅ | Already stored in images table |
| WebP Format | ✅ | Large thumbnails use WebP |

### What's Missing ❌

| Component | Priority | Impact |
|-----------|----------|--------|
| Real-time preview using JPEG while editing | **P0** | Core UX issue |
| Differentiation between preview vs export processing | **P0** | Architecture gap |
| Client-side filter preview (instant feedback) | **P0** | User experience |
| Caching of preview images | **P1** | Performance |
| Progressive loading indicator | **P2** | UX polish |

---

## Implementation Tasks

### Phase 1: Backend Pipeline Changes (Foundation)

#### Task 1.1: Add Preview Image Type to Schema

**Files:**
- `src/db/schema.ts`

**Step 1: Write failing test**

```typescript
// tests/db/schema.test.ts
test('images table should have previewImageType column', () => {
  const columnNames = images.columns.map(col => col.name);
  expect(columnNames).toContain('previewImageType');
});
```

**Step 2: Run test - expect FAIL**

```bash
bun test tests/db/schema.test.ts
```

**Step 3: Add column to schema**

```typescript
// src/db/schema.ts - add to images table
previewImageType: text('preview_image_type'), // 'embedded' | 'generated' | null
isPreview: boolean('is_preview').default(false), // true for preview images
```

**Step 4: Run test - expect PASS**

```bash
bun test tests/db/schema.test.ts
```

**Step 5: Generate migration**

```bash
bun db:generate
```

---

#### Task 1.2: Create Preview Extraction Service

**Files:**
- Create: `src/lib/preview-extractor.ts`

**Step 1: Write failing test**

```typescript
// tests/lib/preview-extractor.test.ts
import { extractPreviewFromUpload } from '@/lib/preview-extractor';

test('extractPreviewFromUpload should extract embedded JPEG from RAW', async () => {
  const rawBuffer = await fs.promises.readFile('tests/fixtures/canon-cr2.cr2');
  
  const result = await extractPreviewFromUpload(rawBuffer, 'image/x-canon-cr2');
  
  expect(result.hasPreview).toBe(true);
  expect(result.previewBuffer).toBeDefined();
  expect(result.previewBuffer.length).toBeGreaterThan(0);
});
```

**Step 2: Run test - expect FAIL**

**Step 3: Implement preview extractor**

```typescript
// src/lib/preview-extractor.ts

export interface PreviewExtractionResult {
  hasPreview: boolean;
  previewBuffer: Buffer | null;
  previewType: 'embedded' | 'generated' | null;
  method: string;
  originalBuffer: Buffer;
}

/**
 * Extract preview image from uploaded file
 * Priority: 1. Embedded JPEG from RAW, 2. Use original JPEG as preview
 */
export async function extractPreviewFromUpload(
  fileBuffer: Buffer,
  mimeType: string,
  options: {
    maxPreviewWidth?: number;
    maxPreviewHeight?: number;
  } = {}
): Promise<PreviewExtractionResult> {
  const { maxPreviewWidth = 1600, maxPreviewHeight = 1200 } = options;
  
  // Check if RAW format
  const isRAW = mimeType.startsWith('image/x-');
  
  if (isRAW) {
    // Try to extract embedded JPEG preview
    const embeddedResult = await tryExtractEmbeddedPreview(fileBuffer, mimeType);
    
    if (embeddedResult.success && embeddedResult.preview) {
      console.log(`[Preview] Extracted embedded preview from ${mimeType}`);
      return {
        hasPreview: true,
        previewBuffer: embeddedResult.preview,
        previewType: 'embedded',
        method: 'embedded',
        originalBuffer: fileBuffer,
      };
    }
    
    // Fallback: Generate preview from RAW
    console.log(`[Preview] Generating preview from RAW (${mimeType})`);
    const generatedPreview = await generatePreviewFromRAW(fileBuffer, mimeType, {
      maxWidth: maxPreviewWidth,
      maxHeight: maxPreviewHeight,
    });
    
    return {
      hasPreview: true,
      previewBuffer: generatedPreview,
      previewType: 'generated',
      method: 'sharp-conversion',
      originalBuffer: fileBuffer,
    };
  }
  
  // For JPEG files, use as-is (resize if too large)
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    const metadata = await sharp(fileBuffer).metadata();
    
    // If already suitable size, use as preview
    if (metadata.width && metadata.width <= maxPreviewWidth &&
        metadata.height && metadata.height <= maxPreviewHeight) {
      return {
        hasPreview: true,
        previewBuffer: fileBuffer,
        previewType: 'embedded',
        method: 'original',
        originalBuffer: fileBuffer,
      };
    }
    
    // Resize for preview
    const resized = await sharp(fileBuffer)
      .resize(maxPreviewWidth, maxPreviewHeight, { fit: 'inside' })
      .jpeg({ quality: 90 })
      .toBuffer();
    
    return {
      hasPreview: true,
      previewBuffer: resized,
      previewType: 'generated',
      method: 'resized',
      originalBuffer: fileBuffer,
    };
  }
  
  // For other formats, convert to JPEG preview
  const converted = await sharp(fileBuffer)
    .resize(maxPreviewWidth, maxPreviewHeight, { fit: 'inside' })
    .jpeg({ quality: 90 })
    .toBuffer();
  
  return {
    hasPreview: true,
    previewBuffer: converted,
    previewType: 'generated',
    method: 'converted',
    originalBuffer: fileBuffer,
  };
}

/**
 * Try to extract embedded JPEG from RAW file
 */
async function tryExtractEmbeddedPreview(
  buffer: Buffer,
  mimeType: string
): Promise<{ success: boolean; preview: Buffer | null }> {
  // Method 1: Sharp's built-in RAW handling
  try {
    const metadata = await sharp(buffer).metadata();
    // Sharp may use embedded preview automatically
    if (metadata.width && metadata.width > 0) {
      // Check if it's a small preview image
      if (metadata.width <= 1600) {
        const preview = await sharp(buffer)
          .jpeg({ quality: 92 })
          .toBuffer();
        return { success: true, preview };
      }
    }
  } catch (e) {
    // Sharp can't handle this format directly
  }
  
  // Method 2: Try cr2-raw for Canon files
  if (mimeType.includes('canon') || mimeType.includes('cr2')) {
    try {
      const preview = await extractCR2Preview(buffer);
      return { success: true, preview };
    } catch (e) {
      console.warn('[Preview] cr2-raw extraction failed:', e);
    }
  }
  
  // Method 3: Try dcraw for other formats
  try {
    const preview = await convertRawWithDcraw(buffer, getExtension(mimeType));
    return { success: true, preview };
  } catch (e) {
    console.warn('[Preview] dcraw extraction failed:', e);
  }
  
  return { success: false, preview: null };
}

/**
 * Generate preview from RAW by converting to JPEG
 */
async function generatePreviewFromRAW(
  buffer: Buffer,
  mimeType: string,
  options: { maxWidth: number; maxHeight: number }
): Promise<Buffer> {
  // Try Sharp first (fastest, uses libvips)
  try {
    return await sharp(buffer)
      .resize(options.maxWidth, options.maxHeight, { fit: 'inside' })
      .jpeg({ quality: 90 })
      .toBuffer();
  } catch (e) {
    console.warn('[Preview] Sharp RAW conversion failed, trying dcraw');
  }
  
  // Fallback to dcraw
  return await convertRawWithDcraw(buffer, getExtension(mimeType));
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/x-canon-cr2': '.cr2',
    'image/x-nikon-nef': '.nef',
    'image/x-sony-arw': '.arw',
    'image/x-adobe-dng': '.dng',
    'image/x-fuji-raf': '.raf',
    'image/x-panasonic-rw2': '.rw2',
    'image/x-olympus-orf': '.orf',
    'image/x-pentax-pef': '.pef',
  };
  return map[mimeType] || '.raw';
}
```

**Step 4: Run test - expect PASS**

```bash
bun test tests/lib/preview-extractor.test.ts
```

**Step 5: Commit**

```bash
git add src/lib/preview-extractor.ts tests/lib/preview-extractor.test.ts
git commit -m "feat: add preview extraction service for hybrid processing"
```

---

#### Task 1.3: Update Upload Handler to Generate Preview

**Files:**
- `src/app/api/upload/route.ts`

**Step 1: Read current upload handler**

```bash
rg -n "generateAndSaveThumbnails" src/app/api/upload
```

**Step 2: Modify to generate preview on upload**

```typescript
// Add to upload handler
import { extractPreviewFromUpload } from '@/lib/preview-extractor';

// After storing original file, extract preview
const previewResult = await extractPreviewFromUpload(
  fileBuffer,
  detectedMimeType,
  { maxPreviewWidth: 1600, maxPreviewHeight: 1200 }
);

// If we got a preview, store it separately
if (previewResult.hasPreview && previewResult.previewBuffer) {
  const previewKey = `users/${userId}/projects/${projectId}/preview/${Date.now()}-preview.jpg`;
  
  await uploadFile(previewKey, previewResult.previewBuffer, 'image/jpeg');
  
  // Save preview image record
  await db.insert(images).values({
    id: uuidv7(),
    projectId,
    type: 'preview',
    storageKey: previewKey,
    filename: `preview_${projectId}.jpg`,
    sizeBytes: previewResult.previewBuffer.length,
    mimeType: 'image/jpeg',
    isPreview: true,
    previewImageType: previewResult.previewType,
    // Generate blurhash for preview too
    blurHash: await generateBlurHash(previewResult.previewBuffer),
  });
}
```

**Step 3: Run tests**

```bash
bun test tests/lib/preview-extractor.test.ts
bunx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/app/api/upload/route.ts
git commit -m "feat: generate preview image on upload for real-time editing"
```

---

### Phase 2: Frontend Real-Time Preview

#### Task 2.1: Create Client-Side Image Processing Hook

**Files:**
- Create: `src/hooks/use-image-preview.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/use-image-preview.ts
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  clarity: number;
  exposure: number;
}

interface UseImagePreviewOptions {
  previewImageUrl: string;
  onFilterChange?: (settings: FilterSettings) => void;
}

export function useImagePreview({ previewImageUrl, onFilterChange }: UseImagePreviewOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterSettings, setFilterSettings] = useState<FilterSettings>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0,
    clarity: 0,
    exposure: 0,
  });
  
  // Apply filters to preview image using CSS filters (instant)
  const previewStyle = {
    filter: `
      brightness(${filterSettings.brightness}%)
      contrast(${filterSettings.contrast}%)
      saturate(${filterSettings.saturation}%)
      sepia(${Math.max(0, filterSettings.warmth)}%)
      ${filterSettings.warmth < 0 ? `hue-rotate(${Math.abs(filterSettings.warmth) * 0.5}deg)` : ''}
    `.trim(),
  };
  
  // For more complex filters, use canvas
  const applyFiltersToCanvas = useCallback(async () => {
    if (!canvasRef.current) return;
    
    setIsProcessing(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Apply CSS filters via canvas
      ctx.filter = `
        brightness(${filterSettings.brightness}%)
        contrast(${filterSettings.contrast}%)
        saturate(${filterSettings.saturation}%)
      `;
      
      ctx.drawImage(img, 0, 0);
      setIsProcessing(false);
    };
    
    img.src = previewImageUrl;
  }, [previewImageUrl, filterSettings]);
  
  // Update single filter
  const updateFilter = useCallback((key: keyof FilterSettings, value: number) => {
    setFilterSettings(prev => ({ ...prev, [key]: value }));
    onFilterChange?.({ ...filterSettings, [key]: value });
  }, [filterSettings, onFilterChange]);
  
  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilterSettings({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      warmth: 0,
      clarity: 0,
      exposure: 0,
    });
  }, []);
  
  return {
    canvasRef,
    filterSettings,
    previewStyle,
    isProcessing,
    updateFilter,
    resetFilters,
    applyFiltersToCanvas,
  };
}
```

**Step 2: Write test**

```typescript
// tests/hooks/use-image-preview.test.ts
import { renderHook, act } from '@testing-library/react';
import { useImagePreview } from '@/hooks/use-image-preview';

test('useImagePreview should initialize with default filters', () => {
  const { result } = renderHook(() => 
    useImagePreview({ previewImageUrl: 'http://example.com/preview.jpg' })
  );
  
  expect(result.current.filterSettings.brightness).toBe(100);
  expect(result.current.filterSettings.contrast).toBe(100);
  expect(result.current.filterSettings.saturation).toBe(100);
});
```

**Step 3: Commit**

```bash
git add src/hooks/use-image-preview.ts
git commit -m "feat: add client-side image preview hook for real-time filtering"
```

---

#### Task 2.2: Update Edit Page to Use Preview Image

**Files:**
- `src/app/edit/[projectId]/page.tsx`

**Step 1: Read current edit page**

```bash
rg -n "preview|thumbnail" src/app/edit/\[projectId\]/page.tsx | head -30
```

**Step 2: Modify to fetch and use preview image**

```typescript
// In the edit page component

// Fetch preview image URL in addition to original/thumbnail
const { data: previewImages } = await db
  .select()
  .from(images)
  .where(and(
    eq(images.projectId, projectId),
    eq(images.isPreview, true)
  ));

const previewUrl = previewImages?.[0]?.storageKey 
  ? await generateDownloadUrl(previewImages[0].storageKey)
  : null;

// Pass to client component
```

**Step 3: Update client component to use preview for real-time feedback**

```typescript
// In the edit client component
import { useImagePreview } from '@/hooks/use-image-preview';

export function EditClient({ previewUrl, ...props }) {
  const { 
    filterSettings, 
    previewStyle, 
    updateFilter, 
    resetFilters 
  } = useImagePreview({ 
    previewImageUrl: previewUrl 
  });
  
  return (
    <div className="edit-container">
      {/* Real-time preview - uses CSS filters for instant feedback */}
      <div className="preview-container" style={previewStyle}>
        <Image 
          src={previewUrl} 
          alt="Preview"
          fill
          className="object-contain"
        />
      </div>
      
      {/* Filter controls */}
      <FilterControls 
        settings={filterSettings}
        onChange={updateFilter}
        onReset={resetFilters}
      />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/edit/\[projectId\]/page.tsx
git commit -m "feat: use preview image for real-time filter editing"
```

---

### Phase 3: Export Pipeline (Full Quality)

#### Task 3.1: Create Dual-Mode Export

**Files:**
- Create: `src/lib/hybrid-export.ts`
- Modify: `src/app/api/process/route.ts`

**Step 1: Create hybrid export service**

```typescript
// src/lib/hybrid-export.ts

export type ExportMode = 'preview' | 'full-quality';

export interface ExportOptions {
  mode: ExportMode;
  styleId: string;
  intensity: number;
  format: 'jpeg' | 'png' | 'webp';
  quality: number;
}

/**
 * Export processed image based on mode
 * - preview: Uses preview image (fast, good for quick results)
 * - full-quality: Uses RAW/original (slower, maximum quality)
 */
export async function exportProcessedImage(
  projectId: string,
  options: ExportOptions
): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
  mode: ExportMode;
}> {
  const { mode, styleId, intensity, format, quality } = options;
  
  // Get the source image
  let sourceBuffer: Buffer;
  let sourceMimeType: string;
  
  if (mode === 'preview') {
    // Use preview image for fast export
    const previewImage = await db
      .select()
      .from(images)
      .where(and(
        eq(images.projectId, projectId),
        eq(images.isPreview, true)
      ))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!previewImage) {
      throw new Error('Preview image not found');
    }
    
    sourceBuffer = await downloadImageFromS3(previewImage.storageKey);
    sourceMimeType = previewImage.mimeType;
  } else {
    // Use original RAW/JPEG for full quality
    const originalImage = await db
      .select()
      .from(images)
      .where(and(
        eq(images.projectId, projectId),
        eq(images.type, 'original')
      ))
      .limit(1)
      .then(rows => rows[0]);
    
    if (!originalImage) {
      throw new Error('Original image not found');
    }
    
    sourceBuffer = await downloadImageFromS3(originalImage.storageKey);
    sourceMimeType = originalImage.mimeType;
  }
  
  // Apply style processing
  const [style] = await db
    .select()
    .from(systemStyles)
    .where(eq(systemStyles.id, styleId));
  
  if (!style) {
    throw new Error('Style not found');
  }
  
  // Process with AI (using preview or original based on mode)
  const processedBuffer = await processWithAI(
    sourceBuffer,
    {
      name: style.name,
      description: style.description || '',
      aiPrompt: style.aiPrompt,
      blendingParams: style.blendingParams as any,
    },
    intensity
  );
  
  // Convert to requested format
  const finalBuffer = await sharp(processedBuffer)
    .toFormat(format, { quality })
    .toBuffer();
  
  return {
    buffer: finalBuffer,
    contentType: `image/${format}`,
    filename: `export-${projectId}-${mode}.${format}`,
    mode,
  };
}
```

**Step 2: Update export API to support mode selection**

```typescript
// src/app/api/process/route.ts

export async function POST(request: NextRequest) {
  const { 
    projectId, 
    styleId, 
    intensity,
    exportMode = 'full-quality', // 'preview' or 'full-quality'
    format = 'jpeg',
    quality = 92 
  } = await request.json();
  
  // For preview mode, process faster
  const result = await exportProcessedImage(projectId, {
    mode: exportMode,
    styleId,
    intensity,
    format,
    quality,
  });
  
  // Return processed image
  // ...
}
```

**Step 3: Commit**

```bash
git add src/lib/hybrid-export.ts src/app/api/process/route.ts
git commit -m "feat: add dual-mode export for preview and full-quality processing"
```

---

### Phase 4: Caching & Performance

#### Task 4.1: Add Preview Image Caching

**Files:**
- `src/lib/cache.ts` (update)
- `src/app/api/upload/complete/route.ts`

**Step 1: Add preview caching**

```typescript
// src/lib/cache.ts

// Preview image cache (short TTL - 15 minutes)
export async function getCachedPreview(projectId: string): Promise<string | null> {
  const redis = getRedis();
  const key = `preview:${projectId}`;
  
  const cached = await redis.get(key);
  if (cached) return cached;
  
  // Fetch from database
  const [preview] = await db
    .select()
    .from(images)
    .where(and(
      eq(images.projectId, projectId),
      eq(images.isPreview, true)
    ));
  
  if (preview) {
    const url = await generateDownloadUrl(preview.storageKey);
    // Cache for 15 minutes
    await redis.setex(key, 900, url);
    return url;
  }
  
  return null;
}

export async function invalidatePreviewCache(projectId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`preview:${projectId}`);
}
```

**Step 2: Use in edit page**

```typescript
// In src/app/edit/[projectId]/page.tsx
import { getCachedPreview } from '@/lib/cache';

// Replace generateDownloadUrl call with cached version
const previewUrl = await getCachedPreview(projectId);
```

**Step 3: Commit**

```bash
git add src/lib/cache.ts src/app/edit/\[projectId\]/page.tsx
git commit -m "feat: add preview image caching for faster load times"
```

---

### Phase 5: UX Polish

#### Task 5.1: Loading States & Progress

**Files:**
- Update: Edit page components

**Add visual feedback:**

```typescript
// In FilterControls component
<div className="filter-controls">
  {isProcessing && (
    <div className="processing-indicator">
      <Spinner />
      <span>Applying changes...</span>
    </div>
  )}
  
  {/* Show this for full-quality export */}
  {isExportingFull && (
    <div className="export-progress">
      <Progress value={progress} />
      <span>Processing full quality... ({progress}%)</span>
    </div>
  )}
</div>
```

#### Task 5.2: Quality Indicator UI

**Add toggle for export quality:**

```typescript
// In export dialog
<div className="export-options">
  <label>
    <input 
      type="radio" 
      name="quality" 
      value="preview"
      checked={exportMode === 'preview'}
      onChange={() => setExportMode('preview')}
    />
    <span>Quick Preview</span>
    <small>Uses preview image - fast, smaller file</small>
  </label>
  
  <label>
    <input 
      type="radio" 
      name="quality" 
      value="full-quality"
      checked={exportMode === 'full-quality'}
      onChange={() => setExportMode('full-quality')}
    />
    <span>Full Quality</span>
    <small>Uses original/RAW - maximum quality, takes longer</small>
  </label>
</div>
```

---

## Database Schema Changes

### New Columns

```typescript
// src/db/schema.ts - images table additions
previewImageType: text('preview_image_type'), // 'embedded' | 'generated' | null
isPreview: boolean('is_preview').default(false), // true for preview images
```

### Migration

```sql
-- migrations/xxxx_add_preview_columns.sql
ALTER TABLE images ADD COLUMN preview_image_type TEXT;
ALTER TABLE images ADD COLUMN is_preview BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_images_is_preview ON images(is_preview) WHERE is_preview = TRUE;
CREATE INDEX idx_images_preview_type ON images(preview_image_type) WHERE preview_image_type IS NOT NULL;
```

---

## Testing Strategy

### Unit Tests

```bash
# Test preview extraction
bun test tests/lib/preview-extractor.test.ts

# Test hybrid export
bun test tests/lib/hybrid-export.test.ts

# Test image preview hook
bun test tests/hooks/use-image-preview.test.ts
```

### Integration Tests

```bash
# Test full upload flow with preview generation
bun test tests/app/api/upload.test.ts

# Test edit page with real-time preview
bun test:e2e tests/e2e/edit-page.test.ts
```

### Manual Testing

1. Upload RAW file → verify preview generated
2. Upload JPEG file → verify used as preview
3. Adjust filters → verify instant preview
4. Export preview mode → verify fast
5. Export full-quality → verify maximum quality

---

## Rollout Plan

### Phase 1: Backend (Week 1)
- [ ] Schema changes + migration
- [ ] Preview extraction service
- [ ] Upload handler updates

### Phase 2: Frontend (Week 2)
- [ ] Client-side preview hook
- [ ] Edit page integration
- [ ] Caching layer

### Phase 3: Export (Week 2-3)
- [ ] Dual-mode export
- [ ] Quality toggle UI
- [ ] Progress indicators

### Phase 4: Polish (Week 3)
- [ ] Loading states
- [ ] Error handling
- [ ] Performance optimization

---

## Estimated Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1 | Backend Pipeline | 4-6 hours |
| Phase 2 | Frontend Preview | 4-6 hours |
| Phase 3 | Export Pipeline | 2-3 hours |
| Phase 4 | Polish | 2-3 hours |
| **Total** | | **12-18 hours** |

---

## Success Metrics

- [ ] RAW uploads generate preview in <5 seconds
- [ ] Filter adjustments show in <50ms (CSS filters)
- [ ] Preview export completes in <3 seconds
- [ ] Full-quality export completes in <30 seconds
- [ ] No quality loss in full-quality mode
- [ ] All existing RAW formats still supported

---

## Risk Mitigation

| Risk | Mitigation |
|------|-------------|
| RAW formats not supported | Multiple conversion methods (Sharp, cr2-raw, dcraw) |
| Preview extraction slow | Timeout after 10s, fallback to original |
| Memory issues with large files | Stream processing, limit preview size |
| Cache invalidation | Manual invalidation on reprocess |

---

## Appendix: Environment Variables

```env
# Preview generation
MAX_PREVIEW_WIDTH=1600
MAX_PREVIEW_HEIGHT=1200
PREVIEW_QUALITY=90

# Cache TTL (seconds)
PREVIEW_CACHE_TTL=900

# Export timeouts (ms)
EXPORT_PREVIEW_TIMEOUT=10000
EXPORT_FULL_QUALITY_TIMEOUT=60000
```

---

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Author:** Implementation Plan
