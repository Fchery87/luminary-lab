import { db, usageTracking, userSubscriptions, subscriptionPlans, users } from '@/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

async function showUserUsage(email: string) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    console.log('='.repeat(60));
    console.log(`Usage Report for: ${email}`);
    console.log('='.repeat(60));

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

    console.log(`User ID: ${user.id}`);

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
          eq(userSubscriptions.userId, user.id),
          eq(userSubscriptions.status, 'active')
        )
      )
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    let monthlyLimit = 3; // Default Free tier
    let planName = 'Free';

    if (subscription) {
      monthlyLimit = subscription.monthlyUploadLimit;
      planName = subscription.planName;
      console.log(`\n📦 Subscription: ${planName}`);
      console.log(`   Status: ${subscription.status}`);
      if (subscription.currentPeriodEnd) {
        console.log(`   Period Ends: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`);
      }
    } else {
      console.log(`\n📦 Subscription: Free (no active subscription)`);
    }

    // Get current usage
    const [usage] = await db
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

    const currentUsage = usage?.uploadCount || 0;
    const remaining = Math.max(0, monthlyLimit - currentUsage);

    console.log(`\n📊 Monthly Usage (now: ${now.toLocaleDateString()})`);
    console.log(`   Period: ${startOfMonth.toLocaleDateString()} - ${endOfMonth.toLocaleDateString()}`);
    console.log(`   Used: ${currentUsage} / ${monthlyLimit}`);
    console.log(`   Remaining: ${remaining}`);
    console.log(`   Usage %: ${Math.round((currentUsage / monthlyLimit) * 100)}%`);

    // Progress bar
    const progress = Math.min(100, Math.round((currentUsage / monthlyLimit) * 100));
    const bar = '█'.repeat(Math.floor(progress / 5));
    const empty = '░'.repeat(20 - Math.floor(progress / 5));
    console.log(`   [${bar}${empty}] ${progress}%`);

    if (currentUsage >= monthlyLimit) {
      console.log('\n❌ You have reached your monthly upload limit!');
      console.log('💡 Upgrade your plan to continue uploading.');
    }

    console.log('\n' + '='.repeat(60));

    return {
      planName,
      monthlyLimit,
      currentUsage,
      remaining,
      canUpload: currentUsage < monthlyLimit,
    };
  } catch (error) {
    console.error('❌ Error fetching usage:', error);
    process.exit(1);
  }
}

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('Please provide email address');
  console.log('Usage: bun run scripts/show-user-usage.ts <email>');
  process.exit(1);
}

if (import.meta.main) {
  showUserUsage(email);
}
