import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let dbSingleton: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (dbSingleton) return dbSingleton;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const sql = neon(databaseUrl);
  dbSingleton = drizzle(sql, { schema });
  return dbSingleton;
}

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      return (getDb() as any)[prop];
    },
  }
) as unknown as ReturnType<typeof drizzle<typeof schema>>;

export * from './schema';
export { schema };
