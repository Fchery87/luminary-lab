import { test, expect, beforeAll } from 'bun:test';
import sharp from 'sharp';
import { generateThumbnail } from '@/lib/thumbnail-generator';

// Create a valid test image buffer using Sharp
let validImageBuffer: Buffer;
let portraitImageBuffer: Buffer;

beforeAll(async () => {
  // Create a simple 100x100 RGBA image (square)
  const width = 100;
  const height = 100;
  const rawBuffer = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      rawBuffer[offset] = Math.floor((x / width) * 255); // R
      rawBuffer[offset + 1] = 100; // G
      rawBuffer[offset + 2] = Math.floor((y / height) * 255); // B
      rawBuffer[offset + 3] = 255; // A
    }
  }

  validImageBuffer = await sharp(rawBuffer, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  // Create a portrait image (100x200) for orientation tests
  const pWidth = 100;
  const pHeight = 200;
  const portraitRawBuffer = Buffer.alloc(pWidth * pHeight * 4);

  for (let y = 0; y < pHeight; y++) {
    for (let x = 0; x < pWidth; x++) {
      const offset = (y * pWidth + x) * 4;
      portraitRawBuffer[offset] = Math.floor((x / pWidth) * 255);
      portraitRawBuffer[offset + 1] = 128;
      portraitRawBuffer[offset + 2] = Math.floor((y / pHeight) * 255);
      portraitRawBuffer[offset + 3] = 255;
    }
  }

  portraitImageBuffer = await sharp(portraitRawBuffer, {
    raw: { width: pWidth, height: pHeight, channels: 4 },
  })
    .png()
    .toBuffer();
});

test('generateThumbnail should return blurHash in result', async () => {
  const result = await generateThumbnail(validImageBuffer, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 85,
    format: 'webp',
    fit: 'cover',
  });

  expect(result).toHaveProperty('blurHash');
  expect(typeof result.blurHash).toBe('string');
});

test('generateThumbnail preserves portrait aspect ratio (height > width)', async () => {
  const result = await generateThumbnail(portraitImageBuffer, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 85,
    format: 'webp',
    fit: 'inside',
  });

  expect(result.height).toBeGreaterThan(result.width);
  expect(result.width).toBe(100);
  expect(result.height).toBe(200);
});

test('generateThumbnail preserves landscape aspect ratio (width > height)', async () => {
  // Create a landscape image (200x100)
  const lWidth = 200;
  const lHeight = 100;
  const landscapeRaw = Buffer.alloc(lWidth * lHeight * 4);

  for (let y = 0; y < lHeight; y++) {
    for (let x = 0; x < lWidth; x++) {
      const offset = (y * lWidth + x) * 4;
      landscapeRaw[offset] = 200;
      landscapeRaw[offset + 1] = 100;
      landscapeRaw[offset + 2] = 50;
      landscapeRaw[offset + 3] = 255;
    }
  }

  const landscapeBuffer = await sharp(landscapeRaw, {
    raw: { width: lWidth, height: lHeight, channels: 4 },
  })
    .png()
    .toBuffer();

  const result = await generateThumbnail(landscapeBuffer, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 85,
    format: 'webp',
    fit: 'inside',
  });

  expect(result.width).toBeGreaterThan(result.height);
  expect(result.width).toBe(200);
  expect(result.height).toBe(100);
});
