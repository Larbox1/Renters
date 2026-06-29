"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/current-user";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isPlanId, isBillingInterval } from "@/lib/plans";
import {
  getStripe,
  hasStripeEnv,
  priceIdForPlan,
} from "@/lib/stripe";
import type { CurrentSession } from "@/lib/auth/current-user";

export type ProfileState = { error?: string; saved?: boolean };

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

function nullableString(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed || null;
}

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const firstName = nullableString(String(formData.get("first_name") ?? ""));
  const lastName = nullableString(String(formData.get("last_name") ?? ""));

  // Keep full_name in sync when both halves are present, since other
  // surfaces (lease contract, tenant invite emails) still read it.
  const full_name =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : (firstName ?? lastName ?? null);

  const { error } = await session.supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name,
      address: nullableString(String(formData.get("address") ?? "")),
      city: nullableString(String(formData.get("city") ?? "")),
      postal_code: nullableString(String(formData.get("postal_code") ?? "")),
      country: nullableString(String(formData.get("country") ?? "")),
      phone: nullableString(String(formData.get("phone") ?? "")),
    })
    .eq("id", session.user.id);

  if (error) return { error: error.message };

  revalidatePath(`/${locale}/dashboard/settings`);
  return { saved: true };
}

/**
 * Returns the owner's Stripe customer id, creating the customer (and storing
 * the id on the profile) on first use. Writes go through the admin client
 * because the billing-column guard trigger blocks the user from setting
 * stripe_customer_id on their own row.
 */
async function ensureStripeCustomer(session: CurrentSession): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", session.user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>();
  if (data?.stripe_customer_id) return data.stripe_customer_id;

  const customer = await getStripe().customers.create({
    email: session.user.email ?? undefined,
    name: session.fullName || undefined,
    metadata: { supabase_user_id: session.user.id },
  });
  await admin
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", session.user.id);
  return customer.id;
}

/**
 * Starts a Stripe Checkout session for one of the paid tiers and redirects the
 * owner to the hosted payment page. The webhook (not this action) writes the
 * resulting plan onto the profile once payment succeeds. Owner-only.
 */
