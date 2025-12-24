import { NextRequest, NextResponse } from 'next/server';
import { getStripeServer } from '@/lib/stripe';
import { auth } from '@/lib/auth';
import { z } from 'zod';

const checkoutSchema = z.object({
  priceId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const userSession = await auth.api.getSession({
      headers: request.headers,
    });

    if (!userSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = checkoutSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error },
        { status: 400 }
      );
    }

    const { priceId } = validated.data;

    try {
      const stripe = getStripeServer();
      const stripeSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
        customer_email: userSession.user.email,
        metadata: {
          userId: userSession.user.id,
        },
      });

      return NextResponse.json({ sessionId: stripeSession.id });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
