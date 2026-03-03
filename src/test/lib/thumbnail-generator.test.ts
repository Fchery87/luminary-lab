import { test, expect, beforeAll } from "bun:test";
import sharp from "sharp";
import { generateThumbnail } from "@/lib/thumbnail-generator";

// Create a valid test image buffer using Sharp
let validImageBuffer: Buffer;

beforeAll(async () => {
  // Create a simple 100x100 RGBA image
  const width = 100;
  const height = 100;
  const rawBuffer = Buffer.alloc(width * height * 4);

  // Fill with a gradient-like pattern (red to blue horizontally)
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
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
});

test("generateThumbnail should return blurHash in result", async () => {
  const result = await generateThumbnail(validImageBuffer, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 85,
    format: "webp",
    fit: "cover",
  });

  expect(result).toHaveProperty("blurHash");
  expect(typeof result.blurHash).toBe("string");
});
