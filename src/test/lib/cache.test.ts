import { describe, it, expect, beforeEach } from 'vitest';
import { getCached, setCached, delCached, getOrSet, invalidateTag, clearCache } from '@/lib/cache';

describe('cache', () => {
  beforeEach(async () => {
    await clearCache();
  });

  it('should set and get cached value', async () => {
    await setCached('key1', 'value1');
    const result = await getCached('key1');
    expect(result).toBe('value1');
  });

  it('should return null for missing key', async () => {
    const result = await getCached('missing');
    expect(result).toBeNull();
  });

  it('should delete cached value', async () => {
    await setCached('key1', 'value1');
    await delCached('key1');
    const result = await getCached('key1');
    expect(result).toBeNull();
  });

  it('should respect TTL expiration', async () => {
    await setCached('key1', 'value1', { ttl: 1 }); // 1 second
    expect(await getCached('key1')).toBe('value1');
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(await getCached('key1')).toBeNull();
  });

  it('should cache with tags for invalidation', async () => {
    await setCached('user:1:prefs', { theme: 'dark' }, { tags: ['user:1', 'prefs'] });
    expect(await getCached('user:1:prefs')).toEqual({ theme: 'dark' });
  });

  it('should invalidate by tag', async () => {
    await setCached('user:1:prefs', { theme: 'dark' }, { tags: ['user:1'] });
    await setCached('user:1:settings', { lang: 'en' }, { tags: ['user:1'] });
    await setCached('user:2:prefs', { theme: 'light' }, { tags: ['user:2'] });
    
    await invalidateTag('user:1');
    
    expect(await getCached('user:1:prefs')).toBeNull();
    expect(await getCached('user:1:settings')).toBeNull();
    expect(await getCached('user:2:prefs')).toEqual({ theme: 'light' });
  });

  it('should support getOrSet pattern', async () => {
    let callCount = 0;
    const fetcher = async () => {
      callCount++;
      return 'value1';
    };

    const result1 = await getOrSet('key1', fetcher);
    const result2 = await getOrSet('key1', fetcher);
    
    expect(result1).toBe('value1');
    expect(result2).toBe('value1');
    expect(callCount).toBe(1); // Called only once
  });

  it('should handle complex objects', async () => {
    const obj = { id: 1, name: 'test', nested: { key: 'value' } };
    await setCached('obj', obj);
    const result = await getCached('obj');
    expect(result).toEqual(obj);
  });
});
