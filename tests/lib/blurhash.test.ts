import { test, expect, describe } from 'bun:test';
import { encode, decode } from 'blurhash';
import { encodeBlurHash } from '@/lib/blurhash';

describe('blurhash utilities', () => {
  test('blurhash should be importable', () => {
    expect(typeof encode).toBe('function');
    expect(typeof decode).toBe('function');
  });

  test('encodeBlurHash should generate a valid blur hash string', () => {
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
});
