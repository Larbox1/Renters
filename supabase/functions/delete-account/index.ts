// Hard-deletes the calling user's account and all data they own.
//
// Mirrors the web's deleteOwnAccountAction but runs in an Edge Function so
// mobile clients (which can't ship the service-role key) can trigger it via
// supabase.functions.invoke('delete-account').
//
// Order of operations:
//   1. Authenticate the caller via their JWT.
//   2. Collect storage paths owned by them (property photos, tenant
//      documents, message attachments) before any cascade clears the rows
//      that reference them.
//   3. Remove those files from their respective buckets — storage doesn't
//      cascade with auth.users.
//   4. Delete the auth.users row. The schema's ON DELETE CASCADE chains take
//      care of profiles, properties, tenants, leases, messages.
//
// Caller-side sign-out happens after this returns.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const auth = req.headers.get("Authorization");
  if (!auth) return jsonResponse({ error: "unauthenticated" }, 401);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    return jsonResponse({ error: "server_misconfigured" }, 500);
  }

  // Validate the JWT against the user-scoped client. We only trust the auth
  // header for identifying the user; storage and admin work goes through the
  // service-role client below.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userResult, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userResult?.user) {
    return jsonResponse({ error: "unauthenticated" }, 401);
  }
  const userId = userResult.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

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
    console.error("[delete-account] property photos lookup:", err);
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
    console.error("[delete-account] tenant docs lookup:", err);
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
    console.error("[delete-account] message attachments lookup:", err);
  }

  // 2. Remove files from each bucket. Failures here are best-effort:
  // orphaned files are recoverable, but blocking the account deletion
  // would leave the user stuck.
  if (photoPaths.length > 0) {
    const { error } = await admin.storage
      .from("property-photos")
      .remove(photoPaths);
    if (error) console.error("[delete-account] property-photos:", error);
  }
  if (tenantDocPaths.length > 0) {
    const { error } = await admin.storage
      .from("tenant-documents")
      .remove(tenantDocPaths);
    if (error) console.error("[delete-account] tenant-documents:", error);
  }
  if (attachmentPaths.length > 0) {
    const { error } = await admin.storage
      .from("message-attachments")
      .remove(attachmentPaths);
    if (error) console.error("[delete-account] message-attachments:", error);
  }

  // 3. Delete the auth user. The DB cascade handles profile, properties,
  // tenants, leases, messages.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("[delete-account] auth deleteUser:", deleteError);
    return jsonResponse({ ok: false, error: deleteError.message }, 500);
  }

  return jsonResponse({ ok: true });
});
