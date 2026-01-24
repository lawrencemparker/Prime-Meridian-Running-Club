import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // REQUIRED for Stripe

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVICE ROLE REQUIRED
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      /**
       * ✅ SUBSCRIPTION CREATED / TRIAL STARTED
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!session.customer || !session.customer_email) break;

        const userEmail = session.customer_email;

        await supabase
          .from("profiles")
          .update({
            is_premium: true,
            stripe_customer_id: session.customer.toString(),
            updated_at: new Date().toISOString(),
          })
          .eq("email", userEmail);

        break;
      }

      /**
       * ❌ SUBSCRIPTION CANCELED
       */
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const customerId = subscription.customer.toString();

        await supabase
          .from("profiles")
          .update({
            is_premium: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      /**
       * 🔁 SUBSCRIPTION UPDATED (downgrade, pause, etc.)
       */
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const customerId = subscription.customer.toString();
        const isActive = subscription.status === "active" || subscription.status === "trialing";

        await supabase
          .from("profiles")
          .update({
            is_premium: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        break;
      }

      default:
        // Ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("❌ Webhook processing failed:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
