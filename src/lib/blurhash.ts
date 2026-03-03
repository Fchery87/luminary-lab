import { encode as blurhashEncode, decode as blurhashDecode } from "blurhash";

/**
 * Encode image pixels to blur hash string
 */
export function encodeBlurHash(
  width: number,
  height: number,
  pixels: Uint8ClampedArray,
): string {
  return blurhashEncode(new Uint8ClampedArray(pixels), width, height, 4, 4);
}

/**
 * Decode blur hash to base64 data URL for immediate display
 */
export async function decodeBlurHashToDataUrl(
  blurHash: string,
  width = 32,
  height = 32,
): Promise<string> {
  const pixels = blurhashDecode(blurHash, width, height);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  const imageData = ctx.createImageData(width, height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);

  const blob = await canvas.convertToBlob();
  return URL.createObjectURL(blob);
}

/**
 * Decode blur hash to RGBA pixels array for canvas rendering
 */
export function decodeBlurHashToPixels(
  blurHash: string,
  width: number,
  height: number,
): Uint8ClampedArray {
  return blurhashDecode(blurHash, width, height);
}
