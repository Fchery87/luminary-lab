import { db, subscriptionPlans, usageTracking, userSubscriptions } from '@/db';
import { v7 as uuidv7 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function seedSubscriptionPlans() {
  console.log('Seeding subscription plans...');

  const plans = [
    {
      id: uuidv7(),
      name: 'Free',
      stripePriceId: null,
      monthlyUploadLimit: 3,
      features: {
        uploadsPerMonth: 3,
        maxFileSize: '100MB',
        processing: 'Standard quality',
        exportFormats: ['JPEG', 'PNG'],
        support: 'Community',
      },
      active: true,
    },
    {
      id: uuidv7(),
      name: 'Pro',
      stripePriceId: null,
      monthlyUploadLimit: 50,
      features: {
        uploadsPerMonth: 50,
        maxFileSize: '100MB',
        processing: 'High quality',
        exportFormats: ['JPEG', 'PNG', 'TIFF'],
        support: 'Email',
      },
      active: true,
    },
    {
      id: uuidv7(),
      name: 'Studio',
      stripePriceId: null,
      monthlyUploadLimit: 200,
      features: {
        uploadsPerMonth: 200,
        maxFileSize: '100MB',
        processing: 'Ultra quality',
        exportFormats: ['JPEG', 'PNG', 'TIFF', 'RAW'],
        support: 'Priority',
      },
      active: true,
    },
  ];

  try {
    for (const plan of plans) {
      const existing = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, plan.name))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(subscriptionPlans).values(plan);
        console.log(`✅ Created ${plan.name} plan`);
      } else {
        console.log(`ℹ️  ${plan.name} plan already exists`);
      }
    }
    console.log('✅ Subscription plans seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.main) {
  seedSubscriptionPlans();
}
