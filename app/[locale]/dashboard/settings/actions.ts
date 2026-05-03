"use server";

import { redirect } from "next/navigation";
import { isLocale, defaultLocale } from "@/i18n/config";
import { getCurrentSession } from "@/lib/auth/current-user";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getLocale(formData: FormData) {
  const raw = String(formData.get("locale") ?? "");
  return isLocale(raw) ? raw : defaultLocale;
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
