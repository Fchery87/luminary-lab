import { test, expect, describe } from 'bun:test';
import { z } from 'zod';

// Test schemas and validation
describe('API Routes - Upload Validation', () => {
  const uploadSchema = z.object({
    filename: z.string().min(1),
    fileSize: z.number().min(1),
    mimeType: z.string().min(1),
    projectName: z.string().min(1).optional(),
  });

  describe('upload schema', () => {
    test('should validate correct upload data', () => {
      const validData = {
        filename: 'test.CR2',
        fileSize: 10 * 1024 * 1024, // 10MB
        mimeType: 'image/x-canon-cr2',
        projectName: 'My Project',
      };

      const result = uploadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate upload without project name', () => {
      const validData = {
        filename: 'test.NEF',
        fileSize: 5 * 1024 * 1024,
        mimeType: 'image/x-nikon-nef',
      };

      const result = uploadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should reject empty filename', () => {
      const invalidData = {
        filename: '',
        fileSize: 10 * 1024 * 1024,
        mimeType: 'image/x-canon-cr2',
      };

      const result = uploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject zero or negative file size', () => {
      const invalidData = {
        filename: 'test.CR2',
        fileSize: 0,
        mimeType: 'image/x-canon-cr2',
      };

      const result = uploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject empty mime type', () => {
      const invalidData = {
        filename: 'test.CR2',
        fileSize: 10 * 1024 * 1024,
        mimeType: '',
      };

      const result = uploadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe('API Routes - Process Job Validation', () => {
  const processSchema = z.object({
    projectId: z.string().min(1),
    presetId: z.string().min(1),
    intensity: z.number().min(0).max(1),
  });

  describe('process schema', () => {
    test('should validate correct process data', () => {
      const validData = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        presetId: 'preset-123',
        intensity: 0.75,
      };

      const result = processSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate with minimum intensity', () => {
      const validData = {
        projectId: 'project-123',
        presetId: 'preset-456',
        intensity: 0,
      };

      const result = processSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should validate with maximum intensity', () => {
      const validData = {
        projectId: 'project-123',
        presetId: 'preset-456',
        intensity: 1,
      };

      const result = processSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    test('should reject intensity below 0', () => {
      const invalidData = {
        projectId: 'project-123',
        presetId: 'preset-456',
        intensity: -0.1,
      };

      const result = processSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject intensity above 1', () => {
      const invalidData = {
        projectId: 'project-123',
        presetId: 'preset-456',
        intensity: 1.1,
      };

      const result = processSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject empty project ID', () => {
      const invalidData = {
        projectId: '',
        presetId: 'preset-456',
        intensity: 0.5,
      };

      const result = processSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    test('should reject empty preset ID', () => {
      const invalidData = {
        projectId: 'project-123',
        presetId: '',
        intensity: 0.5,
      };

      const result = processSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});

describe('API Routes - RAW File Validation', () => {
  const RAW_MIME_TYPES: Record<string, string> = {
    'image/x-canon-cr2': '.CR2',
    'image/x-nikon-nef': '.NEF',
    'image/x-sony-arw': '.ARW',
    'image/x-adobe-dng': '.DNG',
    'image/x-panasonic-rw2': '.RW2',
    'image/x-pentax-pef': '.PEF',
    'image/x-samsung-srf': '.SRF',
  };

  const isValidRawFile = (mimeType: string): boolean => {
    return Object.keys(RAW_MIME_TYPES).includes(mimeType);
  };

  describe('RAW file type validation', () => {
    test('should accept Canon CR2 files', () => {
      expect(isValidRawFile('image/x-canon-cr2')).toBe(true);
    });

    test('should accept Nikon NEF files', () => {
      expect(isValidRawFile('image/x-nikon-nef')).toBe(true);
    });

    test('should accept Sony ARW files', () => {
      expect(isValidRawFile('image/x-sony-arw')).toBe(true);
    });

    test('should accept Adobe DNG files', () => {
      expect(isValidRawFile('image/x-adobe-dng')).toBe(true);
    });

    test('should reject JPEG files', () => {
      expect(isValidRawFile('image/jpeg')).toBe(false);
    });

    test('should reject PNG files', () => {
      expect(isValidRawFile('image/png')).toBe(false);
    });

    test('should reject PDF files', () => {
      expect(isValidRawFile('application/pdf')).toBe(false);
    });
  });
});

describe('API Routes - File Size Validation', () => {
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  const isValidFileSize = (fileSize: number): boolean => {
    return fileSize <= MAX_FILE_SIZE && fileSize > 0;
  };

  describe('file size validation', () => {
    test('should accept files under 100MB', () => {
      expect(isValidFileSize(50 * 1024 * 1024)).toBe(true); // 50MB
    });

    test('should accept files exactly at 100MB', () => {
      expect(isValidFileSize(MAX_FILE_SIZE)).toBe(true);
    });

    test('should reject files over 100MB', () => {
      expect(isValidFileSize(101 * 1024 * 1024)).toBe(false);
    });

    test('should reject zero byte files', () => {
      expect(isValidFileSize(0)).toBe(false);
    });

    test('should reject negative file sizes', () => {
      expect(isValidFileSize(-1)).toBe(false);
    });
  });
});
