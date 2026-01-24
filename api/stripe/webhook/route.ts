// app/api/stripe/webhook/route.ts
import Stripe from "stripe";

export const runtime = "nodejs";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function supabaseAdminUpdateProfile(args: {
  userId: string;
  isPremium: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const SUPABASE_URL = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
  const SERVICE_KEY = mustEnv("SUPABASE_SERVICE_ROLE_KEY");

  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${args.userId}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      is_premium: args.isPremium,
      stripe_customer_id: args.stripeCustomerId ?? null,
      stripe_subscription_id: args.stripeSubscriptionId ?? null,
      premium_since: args.isPremium ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Supabase admin update failed: ${res.status} ${t}`);
  }
}

export async function POST(req: Request) {
  try {
    const STRIPE_SECRET_KEY = mustEnv("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = mustEnv("STRIPE_WEBHOOK_SECRET");
    const stripe = new Stripe(STRIPE_SECRET_KEY);

    const signature = req.headers.get("stripe-signature");
    if (!signature) return new Response("Missing stripe-signature", { status: 400 });

    // Stripe requires raw body for signature verification
    const payload = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error("Webhook signature verify failed:", err?.message);
      return new Response(`Webhook Error: ${err?.message}`, { status: 400 });
    }

    // --- Premium state changes (critical) ---
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // We set this during checkout creation
      const userId =
        (session.client_reference_id as string | null) ||
        (session.metadata?.user_id as string | undefined) ||
        (session.subscription_details?.metadata?.user_id as string | undefined);

      if (userId) {
        const stripeCustomerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;

        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        await supabaseAdminUpdateProfile({
          userId,
          isPremium: true,
          stripeCustomerId: stripeCustomerId ?? null,
          stripeSubscriptionId: stripeSubscriptionId ?? null,
        });
      } else {
        console.warn("checkout.session.completed missing user id; cannot upgrade profile");
      }
    }

    // If a subscription is canceled or ends, set premium false.
    if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const userId = (sub.metadata?.user_id as string | undefined) || "";

      // Conservative downgrade rule:
      // - deleted => definitely not premium
      // - updated => not premium if status is not active/trialing
      const status = sub.status; // active | trialing | past_due | canceled | unpaid | ...
      const shouldBePremium =
        event.type === "customer.subscription.updated"
          ? status === "active" || status === "trialing"
          : false;

      if (userId) {
        await supabaseAdminUpdateProfile({
          userId,
          isPremium: shouldBePremium,
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null,
          stripeSubscriptionId: sub.id ?? null,
        });
      }
    }

    return new Response("ok", { status: 200 });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
