import { NextResponse } from "next/server";
import { Redis } from "ioredis";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";

interface HealthCheck {
  name: string;
  healthy: boolean;
  latency: number;
  error?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    return {
      name: "database",
      healthy: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "database",
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return {
        name: "redis",
        healthy: false,
        latency: 0,
        error: "REDIS_URL not configured",
      };
    }

    const redis = new Redis(redisUrl, {
      connectTimeout: 5000,
      commandTimeout: 3000,
    });

    await redis.ping();
    await redis.quit();

    return {
      name: "redis",
      healthy: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "redis",
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkS3(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const region = process.env.AWS_REGION || "us-east-1";
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });

    // For R2, we use a different check
    if (process.env.CLOUDFLARE_R2_ACCOUNT_ID) {
      const r2Client = new S3Client({
        region: "auto",
        endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
        },
      });

      await r2Client.send(new ListBucketsCommand({}));
    } else {
      await s3Client.send(new ListBucketsCommand({}));
    }

    return {
      name: "storage",
      healthy: true,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "storage",
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function checkEnvironment(): Promise<HealthCheck> {
  const start = Date.now();
  const requiredVars = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "NEXT_PUBLIC_APP_URL",
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    return {
      name: "environment",
      healthy: false,
      latency: Date.now() - start,
      error: `Missing required environment variables: ${missing.join(", ")}`,
    };
  }

  return {
    name: "environment",
    healthy: true,
    latency: Date.now() - start,
  };
}

export async function GET() {
  const start = Date.now();

  // Run all health checks in parallel
  const [dbCheck, redisCheck, s3Check, envCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkS3(),
    checkEnvironment(),
  ]);

  const checks = [dbCheck, redisCheck, s3Check, envCheck];
  const allHealthy = checks.every((check) => check.healthy);

  const response = {
    status: allHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "unknown",
    uptime: process.uptime(),
    totalLatency: Date.now() - start,
    checks: checks.reduce(
      (acc, check) => ({
        ...acc,
        [check.name]: {
          healthy: check.healthy,
          latency: `${check.latency}ms`,
          ...(check.error && { error: check.error }),
        },
      }),
      {}
    ),
  };

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

// Also support HEAD requests for load balancers
export async function HEAD() {
  const dbCheck = await checkDatabase();
  const status = dbCheck.healthy ? 200 : 503;

  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
