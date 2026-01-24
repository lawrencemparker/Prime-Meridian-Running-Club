// app/api/stripe/checkout/route.ts
import Stripe from "stripe";

export const runtime = "nodejs";

type CheckoutBody = {
  next?: string; // where to send user after successful upgrade
  userId?: string; // optional - passed from client for reference
  email?: string; // optional - passed from client for reference
};

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function safeNextPath(next?: string) {
  // Only allow relative next paths
  if (!next) return "/home";
  if (!next.startsWith("/")) return "/home";
  if (next.startsWith("//")) return "/home";
  return next;
}

export async function POST(req: Request) {
  try {
    const STRIPE_SECRET_KEY = mustEnv("STRIPE_SECRET_KEY");
    const STRIPE_PRICE_ID = mustEnv("STRIPE_PRICE_ID");
    const APP_URL = mustEnv("NEXT_PUBLIC_APP_URL");

    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const body = (await req.json()) as CheckoutBody;
    const nextPath = safeNextPath(body.next);

    const successUrl = `${APP_URL}/premium/success?next=${encodeURIComponent(
      nextPath
    )}&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = `${APP_URL}/premium?canceled=1&next=${encodeURIComponent(
      nextPath
    )}`;

    // IMPORTANT: 7-day trial is enforced here.
    // This creates a subscription Checkout Session.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,

      // Optional but useful:
      customer_email: body.email || undefined,
      client_reference_id: body.userId || undefined,

      subscription_data: {
        trial_period_days: 7,
        metadata: {
          user_id: body.userId || "",
        },
      },

      metadata: {
        user_id: body.userId || "",
      },
    });

    return Response.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Checkout failed" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
