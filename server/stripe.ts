import Stripe from "stripe";
import { env } from "process";

if (!env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function createCheckoutSession(items: any[], success_url: string, cancel_url: string) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: items.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.product.name,
          images: [item.product.imageUrl],
        },
        unit_amount: Math.round(item.product.price * 100),
      },
      quantity: item.quantity,
    })),
    mode: "payment",
    success_url,
    cancel_url,
  });

  return session;
}
