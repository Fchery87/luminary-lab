import { test, expect, beforeAll } from "bun:test";
import sharp from "sharp";
import { extractPreviewFromUpload } from "@/lib/preview-extractor";

let validJpegBuffer: Buffer;

beforeAll(async () => {
  const width = 2000;
  const height = 1500;
  const rawBuffer = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      rawBuffer[offset] = Math.floor((x / width) * 255);
      rawBuffer[offset + 1] = 100;
      rawBuffer[offset + 2] = Math.floor((y / height) * 255);
      rawBuffer[offset + 3] = 255;
    }
  }

  validJpegBuffer = await sharp(rawBuffer, {
    raw: { width, height, channels: 4 },
  })
    .jpeg({ quality: 95 })
    .toBuffer();
});

test("extractPreviewFromUpload should handle JPEG and return preview", async () => {
  const result = await extractPreviewFromUpload(
    validJpegBuffer,
    "image/jpeg"
  );

  expect(result.hasPreview).toBe(true);
  expect(result.previewBuffer).toBeDefined();
  expect(result.previewBuffer!.length).toBeGreaterThan(0);
  // Either embedded (if under size limit) or generated (if resized)
  expect(["embedded", "generated"]).toContain(result.previewType || "");
});

test("extractPreviewFromUpload should resize large JPEG", async () => {
  const result = await extractPreviewFromUpload(validJpegBuffer, "image/jpeg", {
    maxPreviewWidth: 800,
    maxPreviewHeight: 600,
  });

  expect(result.hasPreview).toBe(true);
  expect(result.previewBuffer).toBeDefined();
  expect(result.previewType).toBe("generated");
  expect(result.method).toBe("resized");

  const metadata = await sharp(result.previewBuffer!).metadata();
  expect(metadata.width).toBeLessThanOrEqual(800);
  expect(metadata.height).toBeLessThanOrEqual(600);
});

test("extractPreviewFromUpload should convert PNG to JPEG preview", async () => {
  const pngBuffer = await sharp(validJpegBuffer).png().toBuffer();
  
  const result = await extractPreviewFromUpload(pngBuffer, "image/png");

  expect(result.hasPreview).toBe(true);
  expect(result.previewType).toBe("generated");
  expect(result.method).toBe("converted");

  const metadata = await sharp(result.previewBuffer!).metadata();
  expect(metadata.format).toBe("jpeg");
});

test("extractPreviewFromUpload should handle unknown MIME type", async () => {
  const result = await extractPreviewFromUpload(
    validJpegBuffer,
    "image/unknown"
  );

  expect(result.hasPreview).toBe(true);
  expect(result.previewType).toBe("generated");
});
