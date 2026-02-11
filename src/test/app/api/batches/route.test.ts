import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/batches/route';
import { NextRequest } from 'next/server';
import { batchService } from '@/lib/batch-service';
import { getImageProcessingQueue } from '@/lib/queue';
import { db, processingJobs, batches } from '@/db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

// Mock rate limits
vi.mock('@/lib/rate-limit', () => ({
  checkUploadRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 9,
    limit: 10,
    resetTime: Date.now() + 3600000,
  }),
  checkUploadBytesRateLimit: vi.fn().mockResolvedValue({
    success: true,
    remaining: 5 * 1024 * 1024 * 1024,
    limit: 5 * 1024 * 1024 * 1024,
  }),
}));

// Mock queue and batch processing
vi.mock('@/lib/queue', () => {
  const mockAdd = vi.fn().mockResolvedValue({ id: 'queue-job-id' });
  return {
    getImageProcessingQueue: vi.fn(() => ({
      add: mockAdd,
    })),
  };
});

// Mock database insert to avoid foreign key issues in tests
vi.mock('@/db', async () => {
  const actual = await vi.importActual('@/db');
  return {
    ...actual,
    db: {
      ...actual.db,
      insert: vi.fn((table) => {
        // For projects table, mock the insert
        if (table && table.name === 'projects') {
          return {
            values: vi.fn().mockResolvedValue(true),
          };
        }
        // For other tables, use real insert
        return (actual.db as any).insert(table);
      }),
    },
  };
});

const { auth } = await import('@/lib/auth');
const { checkUploadRateLimit, checkUploadBytesRateLimit } = await import('@/lib/rate-limit');

const testUserId = uuidv4();

describe('POST /api/batches', () => {
  beforeEach(async () => {
    // Clean up test data
    await db.delete(processingJobs);
    await db.delete(batches);

    // Reset mocks
    vi.clearAllMocks();
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: testUserId },
    });
  });

  afterEach(async () => {
    // Clean up after tests
    await db.delete(processingJobs);
    await db.delete(batches);
  });

  it('should create batch with valid files', async () => {
    // Create form data with files
    const formData = new FormData();
    
    // Create mock files (Blob with name)
    const file1 = new File(['fake image data'], 'photo1.cr2', { type: 'image/x-canon-raw' });
    const file2 = new File(['fake image data'], 'photo2.nef', { type: 'image/x-nikon-raw' });
    
    formData.append('files', file1);
    formData.append('files', file2);
    formData.append('name', 'Test Batch');
    formData.append('description', 'Test batch description');

    // Create mock request
    const request = new NextRequest(new URL('http://localhost:3000/api/batches'), {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.batchId).toBeDefined();
    expect(data.totalJobs).toBe(2);
    expect(data.jobIds).toHaveLength(2);
    expect(data.status).toBe('processing');

    // Verify batch was created
    const batch = await batchService.getBatch(data.batchId);
    expect(batch?.name).toBe('Test Batch');
    expect(batch?.description).toBe('Test batch description');
    expect(batch?.totalJobs).toBe(2);
  });

  it('should reject request with no files', async () => {
    const formData = new FormData();
    formData.append('name', 'Empty Batch');

    const request = new NextRequest(new URL('http://localhost:3000/api/batches'), {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('At least 1 file');
  });

  it('should reject request with too many files', async () => {
    const formData = new FormData();

    // Add 51 files (exceeds limit of 50)
    for (let i = 0; i < 51; i++) {
      const file = new File(['data'], `photo${i}.cr2`, { type: 'image/x-canon-raw' });
      formData.append('files', file);
    }

    const request = new NextRequest(new URL('http://localhost:3000/api/batches'), {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Maximum 50 files');
  });

  it('should reject invalid file types', async () => {
    const formData = new FormData();
    const file = new File(['fake image'], 'photo.jpg', { type: 'image/jpeg' });
    formData.append('files', file);

    const request = new NextRequest(new URL('http://localhost:3000/api/batches'), {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Invalid file type');
  });

  it('should reject files exceeding size limit', async () => {
    // Mock a large file
    const largeSize = 150 * 1024 * 1024; // 150MB
    const file = new File(['x'.repeat(largeSize)], 'large.cr2', {
      type: 'image/x-canon-raw',
    });

    const formData = new FormData();
    formData.append('files', file);

    const request = new NextRequest(new URL('http://localhost:3000/api/batches'), {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('exceeds 100MB limit');
  });

  it('should reject unauthorized requests', async () => {
    (auth.api.getSession as any).mockResolvedValueOnce(null);

    const formData = new FormData();
    const file = new File(['data'], 'photo.cr2', { type: 'image/x-canon-raw' });
    formData.append('files', file);

    const request = new NextRequest(new URL('http://localhost:3000/api/batches'), {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should respect rate limits', async () => {
    (checkUploadRateLimit as any).mockResolvedValueOnce({
      success: false,
      retryAfter: 3600,
      remaining: 0,
      limit: 10,
    });

    const formData = new FormData();
    const file = new File(['data'], 'photo.cr2', { type: 'image/x-canon-raw' });
    formData.append('files', file);

    const request = new NextRequest(new URL('http://localhost:3000/api/batches'), {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    expect(response.status).toBe(429);

    const data = await response.json();
    expect(data.error).toContain('Rate limit exceeded');
  });
});

describe('GET /api/batches', () => {
  beforeEach(async () => {
    // Clean up
    await db.delete(processingJobs);
    await db.delete(batches);

    // Reset mocks
    vi.clearAllMocks();
    (auth.api.getSession as any).mockResolvedValue({
      user: { id: testUserId },
    });

    // Create test batches
    await batchService.createBatch({
      userId: testUserId,
      name: 'Batch 1',
    });
    await batchService.createBatch({
      userId: testUserId,
      name: 'Batch 2',
    });
  });

  afterEach(async () => {
    await db.delete(processingJobs);
    await db.delete(batches);
  });

  it('should list user batches with pagination', async () => {
    const request = new NextRequest(
      new URL('http://localhost:3000/api/batches?page=1&limit=10')
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.items).toBeDefined();
    expect(data.total).toBeGreaterThanOrEqual(2);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(10);
  });

  it('should reject unauthorized requests', async () => {
    (auth.api.getSession as any).mockResolvedValueOnce(null);

    const request = new NextRequest(new URL('http://localhost:3000/api/batches'));

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should handle pagination parameters', async () => {
    const request = new NextRequest(
      new URL('http://localhost:3000/api/batches?page=2&limit=1')
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.page).toBe(2);
    expect(data.limit).toBe(1);
  });
});
