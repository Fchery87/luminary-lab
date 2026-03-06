import { vi } from 'vitest';

export const createRedisMock = () => ({
  on: vi.fn((event: string, callback: Function) => {
    if (event === 'connect') {
      setTimeout(() => callback(), 0);
    }
  }),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  quit: vi.fn().mockResolvedValue('OK'),
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue('PONG'),
  expire: vi.fn().mockResolvedValue(1),
  ttl: vi.fn().mockResolvedValue(-1),
  incr: vi.fn().mockResolvedValue(1),
  decr: vi.fn().mockResolvedValue(0),
  exists: vi.fn().mockResolvedValue(0),
  keys: vi.fn().mockResolvedValue([]),
  hget: vi.fn().mockResolvedValue(null),
  hset: vi.fn().mockResolvedValue(1),
  hdel: vi.fn().mockResolvedValue(1),
  hgetall: vi.fn().mockResolvedValue({}),
  lpush: vi.fn().mockResolvedValue(1),
  rpush: vi.fn().mockResolvedValue(1),
  lpop: vi.fn().mockResolvedValue(null),
  rpop: vi.fn().mockResolvedValue(null),
  llen: vi.fn().mockResolvedValue(0),
  publish: vi.fn().mockResolvedValue(0),
  subscribe: vi.fn().mockResolvedValue(undefined),
});
