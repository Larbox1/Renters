import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe, lookupPrice } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe signature verification needs the raw, unparsed body, so this route
// must run on the Node runtime (not edge) and we read request.text() directly.
export const runtime = "nodejs";

// A subscription grants its paid tier while it's live; anything else (canceled,
// unpaid, incomplete) drops the owner back to free.
const ACTIVE_STATUSES = new Set<Stripe.Subscription.Status>([
  "active",
  "trialing",
  "past_due",
]);

function periodEndISO(sub: Stripe.Subscription): string | null {
  // current_period_end is seconds since epoch; newer API versions surface it
  // per-item, so fall back to the first item.
  const seconds =
    (sub as { current_period_end?: number }).current_period_end ??
    sub.items.data[0]?.current_period_end ??
    null;
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Writes a subscription's state onto the owning profile (matched by Stripe
 * customer id). Uses the service-role client so it bypasses RLS and the
 * billing-column guard trigger.
 */
async function syncSubscription(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price.id;
  const matched = lookupPrice(priceId);
  const isActive = ACTIVE_STATUSES.has(sub.status) && matched !== null;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      plan: isActive ? matched.plan : "free",
      plan_interval: isActive ? matched.interval : null,
      stripe_subscription_id: sub.status === "canceled" ? null : sub.id,
      subscription_status: sub.status,
      plan_current_period_end: periodEndISO(sub),
      plan_cancel_at_period_end: sub.cancel_at_period_end ?? false,
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("[stripe.webhook] profile update failed:", error);
    throw error;
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe.webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch (err) {
    console.error("[stripe.webhook] signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // The customer id is set on the profile when we create the session,
        // but re-assert it here in case the row was created customer-first.
        if (session.subscription && session.customer) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    // Returning 500 makes Stripe retry with backoff, which is what we want for
    // a transient DB failure.
    console.error(`[stripe.webhook] handler for ${event.type} failed:`, err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
