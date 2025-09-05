import Stripe from "stripe";
import { env } from "process";

if (!env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

// Add logging to see what key format we're using (only first 8 chars for security)
const keyPrefix = env.STRIPE_SECRET_KEY.substring(0, 8);
console.log("Using Stripe key with prefix:", keyPrefix);

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
});

export async function createCheckoutSession(items: any[], success_url: string, cancel_url: string, userId: number) {
  console.log("Creating Stripe checkout session with params:", {
    items: items.map(i => ({ name: i.name, quantity: i.quantity })),
    success_url,
    cancel_url,
    userId
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name
          
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
    mode: "payment",
    success_url,
    cancel_url,
    client_reference_id: userId.toString(),
    metadata: {
      userId: userId.toString()
    }
  });

  console.log("Stripe session created:", {
    sessionId: session.id,
    clientReferenceId: session.client_reference_id,
    metadata: session.metadata
  });

  return session;
}
