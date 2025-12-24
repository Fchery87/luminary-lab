import { auth } from '@/lib/auth';
import { db, usageTracking, userSubscriptions, subscriptionPlans } from '@/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { NextRequest } from 'next/server';

interface UsageLimits {
  monthlyUploadLimit: number;
  currentUsage: number;
  remainingUploads: number;
  planName: string;
  canUpload: boolean;
}

export async function checkUsageLimits(request: NextRequest): Promise<{ 
  success: boolean; 
  limits?: UsageLimits; 
  error?: string; 
  status?: number;
}> {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401
      };
    }

    const userId = session.user.id;

    // Get user's active subscription
    const [subscription] = await db
      .select({
        planId: userSubscriptions.planId,
        status: userSubscriptions.status,
        currentPeriodEnd: userSubscriptions.currentPeriodEnd,
        planName: subscriptionPlans.name,
        monthlyUploadLimit: subscriptionPlans.monthlyUploadLimit,
        features: subscriptionPlans.features,
      })
      .from(userSubscriptions)
      .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, 'active')
        )
      )
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    // If no active subscription, get free tier limits
    if (!subscription) {
      const [freePlan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, 'Free'))
        .limit(1);

      if (!freePlan) {
        return {
          success: false,
          error: 'No subscription plans available',
          status: 500
        };
      }

      const currentUsage = await getCurrentMonthlyUsage(userId, freePlan.id);
      const usageCount = currentUsage.uploadCount || 0;
      
      return {
        success: usageCount < freePlan.monthlyUploadLimit,
        limits: {
          monthlyUploadLimit: freePlan.monthlyUploadLimit,
          currentUsage: usageCount,
          remainingUploads: Math.max(0, freePlan.monthlyUploadLimit - usageCount),
          planName: freePlan.name,
          canUpload: usageCount < freePlan.monthlyUploadLimit,
        }
      };
    }

    // Check if subscription is still valid
    if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) < new Date()) {
      return {
        success: false,
        error: 'Subscription expired',
        status: 402
      };
    }

    // Get current usage for the subscription period
    const currentUsage = await getCurrentMonthlyUsage(userId, subscription.planId);
    const usageCount = currentUsage.uploadCount || 0;

    const canUpload = usageCount < subscription.monthlyUploadLimit;

    return {
      success: canUpload,
      limits: {
        monthlyUploadLimit: subscription.monthlyUploadLimit,
        currentUsage: usageCount,
        remainingUploads: Math.max(0, subscription.monthlyUploadLimit - usageCount),
        planName: subscription.planName,
        canUpload,
      },
      error: canUpload ? undefined : `Monthly upload limit (${subscription.monthlyUploadLimit}) exceeded`,
      status: canUpload ? undefined : 429
    };

  } catch (error) {
    console.error('Usage limits check error:', error);
    return {
      success: false,
      error: 'Failed to check usage limits',
      status: 500
    };
  }
}

async function getCurrentMonthlyUsage(userId: string, planId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Try to get existing usage tracking record
  const [existingUsage] = await db
    .select()
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.userId, userId),
        gte(usageTracking.periodStart, startOfMonth),
        lte(usageTracking.periodEnd, endOfMonth)
      )
    )
    .limit(1);

  if (existingUsage) {
    return existingUsage;
  }

  // Create new usage tracking record
  const [newUsage] = await db
    .insert(usageTracking)
    .values({
      userId,
      periodStart: startOfMonth,
      periodEnd: endOfMonth,
      uploadCount: 0,
    })
    .returning();

  return newUsage;
}

export async function incrementUsage(userId: string): Promise<void> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  await db
    .update(usageTracking)
    .set({
      uploadCount: sql`${usageTracking.uploadCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(usageTracking.userId, userId),
        gte(usageTracking.periodStart, startOfMonth),
        lte(usageTracking.periodEnd, endOfMonth)
      )
    );
}

// Middleware wrapper for API routes
export function withUsageLimits(handler: (req: NextRequest) => Promise<Response>) {
  return async (request: NextRequest) => {
    const usageCheck = await checkUsageLimits(request);

    if (!usageCheck.success) {
      return Response.json(
        { 
          error: usageCheck.error,
          limits: usageCheck.limits,
          code: 'USAGE_LIMIT_EXCEEDED'
        },
        { status: usageCheck.status || 429 }
      );
    }

    // Add usage limits info to request headers for downstream use
    const modifiedRequest = new Request(request.url, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'x-usage-limits': JSON.stringify(usageCheck.limits),
      },
      body: request.body,
    });

    const response = await handler(modifiedRequest as any);

    // If the upload was successful, increment usage
    if (response.ok && request.method === 'POST') {
      try {
        const session = await auth.api.getSession({
          headers: request.headers,
        });
        if (session) {
          await incrementUsage(session.user.id);
        }
      } catch (error) {
        console.error('Failed to increment usage:', error);
        // Don't fail the request if usage tracking fails
      }
    }

    return response;
  };
}
