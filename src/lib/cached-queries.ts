/**
 * Cached database query functions for frequently-accessed data
 */

import { getOrSet, invalidateTag } from "./cache";
import { db } from "@/db";
import {
  systemStyles,
  userSubscriptions,
  userPreferences,
  subscriptionPlans,
} from "@/db/schema";
import { eq } from "drizzle-orm";

const CACHE_DURATIONS = {
  PRESETS: 3600, // 1 hour (rarely change)
  SUBSCRIPTIONS: 1800, // 30 minutes
  PREFERENCES: 1800, // 30 minutes
} as const;

/**
 * Get all system styles/presets with caching
 */
export async function getCachedPresets() {
  return getOrSet(
    "system:presets:all",
    async () => {
      return await db
        .select()
        .from(systemStyles)
        .where(eq(systemStyles.isActive, true));
    },
    {
      ttl: CACHE_DURATIONS.PRESETS,
      tags: ["presets"],
    },
  );
}

/**
 * Get user subscription with caching
 */
export async function getCachedUserSubscription(userId: string) {
  return getOrSet(
    `user:${userId}:subscription`,
    async () => {
      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .limit(1);

      return subscription || null;
    },
    {
      ttl: CACHE_DURATIONS.SUBSCRIPTIONS,
      tags: [userId, "subscription"],
    },
  );
}

/**
 * Get user preferences with caching
 */
export async function getCachedUserPreferences(userId: string) {
  return getOrSet(
    `user:${userId}:preferences`,
    async () => {
      const [prefs] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId))
        .limit(1);

      return prefs || null;
    },
    {
      ttl: CACHE_DURATIONS.PREFERENCES,
      tags: [userId, "preferences"],
    },
  );
}

/**
 * Get all subscription plans with caching
 */
export async function getCachedSubscriptionPlans() {
  return getOrSet(
    "system:subscription-plans:all",
    async () => {
      return await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.active, true));
    },
    {
      ttl: CACHE_DURATIONS.PRESETS,
      tags: ["subscription-plans"],
    },
  );
}

/**
 * Invalidate user-specific caches when user data changes
 */
export async function invalidateUserCache(userId: string) {
  // Invalidates: subscription, preferences, and any other user-tagged entries
  await invalidateTag(userId);
}

/**
 * Invalidate all presets when system styles change
 */
export async function invalidatePresetsCache() {
  await invalidateTag("presets");
}

/**
 * Invalidate all subscription plan caches
 */
export async function invalidateSubscriptionPlansCache() {
  await invalidateTag("subscription-plans");
}
