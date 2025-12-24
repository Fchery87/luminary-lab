import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripeServer } from '@/lib/stripe';
import { db, userSubscriptions } from '@/db';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const requestHeaders = await headers();
  const signature = requestHeaders.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    const stripe = getStripeServer();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : 'Unknown Error'}`,
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      
      // Update database using Drizzle
      if (subscription.metadata?.userId) {
        await db.insert(userSubscriptions).values({
          id: subscription.id,
          userId: subscription.metadata.userId,
          planId: subscription.items.data[0].price.id,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          status: subscription.status,
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        }).onConflictDoUpdate({
          target: userSubscriptions.id,
          set: {
            status: subscription.status,
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          },
        });
      }
      
      break;
      
    case 'invoice.payment_succeeded':
      // Handle successful payment
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Payment succeeded for subscription:', (invoice as any).subscription);
      break;
      
    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      await db.update(userSubscriptions)
        .set({ status: 'canceled' })
        .where(eq(userSubscriptions.id, event.data.object.id));
      break;
  }

  return NextResponse.json({ received: true });
}
