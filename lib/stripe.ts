import Stripe from "stripe";
import { type PlanId, type BillingInterval, isPlanId } from "./plans";

/**
 * Server-only Stripe helpers. Never import this from a client component — it
 * reads the secret key. The publishable key is unused: we use Stripe-hosted
 * Checkout and the Customer Portal, so the browser only ever follows a
 * server-issued redirect URL.
 */

// The three paid tiers map to recurring Prices created in the Stripe
// dashboard. `free` has no Price (it's the absence of a subscription). Each
// tier has a monthly and an annual Price.
type PaidPlanId = Exclude<PlanId, "free">;

const PRICE_ENV: Record<PaidPlanId, Record<BillingInterval, string>> = {
  plus: { month: "STRIPE_PRICE_PLUS", year: "STRIPE_PRICE_PLUS_ANNUAL" },
  pro: { month: "STRIPE_PRICE_PRO", year: "STRIPE_PRICE_PRO_ANNUAL" },
  unlimited: {
    month: "STRIPE_PRICE_UNLIMITED",
    year: "STRIPE_PRICE_UNLIMITED_ANNUAL",
  },
};

let cached: Stripe | null = null;

/** Returns a singleton Stripe client, or throws if the secret key is unset. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Add it to .env.local (see .env.example).",
    );
  }
  if (!cached) {
    // No apiVersion pin: the SDK uses the account's default version, which
    // avoids a hard mismatch when the dashboard version drifts.
    cached = new Stripe(key);
  }
  return cached;
}

export function hasStripeEnv(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.STRIPE_PRICE_PLUS &&
      process.env.STRIPE_PRICE_PRO &&
      process.env.STRIPE_PRICE_UNLIMITED &&
      process.env.STRIPE_PRICE_PLUS_ANNUAL &&
      process.env.STRIPE_PRICE_PRO_ANNUAL &&
      process.env.STRIPE_PRICE_UNLIMITED_ANNUAL,
  );
}

/**
 * Stripe Price ID for a paid plan + cadence, or throws if that env var is
 * unset.
 */
export function priceIdForPlan(
  plan: PaidPlanId,
  interval: BillingInterval,
): string {
  const envName = PRICE_ENV[plan][interval];
  const id = process.env[envName];
  if (!id) {
    throw new Error(
      `${envName} is not set. Create the "${plan}" ${interval}ly recurring Price in Stripe and add its ID.`,
    );
  }
  return id;
}

/**
 * Resolves a Stripe Price ID back to a plan + cadence, or null if it doesn't
 * match any configured tier (e.g. a Price from another product).
 */
export function lookupPrice(
  priceId: string | null | undefined,
): { plan: PlanId; interval: BillingInterval } | null {
  if (!priceId) return null;
  for (const plan of ["plus", "pro", "unlimited"] as const) {
    for (const interval of ["month", "year"] as const) {
      if (process.env[PRICE_ENV[plan][interval]] === priceId) {
        return { plan, interval };
      }
    }
  }
  return null;
}

export { isPlanId };
