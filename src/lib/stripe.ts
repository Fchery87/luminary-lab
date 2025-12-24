import Stripe from 'stripe';

let stripeSingleton: Stripe | null = null;

export function getStripeServer(): Stripe {
  if (stripeSingleton) return stripeSingleton;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  stripeSingleton = new Stripe(secretKey, {
    apiVersion: '2025-11-17.clover',
    typescript: true,
  });

  return stripeSingleton;
}

export async function getStripeBrowser() {
  const { loadStripe } = await import('@stripe/stripe-js');
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return null;
  return loadStripe(publishableKey);
}
