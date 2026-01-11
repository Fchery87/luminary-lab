import { test, expect, describe } from 'bun:test';
import { encode, decode } from 'blurhash';

describe('blurhash utilities', () => {
  test('blurhash should be importable', () => {
    expect(typeof encode).toBe('function');
    expect(typeof decode).toBe('function');
  });
});
