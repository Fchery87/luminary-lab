import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb, schema } from '@/db';

type AuthInstance = ReturnType<typeof betterAuth>;

let authSingleton: AuthInstance | null = null;

export function getAuth(): AuthInstance {
  if (authSingleton) return authSingleton;

  const db = getDb();

  const socialProviders: Record<string, any> = {};
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    };
  }

  authSingleton = betterAuth({
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true,
      schema,
    }),
    advanced: {
      database: {
        generateId: 'uuid',
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    session: {
      expiresIn: 60 * 60, // 1 hour
      updateAge: 60 * 5, // 5 minutes
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
    account: {
      accountLinking: {
        enabled: false,
      },
    },
    ...(Object.keys(socialProviders).length
      ? { socialProviders }
      : {}),
  });

  return authSingleton;
}

export const auth = new Proxy(
  {},
  {
    get(_target, prop) {
      return (getAuth() as any)[prop];
    },
  }
) as unknown as AuthInstance;
