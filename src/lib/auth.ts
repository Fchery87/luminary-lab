import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, schema } from "@/db";

// Development bypass - allows testing without authentication
const DEV_BYPASS_ENABLED = process.env.DEV_BYPASS_AUTH === "true";
const DEV_BYPASS_USER = {
  id: "dev-user-123",
  email: "dev@localhost",
  name: "Development User",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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
      provider: "pg",
      usePlural: true,
      schema,
    }),
    advanced: {
      database: {
        generateId: "uuid",
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
    ...(Object.keys(socialProviders).length ? { socialProviders } : {}),
  });

  return authSingleton;
}

const authInstance = new Proxy(
  {},
  {
    get(_target, prop) {
      return (getAuth() as any)[prop];
    },
  },
) as unknown as AuthInstance;

// Development bypass wrapper for getSession
export const auth = new Proxy(authInstance, {
  get(target, prop) {
    const value = (target as any)[prop];
    
    // Intercept getSession for development bypass
    if (prop === "api" && DEV_BYPASS_ENABLED) {
      return new Proxy(value, {
        get(apiTarget, apiProp) {
          if (apiProp === "getSession") {
            return async (ctx: any) => {
              // Check for bypass cookie
              const headers = ctx?.headers;
              const bypassCookie = headers?.get?.("cookie")?.includes("dev_bypass_user");
              
              if (bypassCookie || DEV_BYPASS_ENABLED) {
                return {
                  user: DEV_BYPASS_USER,
                  session: {
                    id: "dev-session-123",
                    token: "dev-token-123",
                    userId: DEV_BYPASS_USER.id,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                };
              }
              
              return apiTarget.getSession(ctx);
            };
          }
          return apiTarget[apiProp];
        },
      });
    }
    
    return value;
  },
}) as AuthInstance;
