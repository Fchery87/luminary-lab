import { createAuthClient } from "better-auth/react";

const DEV_BYPASS_ENABLED = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

const DEV_BYPASS_USER = {
  id: "dev-user-123",
  email: "dev@localhost",
  name: "Development User",
  emailVerified: true,
  image: null,
};

const DEV_BYPASS_SESSION = {
  id: "dev-session-123",
  userId: "dev-user-123",
  token: "dev-token-123",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ipAddress: "127.0.0.1",
  userAgent: "Dev Bypass",
};

const baseClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

// Create bypass wrapper
export const authClient = new Proxy(baseClient, {
  get(target, prop) {
    const value = (target as any)[prop];
    
    // Intercept useSession hook
    if (prop === "useSession" && DEV_BYPASS_ENABLED) {
      return () => ({
        data: {
          user: DEV_BYPASS_USER,
          session: DEV_BYPASS_SESSION,
        },
        isPending: false,
        error: null,
        refetch: () => Promise.resolve({
          user: DEV_BYPASS_USER,
          session: DEV_BYPASS_SESSION,
        }),
      });
    }
    
    // Intercept getSession method
    if (prop === "getSession" && DEV_BYPASS_ENABLED) {
      return async () => ({
        data: {
          user: DEV_BYPASS_USER,
          session: DEV_BYPASS_SESSION,
        },
        error: null,
      });
    }
    
    return value;
  },
}) as typeof baseClient;
