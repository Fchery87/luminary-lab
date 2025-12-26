import { db, usageTracking, users } from '@/db';
import { eq, and, gte, lte } from 'drizzle-orm';

async function resetUserUsage(email?: string) {
  if (!email) {
    console.error('Please provide email address');
    console.log('Usage: bun run scripts/reset-user-usage.ts <email>');
    process.exit(1);
  }

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get user ID from email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`Found user: ${user.id} (${user.email})`);

    // Find usage tracking record
    const existingUsage = await db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.userId, user.id),
          gte(usageTracking.periodStart, startOfMonth),
          lte(usageTracking.periodEnd, endOfMonth)
        )
      )
      .limit(1);

    if (existingUsage.length > 0) {
      await db
        .update(usageTracking)
        .set({ uploadCount: 0, updatedAt: new Date() })
        .where(eq(usageTracking.userId, user.id));

      console.log(`✅ Reset upload count for user: ${email}`);
      console.log(`   Previous uploads: ${existingUsage[0].uploadCount}`);
    } else {
      console.log(`ℹ️  No usage tracking record found for user: ${email}`);
    }
  } catch (error) {
    console.error('❌ Error resetting user usage:', error);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (import.meta.main) {
  resetUserUsage(email);
}