export async function startCheckoutAction(formData: FormData) {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const plan = String(formData.get("plan") ?? "");
  const rawInterval = String(formData.get("interval") ?? "month");
  const interval = isBillingInterval(rawInterval) ? rawInterval : "month";
  if (session.role !== "owner" || !isPlanId(plan) || plan === "free") {
    redirect(`/${locale}/dashboard/settings`);
  }
  if (!hasStripeEnv()) {
    console.error("[settings.startCheckout] Stripe env not configured");
    redirect(`/${locale}/dashboard/settings?billing=unconfigured`);
  }

  const settingsUrl = `${getSiteUrl()}/${locale}/dashboard/settings`;
  const customerId = await ensureStripeCustomer(session);

  // Guard against creating a second subscription. The UI normally hides
  // Checkout once subscribed, but if the profile is briefly out of sync with
  // Stripe (e.g. a missed webhook) the buttons could still show — so check the
  // source of truth and route an already-subscribed owner to the portal.
  const active = await getStripe().subscriptions.list({
    customer: customerId,
    status: "active",
    limit: 1,
  });
  if (active.data.length > 0) {
    const portal = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: settingsUrl,
    });
    redirect(portal.url);
  }

  const checkout = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: session.user.id,
    line_items: [{ price: priceIdForPlan(plan, interval), quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${settingsUrl}?billing=success`,
    cancel_url: `${settingsUrl}?billing=canceled`,
  });

  if (!checkout.url) {
    console.error("[settings.startCheckout] Checkout session has no URL");
    redirect(`${settingsUrl}?billing=error`);
  }
  redirect(checkout.url);
}

/**
 * Opens the Stripe Customer Portal so a subscribed owner can switch tiers,
 * update their card, or cancel (which drops them to free at period end, per
 * the portal's configuration). Owner-only; no-ops if no customer exists yet.
 */
export async function openBillingPortalAction(formData: FormData) {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const settingsUrl = `${getSiteUrl()}/${locale}/dashboard/settings`;
  if (session.role !== "owner" || !hasStripeEnv()) {
    redirect(settingsUrl);
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", session.user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (!data?.stripe_customer_id) {
    // Nothing to manage yet — they've never checked out.
    redirect(settingsUrl);
  }

  const portal = await getStripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: settingsUrl,
  });
  redirect(portal.url);
}

/**
 * Schedules or unschedules cancellation of the owner's subscription at the end
 * of the current billing period — the in-app equivalent of the portal's cancel
 * button (no Stripe redirect). The subscription stays active until period end,
 * then `customer.subscription.deleted` drops the profile to free. We also write
 * the flag optimistically so the UI updates without waiting on the webhook.
 * Owner-only.
 */
async function setCancelAtPeriodEnd(locale: string, cancel: boolean) {
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  const settingsPath = `/${locale}/dashboard/settings`;
  if (session.role !== "owner" || !hasStripeEnv()) redirect(settingsPath);

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", session.user.id)
    .maybeSingle<{ stripe_subscription_id: string | null }>();

  if (!data?.stripe_subscription_id) redirect(settingsPath);

  await getStripe().subscriptions.update(data.stripe_subscription_id, {
    cancel_at_period_end: cancel,
  });
  await admin
    .from("profiles")
    .update({ plan_cancel_at_period_end: cancel })
    .eq("id", session.user.id);

  revalidatePath(settingsPath);
  redirect(`${settingsPath}?billing=${cancel ? "cancel_scheduled" : "resumed"}`);
}

export async function cancelSubscriptionAction(formData: FormData) {
  await setCancelAtPeriodEnd(getLocale(formData), true);
}

export async function resumeSubscriptionAction(formData: FormData) {
  await setCancelAtPeriodEnd(getLocale(formData), false);
}

/**
 * Hard-deletes the current user's account and all data they own.
 *
 * Order of operations:
 *   1. Collect storage paths owned by this user (property photos, tenant
 *      documents, message attachments) before any cascade clears the rows
 *      that reference them.
 *   2. Remove those files from their respective buckets — storage doesn't
 *      cascade with auth.users.
 *   3. Delete the auth.users row. The schema's ON DELETE CASCADE chains
 *      take care of profiles, properties, tenants, leases, messages.
 *   4. Sign the (now-defunct) session out and redirect to /login.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY because admin.auth.admin.deleteUser
 * cannot be called from the user's own JWT.
 */
export async function deleteOwnAccountAction(formData: FormData) {
  const locale = getLocale(formData);
  const session = await getCurrentSession();
  if (!session) redirect(`/${locale}/login`);

  if (!hasServiceRoleKey()) {
    console.error(
      "[settings.deleteAccount] SUPABASE_SERVICE_ROLE_KEY not set; cannot self-delete",
    );
    return;
  }

  const userId = session.user.id;
  const admin = createAdminClient();

  // 1a. Property photos owned by this user.
  const photoPaths: string[] = [];
  try {
    const { data } = await admin
      .from("properties")
      .select("photos")
      .eq("owner_id", userId);
    for (const row of (data ?? []) as { photos?: { path?: string }[] }[]) {
      for (const photo of row.photos ?? []) {
        if (photo?.path) photoPaths.push(photo.path);
      }
    }
  } catch (err) {
    console.error("[settings.deleteAccount] property photos lookup:", err);
  }

  // 1b. Tenant ID documents owned by this user.
  const tenantDocPaths: string[] = [];
  try {
    const { data } = await admin
      .from("tenants")
      .select("id_document_path")
      .eq("owner_id", userId);
    for (const row of (data ?? []) as { id_document_path?: string | null }[]) {
      if (row.id_document_path) tenantDocPaths.push(row.id_document_path);
    }
  } catch (err) {
    console.error("[settings.deleteAccount] tenant docs lookup:", err);
  }

  // 1c. Message attachments sent by this user. Recipient-only attachments
  // belong to other users and should not be deleted here.
  const attachmentPaths: string[] = [];
  try {
    const { data } = await admin
      .from("messages")
      .select("attachments")
      .eq("sender_id", userId);
    for (const row of (data ?? []) as {
      attachments?: { path?: string }[];
    }[]) {
      for (const att of row.attachments ?? []) {
        if (att?.path) attachmentPaths.push(att.path);
      }
    }
  } catch (err) {
    console.error("[settings.deleteAccount] message attachments lookup:", err);
  }

  // 2. Remove files from each bucket. Failures here are best-effort:
  // orphaned files are recoverable, but blocking the account deletion
  // would leave the user stuck.
  if (photoPaths.length > 0) {
    const { error } = await admin.storage
      .from("property-photos")
      .remove(photoPaths);
    if (error) console.error("[settings.deleteAccount] property-photos:", error);
  }
  if (tenantDocPaths.length > 0) {
    const { error } = await admin.storage
      .from("tenant-documents")
      .remove(tenantDocPaths);
    if (error) console.error("[settings.deleteAccount] tenant-documents:", error);
  }
  if (attachmentPaths.length > 0) {
    const { error } = await admin.storage
      .from("message-attachments")
      .remove(attachmentPaths);
    if (error)
      console.error("[settings.deleteAccount] message-attachments:", error);
  }

  // 3. Delete the auth user. The DB cascade handles profile, properties,
  // tenants, leases, messages.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("[settings.deleteAccount] auth deleteUser:", deleteError);
    // Don't redirect on failure — user stays logged in and sees the page
    // unchanged. They can retry or contact support.
    return;
  }

  // 4. Best-effort sign-out so any lingering cookie is cleared.
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[settings.deleteAccount] signOut:", err);
  }

  redirect(`/${locale}/login`);
}
