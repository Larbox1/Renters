// RevenueCat webhook — mirrors the Stripe webhook (app/api/stripe/webhook) for
// store purchases (Google Play now, App Store when the iOS app ships).
//
// RevenueCat POSTs { api_version, event } for every subscription lifecycle
// event; app_user_id is the Supabase auth user id (set via Purchases.logIn).
// The service-role client writes the billing columns, bypassing RLS and the
// protect_billing_columns trigger.
//
// Auth: RevenueCat sends the literal value configured in its dashboard as the
// Authorization header; it must equal REVENUECAT_WEBHOOK_SECRET.
// Deploy with verify_jwt disabled (RevenueCat has no Supabase JWT).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PlanId = "plus" | "pro" | "unlimited";
const PLAN_IDS = new Set(["plus", "pro", "unlimited"]);

interface RCEvent {
  id?: string;
  type: string;
  store?: string;
  app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  new_product_id?: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
}

// Constant-time secret comparison: SHA-256 both sides (so lengths match and
// the raw secret never influences timing), then compare digests byte-by-byte
// without early exit.
async function secretsMatch(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const STORE_TO_PROVIDER: Record<string, "play" | "app_store"> = {
  PLAY_STORE: "play",
  APP_STORE: "app_store",
  MAC_APP_STORE: "app_store",
};

// Play products reach RevenueCat as "<subscription>:<base-plan>", e.g.
// "plus:monthly" / "pro:annual"; App Store ids will follow "<plan>_<cycle>".
function parseProduct(
  productId: string | undefined,
  entitlements: string[] | null | undefined,
): { plan: PlanId; interval: "month" | "year" } | null {
  const idPart = (productId ?? "").toLowerCase();
  const planFromProduct = idPart.split(/[:_.]/)[0];
  const plan = PLAN_IDS.has(planFromProduct)
    ? (planFromProduct as PlanId)
    : ((entitlements ?? []).find((e) => PLAN_IDS.has(e)) as PlanId | undefined);
  if (!plan) return null;
  const interval = /annual|year/.test(idPart) ? "year" : "month";
  return { plan, interval };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ACTIVE_STRIPE_STATUSES = new Set(["active", "trialing", "past_due"]);

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[rc-webhook] REVENUECAT_WEBHOOK_SECRET not set");
    return json({ error: "server_misconfigured" }, 500);
  }
  if (!(await secretsMatch(req.headers.get("Authorization") ?? "", secret))) {
    return json({ error: "unauthorized" }, 401);
  }

  let event: RCEvent;
  try {
    event = (await req.json())?.event ?? {};
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (event.type === "TEST") return json({ received: true });

  // Resolve the Supabase user id: app_user_id unless it's an anonymous
  // RevenueCat id, in which case try the aliases.
  const isReal = (id?: string) => !!id && !id.startsWith("$RCAnonymousID:");
  const userId = isReal(event.app_user_id)
    ? event.app_user_id!
    : (event.aliases ?? []).find(isReal);
  if (!userId) {
    console.warn("[rc-webhook] no identified user on event", event.type);
    return json({ received: true, skipped: "anonymous" });
  }

  const provider = STORE_TO_PROVIDER[event.store ?? ""];
  if (!provider) {
    // Stripe/promotional events are not this pipeline's job.
    return json({ received: true, skipped: `store:${event.store}` });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Idempotency: even a holder of the secret can only apply each event once.
  // event.id is unique per RevenueCat delivery; a replayed body is dropped.
  if (event.id) {
    const { data: inserted, error: idemErr } = await admin
      .from("webhook_events")
      .upsert(
        { event_id: event.id, source: "revenuecat" },
        { onConflict: "event_id", ignoreDuplicates: true },
      )
      .select("event_id");
    if (idemErr) {
      console.error("[rc-webhook] idempotency write failed:", idemErr);
      return json({ error: "idempotency_failed" }, 500);
    }
    if (!inserted || inserted.length === 0) {
      return json({ received: true, skipped: "duplicate" });
    }
  }

  // Coexistence guard: a live Stripe subscription owns the profile's plan.
  const { data: profile, error: readErr } = await admin
    .from("profiles")
    .select("plan_provider, subscription_status, stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();
  if (readErr) {
    console.error("[rc-webhook] profile read failed:", readErr);
    return json({ error: "profile_read_failed" }, 500);
  }
  if (!profile) {
    console.warn("[rc-webhook] no profile for", userId);
    return json({ received: true, skipped: "no_profile" });
  }
  if (
    profile.plan_provider === "stripe" &&
    profile.stripe_subscription_id &&
    ACTIVE_STRIPE_STATUSES.has(profile.subscription_status ?? "")
  ) {
    console.warn("[rc-webhook] ignoring event; Stripe sub active for", userId);
    return json({ received: true, skipped: "stripe_active" });
  }

  const periodEnd = event.expiration_at_ms
    ? new Date(event.expiration_at_ms).toISOString()
    : null;

  let update: Record<string, unknown> | null = null;
  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "SUBSCRIPTION_EXTENDED":
    case "PRODUCT_CHANGE": {
      const parsed = parseProduct(
        event.type === "PRODUCT_CHANGE"
          ? (event.new_product_id ?? event.product_id)
          : event.product_id,
        event.entitlement_ids,
      );
      if (!parsed) {
        console.error("[rc-webhook] unmapped product:", event.product_id);
        return json({ error: "unmapped_product" }, 500);
      }
      update = {
        plan: parsed.plan,
        plan_interval: parsed.interval,
        plan_provider: provider,
        subscription_status: "active",
        plan_current_period_end: periodEnd,
        plan_cancel_at_period_end: false,
      };
      break;
    }
    case "CANCELLATION":
      // Auto-renew turned off; the entitlement runs until the period's end.
      update = { plan_cancel_at_period_end: true };
      break;
    case "BILLING_ISSUE":
      update = { subscription_status: "past_due" };
      break;
    case "EXPIRATION":
      update = {
        plan: "free",
        plan_interval: null,
        plan_provider: null,
        subscription_status: "expired",
        plan_current_period_end: null,
        plan_cancel_at_period_end: false,
      };
      break;
    default:
      // TRANSFER, NON_RENEWING_PURCHASE, etc. — acknowledged, unhandled.
      return json({ received: true, skipped: event.type });
  }

  const { error: updateErr } = await admin
    .from("profiles")
    .update(update)
    .eq("id", userId);
  if (updateErr) {
    // Non-2xx makes RevenueCat retry with backoff — right for transient
    // DB failures.
    console.error("[rc-webhook] profile update failed:", updateErr);
    return json({ error: "update_failed" }, 500);
  }

  return json({ received: true });
});
