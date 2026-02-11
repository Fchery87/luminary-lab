import { test, expect } from 'bun:test';
import { images } from '@/db/schema';

test('images table should have blurHash column', () => {
  const columnNames = Object.keys(images);
  expect(columnNames).toContain('blurHash');
});
